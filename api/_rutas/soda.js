import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  noExiste,
  malaPeticion,
} from '../_lib/respuesta.js'
import { requerir, idValido, usuarioDeSesion } from '../_lib/sesion.js'
import { campoFoto, guardarFotoSiEsNueva } from '../_lib/imagenes.js'
import { puede } from '../../compartido/permisos.js'
import { franjasDeRetiro } from '../../compartido/jornada.js'
import {
  ESTADOS_PRODUCTO,
  CAMBIO_STOCK_MAXIMO,
  UMBRAL_POCAS,
  estadoDe,
  umbralDe,
} from '../../compartido/soda.js'

export const CATEGORIAS_SODA = ['desayunos', 'almuerzos', 'bebidas', 'snacks']

const campoEstado = z.enum(ESTADOS_PRODUCTO, { error: 'Elegí un estado.' })

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
  estado: campoEstado,
  oculto: z.boolean(),
  foto: campoFoto,
})

/**
 * Datos de un producto para el navegador. El numero de unidades solo lo ve
 * el personal (`personal`); el resto ve el estado.
 */
export function productoPublico(p, { personal = false } = {}) {
  const estado = estadoDe(p)
  const datos = {
    id: String(p._id),
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    precio: p.precio,
    foto: p.foto ?? null,
    estado,
    disponible: estado !== 'agotado',
    oculto: p.oculto === true,
  }
  if (personal) {
    datos.controlStock = p.controlStock === true
    datos.stock = p.controlStock ? Math.max(0, Number(p.stock) || 0) : null
    datos.umbralPocas = umbralDe(p)
  }
  return datos
}

/** El menu se puede ver sin sesion; el personal de la soda ve tambien los ocultos. */
registrar('GET', '/soda/productos', async ({ req, res, query }) => {
  const productos = await col(COLECCIONES.productos)
  let filtro = { oculto: { $ne: true } }
  let personal = false
  if (query.todos === '1') {
    const usuario = await usuarioDeSesion(req)
    if (usuario && puede(usuario, 'productos.gestionar')) {
      filtro = {}
      personal = true
    }
  }
  const lista = await productos
    .find(filtro)
    .sort({ categoria: 1, nombre: 1 })
    .toArray()
  ok(res, { productos: lista.map((p) => productoPublico(p, { personal })) })
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
    controlStock: false,
    umbralPocas: UMBRAL_POCAS,
    creadoEn: new Date(),
  }
  const productos = await col(COLECCIONES.productos)
  const { insertedId } = await productos.insertOne(producto)
  creado(res, {
    producto: productoPublico(
      { ...producto, _id: insertedId },
      { personal: true }
    ),
  })
})

/** Con el stock activo el estado se calcula solo: aqui no se toca. */
registrar('PUT', '/soda/productos/:id', async ({ req, res, params }) => {
  await requerir(req, 'productos.gestionar')
  const { estado, ...datos } = esquemaProducto.parse(await leerCuerpo(req))
  const productos = await col(COLECCIONES.productos)
  const _id = idValido(params.id)
  const actual = await productos.findOne({ _id })
  if (!actual) throw noExiste('Ese producto ya no existe.')
  const cambios = {
    $set: {
      ...datos,
      foto: await guardarFotoSiEsNueva(datos.foto),
      actualizadoEn: new Date(),
    },
  }
  if (!actual.controlStock) {
    cambios.$set.estado = estado
    cambios.$unset = { disponible: '' }
  }
  const r = await productos.findOneAndUpdate({ _id }, cambios, {
    returnDocument: 'after',
  })
  if (!r) throw noExiste('Ese producto ya no existe.')
  ok(res, { producto: productoPublico(r, { personal: true }) })
})

/**
 * Cambios rapidos desde la lista: visible, estado (solo sin stock), activar
 * o apagar el control de stock y el umbral de "pocas unidades".
 */
