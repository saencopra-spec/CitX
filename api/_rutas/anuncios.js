import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES, asegurarIndices } from '../_lib/db.js'
import { ok, creado, leerCuerpo, noExiste } from '../_lib/respuesta.js'
import { requerir, idValido } from '../_lib/sesion.js'
import { notificar, destinatarios } from '../_lib/notificar.js'
import { puede, SECCIONES } from '../../compartido/permisos.js'
import { fechaDesdeCR } from '../../compartido/hora.js'

/**
 * Anuncios del colegio: avisos cortos que llegan a la campanita. Si tienen
 * un lugar, la notificacion lleva directo a ese punto del mapa.
 */
const esquema = z
  .object({
    titulo: z.string().trim().min(3, 'Escribí un título.').max(90),
    cuerpo: z.string().trim().min(3, 'Escribí el aviso.').max(600),
    lugarClave: z.string().max(40).nullable().optional(),
    importante: z.boolean().default(false),
    todos: z.boolean(),
    secciones: z.array(z.string()).max(36).default([]),
    venceEl: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
  })
  .superRefine((d, ctx) => {
    if (!d.todos && !d.secciones.length) {
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

function publico(a) {
  return {
    id: String(a._id),
    titulo: a.titulo,
    cuerpo: a.cuerpo,
    lugarClave: a.lugarClave ?? null,
    importante: Boolean(a.importante),
    todos: a.todos,
    secciones: a.secciones ?? [],
    venceEl: a.venceEl ?? null,
    autorNombre: a.autorNombre,
    creadoEn: a.creadoEn,
  }
}

registrar('GET', '/anuncios', async ({ req, res, query }) => {
  const usuario = await requerir(req)
  const anuncios = await col(COLECCIONES.anuncios)
  const filtro = {}
  const gestiona = puede(usuario, 'anuncios.publicar')
  if (!(gestiona && query.todos === '1')) {
    filtro.$and = [
      { $or: [{ vence: null }, { vence: { $gt: new Date() } }] },
      usuario.rol === 'estudiante'
        ? { $or: [{ todos: true }, { secciones: usuario.seccion }] }
        : {},
    ]
  }
  const lista = await anuncios
    .find(filtro)
    .sort({ importante: -1, creadoEn: -1 })
    .limit(60)
    .toArray()
  ok(res, { anuncios: lista.map(publico) })
})

registrar('POST', '/anuncios', async ({ req, res }) => {
  const usuario = await requerir(req, 'anuncios.publicar')
  await asegurarIndices()
  const datos = esquema.parse(await leerCuerpo(req))
  const anuncio = {
    ...datos,
    lugarClave: datos.lugarClave || null,
    secciones: datos.todos ? [] : datos.secciones,
    vence: datos.venceEl ? fechaDesdeCR(datos.venceEl, '23:59') : null,
    autorId: String(usuario._id),
    autorNombre: usuario.nombre,
    creadoEn: new Date(),
  }
  const anuncios = await col(COLECCIONES.anuncios)
  const { insertedId } = await anuncios.insertOne(anuncio)
  anuncio._id = insertedId

  const ids = await destinatarios(anuncio, usuario._id)
  await notificar(ids, {
    titulo: anuncio.importante
      ? `Importante: ${anuncio.titulo}`
      : anuncio.titulo,
    cuerpo: anuncio.cuerpo.slice(0, 160),
    enlace: anuncio.lugarClave
      ? `/mapa?lugar=${anuncio.lugarClave}`
      : '/notificaciones',
    lugarClave: anuncio.lugarClave,
    tipo: 'anuncio',
  })
  creado(res, { anuncio: publico(anuncio), enviadoA: ids.length })
})

registrar('DELETE', '/anuncios/:id', async ({ req, res, params }) => {
  await requerir(req, 'anuncios.publicar')
  const anuncios = await col(COLECCIONES.anuncios)
  const a = await anuncios.findOneAndDelete({ _id: idValido(params.id) })
  if (!a) throw noExiste('Ese anuncio ya no existe.')
  ok(res, { listo: true })
})
