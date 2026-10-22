import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok, leerCuerpo, noExiste, sinPermiso } from '../_lib/respuesta.js'
import { requerir, idValido } from '../_lib/sesion.js'
import { SECCIONES } from '../../compartido/permisos.js'
import { DIAS_LECTIVOS, LECCIONES } from '../../compartido/jornada.js'

/** Especialidades, talleres y materias. Informacion publica. */
registrar('GET', '/clases', async ({ res }) => {
  const materias = await col(COLECCIONES.materias)
  const lista = await materias
    .find({}, { projection: { _id: 0 } })
    .sort({ orden: 1 })
    .toArray()
  ok(res, { materias: lista })
})

/**
 * Horario de cada profesor: en que seccion, materia y aula da cada leccion.
 * Va antes de '/horarios/:seccion' porque el enrutador se queda con la
 * primera ruta que coincide.
 */
const celdaProfesor = z.object({
  seccion: z
    .string()
    .trim()
    .max(10)
    .refine((s) => s === '' || SECCIONES.includes(s), 'Esa sección no existe.')
    .default(''),
  materia: z.string().trim().max(50).default(''),
  aula: z.string().trim().max(30).default(''),
})

const esquemaHorarioProfesor = z.object({
  dias: z.object(
    Object.fromEntries(
      DIAS_LECTIVOS.map((d) => [
        d,
        z.array(celdaProfesor).length(LECCIONES.length),
      ])
    )
  ),
})

/** Solo el personal docente y la administracion llevan horario propio. */
const ROLES_CON_HORARIO = ['profesor', 'admin']

async function exigirHorarioPropio(req) {
  const usuario = await requerir(req)
  if (!ROLES_CON_HORARIO.includes(usuario.rol))
    throw sinPermiso('El horario propio es para el profesorado.')
  return usuario
}

async function horarioDeProfesor(usuarioId) {
  const horarios = await col(COLECCIONES.horariosProfesores)
  return horarios.findOne(
    { usuarioId: String(usuarioId) },
    { projection: { _id: 0 } }
  )
}

async function guardarHorarioProfesor(usuario, dias) {
  const horarios = await col(COLECCIONES.horariosProfesores)
  await horarios.updateOne(
    { usuarioId: String(usuario._id) },
    {
      $set: {
        usuarioId: String(usuario._id),
        nombre: usuario.nombre,
        dias,
        actualizadoEn: new Date(),
      },
    },
    { upsert: true }
  )
}

registrar('GET', '/horarios/profesor', async ({ req, res }) => {
  const usuario = await exigirHorarioPropio(req)
  ok(res, { horario: (await horarioDeProfesor(usuario._id)) ?? null })
})

registrar('PUT', '/horarios/profesor', async ({ req, res }) => {
  const usuario = await exigirHorarioPropio(req)
  const { dias } = esquemaHorarioProfesor.parse(await leerCuerpo(req))
  await guardarHorarioProfesor(usuario, dias)
  ok(res, { horario: { usuarioId: String(usuario._id), dias } })
})

/** Para el panel: profesores y si ya tienen horario cargado. */
registrar('GET', '/horarios/profesores', async ({ req, res }) => {
  await requerir(req, 'horarios.editar')
  const usuarios = await col(COLECCIONES.usuarios)
  const horarios = await col(COLECCIONES.horariosProfesores)
  const [profes, conHorario] = await Promise.all([
    usuarios
      .find(
        { rol: { $in: ROLES_CON_HORARIO } },
        { projection: { nombre: 1, correo: 1, rol: 1 } }
      )
      .sort({ nombre: 1 })
      .toArray(),
    horarios.find({}, { projection: { usuarioId: 1 } }).toArray(),
  ])
  const ids = new Set(conHorario.map((h) => h.usuarioId))
  ok(res, {
    profesores: profes.map((p) => ({
      id: String(p._id),
      nombre: p.nombre,
      correo: p.correo,
      rol: p.rol,
      tieneHorario: ids.has(String(p._id)),
    })),
  })
})

registrar('GET', '/horarios/profesores/:id', async ({ req, res, params }) => {
  await requerir(req, 'horarios.editar')
  ok(res, { horario: (await horarioDeProfesor(idValido(params.id))) ?? null })
})

registrar('PUT', '/horarios/profesores/:id', async ({ req, res, params }) => {
  await requerir(req, 'horarios.editar')
  const usuarios = await col(COLECCIONES.usuarios)
  const profe = await usuarios.findOne({ _id: idValido(params.id) })
  if (!profe || !ROLES_CON_HORARIO.includes(profe.rol))
    throw noExiste('Ese profesor no existe.')
  const { dias } = esquemaHorarioProfesor.parse(await leerCuerpo(req))
  await guardarHorarioProfesor(profe, dias)
  ok(res, { horario: { usuarioId: String(profe._id), dias } })
})

/** Que secciones tienen horario cargado. */
registrar('GET', '/horarios', async ({ req, res }) => {
  await requerir(req)
  const horarios = await col(COLECCIONES.horarios)
  const lista = await horarios
    .find({}, { projection: { seccion: 1, _id: 0 } })
    .toArray()
  ok(res, { secciones: lista.map((h) => h.seccion).sort(ordenSeccion) })
})

function ordenSeccion(a, b) {
  const [na, sa] = a.split('-')
  const [nb, sb] = b.split('-')
  return Number(na) - Number(nb) || sa.localeCompare(sb)
}

registrar('GET', '/horarios/:seccion', async ({ req, res, params }) => {
  await requerir(req)
  if (!SECCIONES.includes(params.seccion))
    throw noExiste('Esa sección no existe.')
  const horarios = await col(COLECCIONES.horarios)
  const horario = await horarios.findOne(
    { seccion: params.seccion },
    { projection: { _id: 0 } }
  )
  ok(res, { horario: horario ?? null })
})

const celda = z.object({
  materia: z.string().trim().max(50).default(''),
  aula: z.string().trim().max(30).default(''),
})

const esquemaHorario = z.object({
  dias: z.object(
    Object.fromEntries(
      DIAS_LECTIVOS.map((d) => [d, z.array(celda).length(LECCIONES.length)])
    )
  ),
})

registrar('PUT', '/horarios/:seccion', async ({ req, res, params }) => {
  await requerir(req, 'horarios.editar')
  if (!SECCIONES.includes(params.seccion))
    throw noExiste('Esa sección no existe.')
  const { dias } = esquemaHorario.parse(await leerCuerpo(req))
  const horarios = await col(COLECCIONES.horarios)
  await horarios.updateOne(
    { seccion: params.seccion },
    { $set: { seccion: params.seccion, dias, actualizadoEn: new Date() } },
    { upsert: true }
  )
  ok(res, { horario: { seccion: params.seccion, dias } })
})
