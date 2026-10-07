import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES, asegurarIndices } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  noExiste,
  malaPeticion,
  conflicto,
} from '../_lib/respuesta.js'
import { requerir, idValido, usuarioDeSesion } from '../_lib/sesion.js'
import { campoFoto, guardarFotoSiEsNueva } from '../_lib/imagenes.js'
import { puede } from '../../compartido/permisos.js'
import { franjasDeRetiro } from '../../compartido/jornada.js'

export const CATEGORIAS_SODA = ['desayunos', 'almuerzos', 'bebidas', 'snacks']

const esquemaProducto = z.object({
  nombre: z.string().trim().min(2, 'Escribí el nombre del producto.').max(60),
  categoria: z.enum(CATEGORIAS_SODA, { error: 'Elegí una categoría.' }),
  descripcion: z
    .string()
    .trim()
    .min(10, 'Describí el producto en una línea.')
    .max(300),
  precio: z.coerce
    .number({ error: 'Escribí el precio en colones.' })
    .int('El precio va sin decimales.')
    .min(100, 'El precio mínimo es ₡100.')
    .max(20000, 'Ese precio parece demasiado alto.'),
  disponible: z.boolean(),
  oculto: z.boolean(),
  foto: campoFoto,
})

export function productoPublico(p) {
  const cantidad = p.calificacionCantidad ?? 0
  return {
    id: String(p._id),
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    precio: p.precio,
    foto: p.foto ?? null,
    disponible: p.disponible !== false,
    oculto: p.oculto === true,
    calificacion: cantidad
      ? Math.round((p.calificacionSuma / cantidad) * 10) / 10
      : null,
    calificaciones: cantidad,
  }
}

/** El menu se puede ver sin sesion; el personal de la soda ve tambien los ocultos. */
registrar('GET', '/soda/productos', async ({ req, res, query }) => {
  const productos = await col(COLECCIONES.productos)
  let filtro = { oculto: { $ne: true } }
  if (query.todos === '1') {
    const usuario = await usuarioDeSesion(req)
    if (usuario && puede(usuario, 'productos.gestionar')) filtro = {}
  }
  const lista = await productos
    .find(filtro)
    .sort({ categoria: 1, nombre: 1 })
    .toArray()
  ok(res, { productos: lista.map(productoPublico) })
})

registrar('GET', '/soda/franjas', async ({ res }) => {
  ok(res, { franjas: franjasDeRetiro() })
})

registrar('POST', '/soda/productos', async ({ req, res }) => {
  await requerir(req, 'productos.gestionar')
  const datos = esquemaProducto.parse(await leerCuerpo(req))
  const producto = {
    ...datos,
    foto: await guardarFotoSiEsNueva(datos.foto),
    calificacionSuma: 0,
    calificacionCantidad: 0,
    creadoEn: new Date(),
  }
  const productos = await col(COLECCIONES.productos)
  const { insertedId } = await productos.insertOne(producto)
  creado(res, { producto: productoPublico({ ...producto, _id: insertedId }) })
})

registrar('PUT', '/soda/productos/:id', async ({ req, res, params }) => {
  await requerir(req, 'productos.gestionar')
  const datos = esquemaProducto.parse(await leerCuerpo(req))
  const productos = await col(COLECCIONES.productos)
  const r = await productos.findOneAndUpdate(
    { _id: idValido(params.id) },
    {
      $set: {
        ...datos,
        foto: await guardarFotoSiEsNueva(datos.foto),
        actualizadoEn: new Date(),
      },
    },
    { returnDocument: 'after' }
  )
  if (!r) throw noExiste('Ese producto ya no existe.')
  ok(res, { producto: productoPublico(r) })
})

/** Cambio rapido de un solo campo: agotado o visible. */
registrar('PATCH', '/soda/productos/:id', async ({ req, res, params }) => {
  await requerir(req, 'productos.gestionar')
  const datos = z
    .object({
      disponible: z.boolean().optional(),
      oculto: z.boolean().optional(),
    })
    .parse(await leerCuerpo(req))
  const productos = await col(COLECCIONES.productos)
  const r = await productos.findOneAndUpdate(
    { _id: idValido(params.id) },
    { $set: datos },
    { returnDocument: 'after' }
  )
  if (!r) throw noExiste('Ese producto ya no existe.')
  ok(res, { producto: productoPublico(r) })
})

/** Calificar un producto de un pedido ya entregado. Una vez por producto. */
registrar(
  'POST',
  '/soda/productos/:id/calificar',
  async ({ req, res, params }) => {
    await asegurarIndices()
    const usuario = await requerir(req)
    const { estrellas, codigo } = z
      .object({
        estrellas: z.number().int().min(1, 'Elegí de 1 a 5 estrellas.').max(5),
        codigo: z.string().min(1),
      })
      .parse(await leerCuerpo(req))

    const productoId = String(idValido(params.id))
    const pedidos = await col(COLECCIONES.pedidos)
    const pedido = await pedidos.findOne({
      codigo: codigo.toUpperCase(),
      usuarioId: String(usuario._id),
    })
    if (!pedido) throw noExiste('No encontramos ese pedido.')
    if (pedido.estado !== 'entregado') {
      throw malaPeticion('Podés calificar cuando ya hayas recibido el pedido.')
    }
    if (!pedido.items.some((i) => i.productoId === productoId)) {
      throw malaPeticion('Ese producto no venía en tu pedido.')
    }

    const calificaciones = await col(COLECCIONES.calificaciones)
    try {
      await calificaciones.insertOne({
        productoId,
        usuarioId: String(usuario._id),
        pedidoId: String(pedido._id),
        estrellas,
        creadoEn: new Date(),
      })
    } catch (e) {
      if (e?.code === 11000)
        throw conflicto('Ya calificaste este producto. Gracias.')
      throw e
    }

    const productos = await col(COLECCIONES.productos)
    await productos.updateOne(
      { _id: idValido(productoId) },
      { $inc: { calificacionSuma: estrellas, calificacionCantidad: 1 } }
    )
    await pedidos.updateOne(
      { _id: pedido._id },
      { $addToSet: { calificados: productoId } }
    )
    ok(res, { listo: true })
  }
)
