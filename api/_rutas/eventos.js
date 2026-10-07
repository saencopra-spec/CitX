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
import { campoFoto, guardarFotoSiEsNueva } from '../_lib/imagenes.js'
import { notificar, destinatarios } from '../_lib/notificar.js'
import { puede, SECCIONES } from '../../compartido/permisos.js'
import {
  fechaDesdeCR,
  partesCR,
  fechaRelativa,
  horaLegible,
} from '../../compartido/hora.js'

const esquemaEvento = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(3, 'Escribí un título.')
      .max(90, 'El título es muy largo.'),
    descripcion: z
      .string()
      .trim()
      .min(10, 'Contá de qué se trata, aunque sea en una línea.')
      .max(800),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí una fecha.'),
    hora: z.string().regex(/^\d{2}:\d{2}$/, 'Elegí una hora.'),
    lugarClave: z.string().max(40).optional().nullable(),
    lugarTexto: z.string().trim().max(80).optional().default(''),
    todos: z.boolean(),
    secciones: z.array(z.string()).max(36).default([]),
    imagen: campoFoto,
  })
  .superRefine((d, ctx) => {
    if (!d.todos && d.secciones.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['secciones'],
        message: 'Elegí al menos una sección o marcá todo el colegio.',
      })
    }
    if (d.secciones.some((s) => !SECCIONES.includes(s))) {
      ctx.addIssue({
        code: 'custom',
        path: ['secciones'],
        message: 'Hay una sección que no existe.',
      })
    }
  })

/** Lo que ve cada persona: los de todo el colegio y los de su seccion. */
function filtroVisibles(usuario) {
  if (usuario.rol === 'estudiante') {
    return { $or: [{ todos: true }, { secciones: usuario.seccion }] }
  }
  return {}
}

function publico(e) {
  return {
    id: String(e._id),
    titulo: e.titulo,
    descripcion: e.descripcion,
    fecha: e.fecha,
    hora: e.hora,
    inicio: e.inicio,
    lugarClave: e.lugarClave ?? null,
    lugarTexto: e.lugarTexto ?? '',
    todos: e.todos,
    secciones: e.secciones ?? [],
    imagen: e.imagen ?? null,
    autorId: e.autorId,
    autorNombre: e.autorNombre,
  }
}

registrar('GET', '/eventos', async ({ req, res, query }) => {
  const usuario = await requerir(req)
  const eventos = await col(COLECCIONES.eventos)
  const filtro = filtroVisibles(usuario)
  if (query.pasados !== '1') {
    filtro.inicio = { $gte: fechaDesdeCR(partesCR().iso, '00:00') }
  }
  if (query.mios === '1') filtro.autorId = String(usuario._id)
  const lista = await eventos
    .find(filtro)
    .sort({ inicio: query.pasados === '1' ? -1 : 1 })
    .limit(100)
    .toArray()
  ok(res, { eventos: lista.map(publico) })
})

registrar('POST', '/eventos', async ({ req, res }) => {
  const usuario = await requerir(req, 'eventos.publicar')
  const datos = esquemaEvento.parse(await leerCuerpo(req))
  const evento = {
    ...datos,
    secciones: datos.todos ? [] : datos.secciones,
    imagen: await guardarFotoSiEsNueva(datos.imagen),
    inicio: fechaDesdeCR(datos.fecha, datos.hora),
    autorId: String(usuario._id),
    autorNombre: usuario.nombre,
    creadoEn: new Date(),
  }
  const eventos = await col(COLECCIONES.eventos)
  const { insertedId } = await eventos.insertOne(evento)
  evento._id = insertedId

  const ids = await destinatarios(evento, usuario._id)
  await notificar(ids, {
    titulo: `Nuevo evento: ${evento.titulo}`,
    cuerpo: `Es ${fechaRelativa(evento.inicio)} a las ${horaLegible(evento.hora)}.`,
    enlace: '/guia/eventos',
    lugarClave: evento.lugarClave || null,
    tipo: 'evento',
  })

  creado(res, { evento: publico(evento) })
})

async function eventoEditable(req, id) {
  const usuario = await requerir(req, 'eventos.publicar')
  const eventos = await col(COLECCIONES.eventos)
  const evento = await eventos.findOne({ _id: idValido(id) })
  if (!evento) throw noExiste('Ese evento ya no existe.')
  const esAutor = evento.autorId === String(usuario._id)
  if (!esAutor && !puede(usuario, 'eventos.gestionarTodos')) {
    throw sinPermiso('Solo podés cambiar los eventos que publicaste vos.')
  }
  return { usuario, evento, eventos }
}

registrar('PUT', '/eventos/:id', async ({ req, res, params }) => {
  const { evento, eventos } = await eventoEditable(req, params.id)
  const datos = esquemaEvento.parse(await leerCuerpo(req))
  const cambios = {
    ...datos,
    secciones: datos.todos ? [] : datos.secciones,
    imagen: await guardarFotoSiEsNueva(datos.imagen),
    inicio: fechaDesdeCR(datos.fecha, datos.hora),
    actualizadoEn: new Date(),
  }
  await eventos.updateOne({ _id: evento._id }, { $set: cambios })
  ok(res, { evento: publico({ ...evento, ...cambios }) })
})

registrar('DELETE', '/eventos/:id', async ({ req, res, params }) => {
  const { evento, eventos } = await eventoEditable(req, params.id)
  await eventos.deleteOne({ _id: evento._id })
  ok(res, { listo: true })
})
