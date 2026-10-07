import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  noExiste,
  sinPermiso,
} from '../_lib/respuesta.js'
import { requerir, idValido } from '../_lib/sesion.js'
import { notificar, destinatarios } from '../_lib/notificar.js'
import { puede, SECCIONES } from '../../compartido/permisos.js'
import { fechaIsoLegible } from '../../compartido/hora.js'

const esquema = z.object({
  titulo: z.string().trim().min(2, 'Escribí qué tenés que recordar.').max(120),
  materia: z.string().trim().max(60).optional().default(''),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí una fecha.'),
  // Solo profesores y administracion: para quien es.
  secciones: z.array(z.string()).max(36).optional().default([]),
})

/**
 * Cada recordatorio es personal, salvo los que publica un profesor para una
 * o varias secciones. En esos, cada estudiante marca "hecho" por su cuenta.
 */
function publico(r, usuarioId) {
  const deProfesor = r.secciones?.length > 0
  return {
    id: String(r._id),
    titulo: r.titulo,
    materia: r.materia ?? '',
    fecha: r.fecha,
    secciones: r.secciones ?? [],
    deProfesor,
    autorNombre: r.autorNombre,
    esMio: r.autorId === usuarioId,
    hecho: deProfesor
      ? (r.hechoPor ?? []).includes(usuarioId)
      : Boolean(r.hecho),
  }
}

registrar('GET', '/recordatorios', async ({ req, res }) => {
  const usuario = await requerir(req)
  const id = String(usuario._id)
  const filtro = { $or: [{ autorId: id }] }
  if (usuario.seccion) filtro.$or.push({ secciones: usuario.seccion })
  const recordatorios = await col(COLECCIONES.recordatorios)
  const lista = await recordatorios
    .find(filtro)
    .sort({ fecha: 1, creadoEn: 1 })
    .limit(300)
    .toArray()
  ok(res, { recordatorios: lista.map((r) => publico(r, id)) })
})

registrar('POST', '/recordatorios', async ({ req, res }) => {
  const usuario = await requerir(req)
  const datos = esquema.parse(await leerCuerpo(req))
  const secciones = datos.secciones.filter((s) => SECCIONES.includes(s))
  if (secciones.length && !puede(usuario, 'recordatorios.publicarSecciones')) {
    throw sinPermiso(
      'Solo el profesorado puede enviar recordatorios a una sección.'
    )
  }
  const recordatorio = {
    titulo: datos.titulo,
    materia: datos.materia,
    fecha: datos.fecha,
    secciones,
    autorId: String(usuario._id),
    autorNombre: usuario.nombre,
    hecho: false,
    hechoPor: [],
    creadoEn: new Date(),
  }
  const recordatorios = await col(COLECCIONES.recordatorios)
  const { insertedId } = await recordatorios.insertOne(recordatorio)
  recordatorio._id = insertedId

  if (secciones.length) {
    const ids = await destinatarios({ todos: false, secciones }, usuario._id)
    await notificar(ids, {
      titulo: `Recordatorio de ${usuario.nombre}`,
      cuerpo: `${datos.titulo}${datos.materia ? ` (${datos.materia})` : ''}, para el ${fechaIsoLegible(datos.fecha)}.`,
      enlace: '/guia/recordatorios',
      tipo: 'recordatorio',
    })
  }
  creado(res, { recordatorio: publico(recordatorio, String(usuario._id)) })
})

async function propio(req, id) {
  const usuario = await requerir(req)
  const recordatorios = await col(COLECCIONES.recordatorios)
  const r = await recordatorios.findOne({ _id: idValido(id) })
  if (!r) throw noExiste('Ese recordatorio ya no existe.')
  return { usuario, r, recordatorios }
}

registrar('PUT', '/recordatorios/:id', async ({ req, res, params }) => {
  const { usuario, r, recordatorios } = await propio(req, params.id)
  if (r.autorId !== String(usuario._id))
    throw sinPermiso('Solo podés editar tus propios recordatorios.')
  const datos = esquema.parse(await leerCuerpo(req))
  const cambios = {
    titulo: datos.titulo,
    materia: datos.materia,
    fecha: datos.fecha,
  }
  if (puede(usuario, 'recordatorios.publicarSecciones')) {
    cambios.secciones = datos.secciones.filter((s) => SECCIONES.includes(s))
  }
  await recordatorios.updateOne({ _id: r._id }, { $set: cambios })
  ok(res, { recordatorio: publico({ ...r, ...cambios }, String(usuario._id)) })
})

registrar('PATCH', '/recordatorios/:id/hecho', async ({ req, res, params }) => {
  const { usuario, r, recordatorios } = await propio(req, params.id)
  const { hecho } = z
    .object({ hecho: z.boolean() })
    .parse(await leerCuerpo(req))
  const id = String(usuario._id)
  const esDeSeccion = r.secciones?.length > 0

  if (esDeSeccion) {
    if (r.autorId !== id && !r.secciones.includes(usuario.seccion))
      throw sinPermiso()
    await recordatorios.updateOne(
      { _id: r._id },
      hecho ? { $addToSet: { hechoPor: id } } : { $pull: { hechoPor: id } }
    )
  } else {
    if (r.autorId !== id) throw sinPermiso()
    await recordatorios.updateOne({ _id: r._id }, { $set: { hecho } })
  }
  ok(res, { hecho })
})

registrar('DELETE', '/recordatorios/:id', async ({ req, res, params }) => {
  const { usuario, r, recordatorios } = await propio(req, params.id)
  if (r.autorId !== String(usuario._id))
    throw sinPermiso('Solo podés borrar tus propios recordatorios.')
  await recordatorios.deleteOne({ _id: r._id })
  ok(res, { listo: true })
})
