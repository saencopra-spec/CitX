import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok, creado, leerCuerpo, noExiste } from '../_lib/respuesta.js'
import { requerir, idValido, usuarioDeSesion } from '../_lib/sesion.js'
import { campoFoto, guardarFotoSiEsNueva } from '../_lib/imagenes.js'
import { puede } from '../../compartido/permisos.js'
import { franjasDeRetiro } from '../../compartido/jornada.js'
import { ESTADOS_PRODUCTO, estadoDe } from '../../compartido/soda.js'

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

/** Datos de un producto para el navegador. */
export function productoPublico(p) {
  const estado = estadoDe(p)
  return {
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
      $unset: { disponible: '' },
    },
    { returnDocument: 'after' }
  )
  if (!r) throw noExiste('Ese producto ya no existe.')
  ok(res, { producto: productoPublico(r) })
})

/** Cambio rapido desde la lista: estado (disponible/agotado) o visible. */
registrar('PATCH', '/soda/productos/:id', async ({ req, res, params }) => {
  await requerir(req, 'productos.gestionar')
  const datos = z
    .object({
      estado: campoEstado.optional(),
      oculto: z.boolean().optional(),
    })
    .parse(await leerCuerpo(req))
  const set = {}
  if (datos.estado !== undefined) set.estado = datos.estado
  if (datos.oculto !== undefined) set.oculto = datos.oculto
  const productos = await col(COLECCIONES.productos)
  const r = await productos.findOneAndUpdate(
    { _id: idValido(params.id) },
    { $set: set, $unset: { disponible: '' } },
    { returnDocument: 'after' }
  )
  if (!r) throw noExiste('Ese producto ya no existe.')
  ok(res, { producto: productoPublico(r) })
})