registrar('PATCH', '/soda/productos/:id', async ({ req, res, params }) => {
  await requerir(req, 'productos.gestionar')
  const datos = z
    .object({
      oculto: z.boolean().optional(),
      estado: campoEstado.optional(),
      controlStock: z.boolean().optional(),
      umbralPocas: z
        .number({ error: 'Escribí un número.' })
        .int('Va sin decimales.')
        .min(0, 'No puede ser negativo.')
        .max(CAMBIO_STOCK_MAXIMO, 'Ese número es muy alto.')
        .optional(),
    })
    .parse(await leerCuerpo(req))
  const productos = await col(COLECCIONES.productos)
  const _id = idValido(params.id)
  const actual = await productos.findOne({ _id })
  if (!actual) throw noExiste('Ese producto ya no existe.')

  if (datos.estado !== undefined) {
    // El filtro evita que se cuele un cambio a mano si alguien acaba de
    // activar el stock.
    const r = await productos.updateOne(
      { _id, controlStock: { $ne: true } },
      { $set: { estado: datos.estado }, $unset: { disponible: '' } }
    )
    if (r.matchedCount === 0) {
      throw malaPeticion(
        'Este producto controla stock: su estado se calcula con las unidades.'
      )
    }
  }
  if (datos.oculto !== undefined) {
    await productos.updateOne({ _id }, { $set: { oculto: datos.oculto } })
  }
  if (datos.umbralPocas !== undefined) {
    await productos.updateOne(
      { _id },
      { $set: { umbralPocas: datos.umbralPocas } }
    )
  }
  if (datos.controlStock === true) {
    // Al activarlo empieza en 0 (agotado) hasta que se repongan unidades.
    await productos.updateOne(
      { _id, controlStock: { $ne: true } },
      { $set: { controlStock: true, stock: 0 } }
    )
  } else if (datos.controlStock === false) {
    // Al apagarlo queda a mano con el estado que tenia en ese momento.
    const conStock = await productos.findOne({ _id, controlStock: true })
    if (conStock) {
      await productos.updateOne(
        { _id, controlStock: true },
        {
          $set: { controlStock: false, estado: estadoDe(conStock) },
          $unset: { stock: '', disponible: '' },
        }
      )
    }
  }
  const r = await productos.findOne({ _id })
  if (!r) throw noExiste('Ese producto ya no existe.')
  ok(res, { producto: productoPublico(r, { personal: true }) })
})

/**
 * Reponer (+N) o quitar (-N) unidades. Las dos son atomicas: quitar solo se
 * aplica si quedan al menos N, asi el stock nunca queda negativo.
 */
registrar('POST', '/soda/productos/:id/stock', async ({ req, res, params }) => {
  await requerir(req, 'productos.gestionar')
  const { cambio } = z
    .object({
      cambio: z
        .number({ error: 'Escribí cuántas unidades.' })
        .int('Van sin decimales.')
        .min(-CAMBIO_STOCK_MAXIMO, 'Ese número es muy alto.')
        .max(CAMBIO_STOCK_MAXIMO, 'Ese número es muy alto.')
        .refine((n) => n !== 0, 'Escribí al menos una unidad.'),
    })
    .parse(await leerCuerpo(req))
  const productos = await col(COLECCIONES.productos)
  const _id = idValido(params.id)
  const filtro = { _id, controlStock: true }
  if (cambio < 0) filtro.stock = { $gte: -cambio }
  const r = await productos.findOneAndUpdate(
    filtro,
    { $inc: { stock: cambio } },
    { returnDocument: 'after' }
  )
  if (!r) {
    const actual = await productos.findOne({ _id })
    if (!actual) throw noExiste('Ese producto ya no existe.')
    if (!actual.controlStock) {
      throw malaPeticion('Este producto no controla stock.')
    }
    throw malaPeticion(
      `No se pueden quitar ${-cambio} unidades: quedan ${actual.stock ?? 0}.`,
      { cambio: `Quedan ${actual.stock ?? 0} unidades.` }
    )
  }
  ok(res, { producto: productoPublico(r, { personal: true }) })
})
