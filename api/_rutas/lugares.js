import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  noExiste,
  conflicto,
} from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'
import { campoFoto, guardarFotoSiEsNueva } from '../_lib/imagenes.js'
import { CATEGORIAS, LIENZO, LUGARES_CIT } from '../../compartido/campus.js'
import { normalizar } from '../../compartido/texto.js'

const esquemaLugar = z.object({
  nombre: z.string().trim().min(2, 'Escribí el nombre del lugar.').max(60),
  categoria: z.enum(Object.keys(CATEGORIAS), { error: 'Elegí una categoría.' }),
  descripcion: z
    .string()
    .trim()
    .min(5, 'Escribí una descripción corta.')
    .max(400),
  horario: z.string().trim().max(120).optional().default(''),
  restringido: z.boolean(),
  notaAcceso: z.string().trim().max(200).optional().default(''),
  numero: z.number().int().min(1).max(99).nullable().optional(),
  x: z.number().min(0).max(LIENZO.ancho),
  y: z.number().min(0).max(LIENZO.alto),
  foto: campoFoto,
})

/** Foto oficial de cada lugar, para los que en la base todavia no tienen. */
const FOTO_OFICIAL = Object.fromEntries(
  LUGARES_CIT.map((l) => [l.clave, l.foto])
)

function publico(l) {
  const { _id, ...resto } = l
  void _id
  return { ...resto, foto: resto.foto || FOTO_OFICIAL[resto.clave] || null }
}

/** La informacion de los lugares es publica: se usa tambien sin conexion. */
registrar('GET', '/lugares', async ({ res }) => {
  const lugares = await col(COLECCIONES.lugares)
  const lista = await lugares.find({}).toArray()
  lista.sort(
    (a, b) =>
      (a.numero ?? 999) - (b.numero ?? 999) ||
      a.nombre.localeCompare(b.nombre, 'es')
  )
  ok(res, { lugares: lista.map(publico) })
})

registrar('PUT', '/lugares/:clave', async ({ req, res, params }) => {
  await requerir(req, 'lugares.editar')
  const datos = esquemaLugar.parse(await leerCuerpo(req))
  const lugares = await col(COLECCIONES.lugares)
  const r = await lugares.findOneAndUpdate(
    { clave: params.clave },
    {
      $set: {
        ...datos,
        foto: await guardarFotoSiEsNueva(datos.foto),
        ubicacionAproximada: false,
        actualizadoEn: new Date(),
      },
    },
    { returnDocument: 'after' }
  )
  if (!r) throw noExiste('Ese lugar no existe en el mapa.')
  ok(res, { lugar: publico(r) })
})

registrar('POST', '/lugares', async ({ req, res }) => {
  await requerir(req, 'lugares.editar')
  const datos = esquemaLugar.parse(await leerCuerpo(req))
  const clave = normalizar(datos.nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const lugares = await col(COLECCIONES.lugares)
  if (await lugares.findOne({ clave })) {
    throw conflicto('Ya hay un lugar con ese nombre.', {
      nombre: 'Ya hay un lugar con ese nombre.',
    })
  }
  const lugar = {
    ...datos,
    clave,
    foto: await guardarFotoSiEsNueva(datos.foto),
    creadoEn: new Date(),
  }
  await lugares.insertOne(lugar)
  creado(res, { lugar: publico(lugar) })
})

registrar('DELETE', '/lugares/:clave', async ({ req, res, params }) => {
  await requerir(req, 'lugares.editar')
  const lugares = await col(COLECCIONES.lugares)
  const r = await lugares.findOneAndDelete({ clave: params.clave })
  if (!r) throw noExiste('Ese lugar ya no existe.')
  // Se quita de los favoritos de todas las personas.
  const usuarios = await col(COLECCIONES.usuarios)
  await usuarios.updateMany(
    { favoritos: params.clave },
    { $pull: { favoritos: params.clave } }
  )
  ok(res, { listo: true })
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
