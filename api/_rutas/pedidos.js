import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES, asegurarIndices } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  noExiste,
  malaPeticion,
  sinPermiso,
  ErrorHttp,
} from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'
import { notificar } from '../_lib/notificar.js'
import { puede } from '../../compartido/permisos.js'
import { calcularTotal } from '../../compartido/dinero.js'
import { franjaValida, nombreFranja } from '../../compartido/jornada.js'
import { partesCR } from '../../compartido/hora.js'
import {
  validarTarjeta,
  marcaTarjeta,
  ultimosCuatro,
  comprobanteSinpeValido,
  soloDigitos,
} from '../../compartido/pagos.js'
import {
  generarCodigo,
  cambioDeEstadoPermitido,
  NOMBRE_ESTADO,
  ESTADOS_PEDIDO,
} from '../../compartido/pedidos.js'

/** Tarjeta que simula un rechazo del banco, para mostrarlo en la demostracion. */
const TARJETA_RECHAZADA = '4000000000000002'

const esquemaPedido = z.object({
  items: z
    .array(
      z.object({
        productoId: z
          .string()
          .refine((v) => ObjectId.isValid(v), 'Producto no válido.'),
        cantidad: z
          .number()
          .int()
          .min(1)
          .max(20, 'Máximo 20 unidades por producto.'),
        nota: z
          .string()
          .trim()
          .max(140, 'La nota es muy larga.')
          .optional()
          .default(''),
      })
    )
    .min(1, 'El carrito está vacío.')
    .max(25),
  franja: z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    clave: z.string(),
  }),
  pago: z.discriminatedUnion('metodo', [
    z.object({ metodo: z.literal('efectivo') }),
    z.object({ metodo: z.literal('sinpe'), comprobante: z.string().max(40) }),
    z.object({
      metodo: z.literal('tarjeta'),
      numero: z.string().max(30),
      titular: z.string().max(80),
      vencimiento: z.string().max(7),
      cvv: z.string().max(4),
    }),
  ]),
})

export function pedidoPublico(p, { personal = false } = {}) {
  const datos = {
    codigo: p.codigo,
    estado: p.estado,
    items: p.items,
    total: p.total,
    franja: p.franja,
    pago: p.pago,
    historial: p.historial,
    calificados: p.calificados ?? [],
    creadoEn: p.creadoEn,
  }
  if (personal) {
    datos.usuarioNombre = p.usuarioNombre
    datos.usuarioSeccion = p.usuarioSeccion ?? null
  }
  return datos
}

function validarPago(pago) {
  if (pago.metodo === 'sinpe') {
    if (!comprobanteSinpeValido(pago.comprobante)) {
      throw malaPeticion('Revisá el comprobante.', {
        comprobante: 'El comprobante son solo números, entre 6 y 25 dígitos.',
      })
    }
    return {
      metodo: 'sinpe',
      referencia: soloDigitos(pago.comprobante),
      estado: 'verificado',
    }
  }
  if (pago.metodo === 'tarjeta') {
    const errores = validarTarjeta(pago)
    if (Object.keys(errores).length)
      throw malaPeticion('Revisá los datos de la tarjeta.', errores)
    if (soloDigitos(pago.numero) === TARJETA_RECHAZADA) {
      throw new ErrorHttp(
        402,
        'El banco rechazó la tarjeta (simulado). Probá con otra o pagá en efectivo.',
        {
          numero: 'Tarjeta rechazada por el banco.',
        }
      )
    }
    // Nunca se guarda el numero completo ni el CVV.
    return {
      metodo: 'tarjeta',
      marca: marcaTarjeta(pago.numero),
      ultimos: ultimosCuatro(pago.numero),
      estado: 'aprobado',
    }
  }
  return { metodo: 'efectivo', estado: 'pendiente' }
}

