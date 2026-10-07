import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok, leerCuerpo, noExiste } from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'
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
