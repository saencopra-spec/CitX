import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok, leerCuerpo, noExiste } from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'

export const CATEGORIAS_LUGAR = [
  'academico',
  'servicios',
  'alimentacion',
  'deporte',
  'naturaleza',
  'administracion',
  'acceso',
]

const esquemaLugar = z.object({
  nombre: z.string().trim().min(2, 'Escribí el nombre del lugar.').max(60),
  categoria: z.enum(CATEGORIAS_LUGAR, { error: 'Elegí una categoría.' }),
  descripcion: z
    .string()
    .trim()
    .min(5, 'Escribí una descripción corta.')
    .max(400),
  horario: z.string().trim().max(120).optional().default(''),
  restringido: z.boolean(),
  notaAcceso: z.string().trim().max(200).optional().default(''),
})

/** La informacion de los lugares es publica: se usa tambien sin conexion. */
registrar('GET', '/lugares', async ({ res }) => {
  const lugares = await col(COLECCIONES.lugares)
  const lista = await lugares
    .find({}, { projection: { _id: 0 } })
    .sort({ nombre: 1 })
    .toArray()
  ok(res, { lugares: lista })
})

registrar('PUT', '/lugares/:clave', async ({ req, res, params }) => {
  await requerir(req, 'lugares.editar')
  const datos = esquemaLugar.parse(await leerCuerpo(req))
  const lugares = await col(COLECCIONES.lugares)
  const r = await lugares.findOneAndUpdate(
    { clave: params.clave },
    { $set: { ...datos, actualizadoEn: new Date() } },
    { returnDocument: 'after', projection: { _id: 0 } }
  )
  if (!r) throw noExiste('Ese lugar no existe en el mapa.')
  ok(res, { lugar: r })
})

/** Marca o desmarca un lugar como favorito del usuario. */
registrar('POST', '/lugares/:clave/favorito', async ({ req, res, params }) => {
  const usuario = await requerir(req)
  const lugares = await col(COLECCIONES.lugares)
  if (!(await lugares.findOne({ clave: params.clave }))) {
    throw noExiste('Ese lugar no existe en el mapa.')
  }
  const yaEsta = (usuario.favoritos ?? []).includes(params.clave)
  const usuarios = await col(COLECCIONES.usuarios)
  await usuarios.updateOne(
    { _id: usuario._id },
    yaEsta
      ? { $pull: { favoritos: params.clave } }
      : { $addToSet: { favoritos: params.clave } }
  )
  const favoritos = yaEsta
    ? usuario.favoritos.filter((c) => c !== params.clave)
    : [...(usuario.favoritos ?? []), params.clave]
  ok(res, { favoritos, favorito: !yaEsta })
})