registrar('POST', '/pedidos', async ({ req, res }) => {
  await asegurarIndices()
  const usuario = await requerir(req)
  if (usuario.rol === 'soda')
    throw sinPermiso('La cuenta de la soda no puede hacer pedidos.')
  const datos = esquemaPedido.parse(await leerCuerpo(req))

  if (!franjaValida(datos.franja.fecha, datos.franja.clave)) {
    throw malaPeticion(
      'Esa hora de retiro ya no está disponible. Elegí otra.',
      {
        franja: 'Esa hora ya pasó o no es válida.',
      }
    )
  }

  // Precios y disponibilidad salen de la base, nunca del navegador.
  const productos = await col(COLECCIONES.productos)
  const ids = [...new Set(datos.items.map((i) => i.productoId))].map(
    (id) => new ObjectId(id)
  )
  const encontrados = await productos.find({ _id: { $in: ids } }).toArray()
  const porId = new Map(encontrados.map((p) => [String(p._id), p]))

  const items = datos.items.map((i) => {
    const p = porId.get(i.productoId)
    if (!p || p.oculto)
      throw malaPeticion('Uno de los productos ya no está en el menú.')
    if (p.disponible === false) {
      throw malaPeticion(
        `${p.nombre} se acaba de agotar. Quitalo del carrito para seguir.`
      )
    }
    return {
      productoId: i.productoId,
      nombre: p.nombre,
      precio: p.precio,
      cantidad: i.cantidad,
      nota: i.nota,
      foto: p.foto ?? null,
    }
  })

  const pago = validarPago(datos.pago)
  const ahora = new Date()
  const pedidos = await col(COLECCIONES.pedidos)

  const pedido = {
    usuarioId: String(usuario._id),
    usuarioNombre: usuario.nombre,
    usuarioSeccion: usuario.seccion ?? null,
    items,
    total: calcularTotal(items),
    franja: { ...datos.franja, nombre: nombreFranja(datos.franja.clave) },
    pago,
    estado: 'recibido',
    historial: [{ estado: 'recibido', en: ahora }],
    calificados: [],
    creadoEn: ahora,
  }

  // El codigo es corto, asi que reintentamos si por casualidad ya existe.
  for (let intento = 0; intento < 6; intento++) {
    pedido.codigo = generarCodigo()
    try {
      await pedidos.insertOne(pedido)
      return creado(res, { pedido: pedidoPublico(pedido) })
    } catch (e) {
      if (e?.code !== 11000) throw e
      delete pedido._id
    }
  }
  throw new Error('No se pudo generar un codigo de pedido unico.')
})

registrar('GET', '/pedidos/mios', async ({ req, res }) => {
  const usuario = await requerir(req)
  const pedidos = await col(COLECCIONES.pedidos)
  const lista = await pedidos
    .find({ usuarioId: String(usuario._id) })
    .sort({ creadoEn: -1 })
    .limit(50)
    .toArray()
  ok(res, { pedidos: lista.map((p) => pedidoPublico(p)) })
})

/** Tablero de la soda: lo de hoy y cualquier pedido que siga pendiente. */
registrar('GET', '/pedidos', async ({ req, res }) => {
  await requerir(req, 'pedidos.gestionar')
  const hoy = partesCR().iso
  const pedidos = await col(COLECCIONES.pedidos)
  const lista = await pedidos
    .find({
      $or: [{ 'franja.fecha': hoy }, { estado: { $ne: 'entregado' } }],
    })
    .sort({ creadoEn: 1 })
    .limit(300)
    .toArray()
  ok(res, {
    pedidos: lista.map((p) => pedidoPublico(p, { personal: true })),
    hoy,
  })
})

registrar('GET', '/pedidos/:codigo', async ({ req, res, params }) => {
  const usuario = await requerir(req)
  const pedidos = await col(COLECCIONES.pedidos)
  const pedido = await pedidos.findOne({ codigo: params.codigo.toUpperCase() })
  const personal = puede(usuario.rol, 'pedidos.gestionar')
  if (!pedido || (!personal && pedido.usuarioId !== String(usuario._id))) {
    throw noExiste('No encontramos un pedido con ese código.')
  }
  ok(res, { pedido: pedidoPublico(pedido, { personal }) })
})

registrar('PATCH', '/pedidos/:codigo/estado', async ({ req, res, params }) => {
  await requerir(req, 'pedidos.gestionar')
  const { estado } = z
    .object({ estado: z.enum(ESTADOS_PEDIDO) })
    .parse(await leerCuerpo(req))
  const pedidos = await col(COLECCIONES.pedidos)
  const pedido = await pedidos.findOne({ codigo: params.codigo.toUpperCase() })
  if (!pedido) throw noExiste('No encontramos un pedido con ese código.')
  if (!cambioDeEstadoPermitido(pedido.estado, estado)) {
    throw malaPeticion(
      `Este pedido está "${NOMBRE_ESTADO[pedido.estado]}". Se avanza un paso a la vez.`
    )
  }

  const cambios = { estado }
  if (estado === 'entregado' && pedido.pago.metodo === 'efectivo') {
    cambios['pago.estado'] = 'pagado'
  }
  // Solo se actualiza si nadie lo cambio en el medio (dos tablets a la vez).
  const r = await pedidos.findOneAndUpdate(
    { _id: pedido._id, estado: pedido.estado },
    { $set: cambios, $push: { historial: { estado, en: new Date() } } },
    { returnDocument: 'after' }
  )
  if (!r)
    throw malaPeticion(
      'Otra persona acaba de cambiar este pedido. Ya actualizamos el tablero.'
    )

  if (estado === 'listo') {
    await notificar([pedido.usuarioId], {
      titulo: `Tu pedido ${pedido.codigo} está listo`,
      cuerpo: `Pasá a retirarlo a la soda Armonía. Mostrá el código o el QR.`,
      enlace: `/soda/pedido/${pedido.codigo}`,
      tipo: 'pedido',
    })
  }
  ok(res, { pedido: pedidoPublico(r, { personal: true }) })
})
