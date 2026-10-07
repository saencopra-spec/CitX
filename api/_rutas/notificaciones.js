import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok } from '../_lib/respuesta.js'
import { requerir, idValido } from '../_lib/sesion.js'

registrar('GET', '/notificaciones', async ({ req, res }) => {
  const usuario = await requerir(req)
  const notificaciones = await col(COLECCIONES.notificaciones)
  const filtro = { usuarioId: String(usuario._id) }
  const [lista, sinLeer] = await Promise.all([
    notificaciones.find(filtro).sort({ creadoEn: -1 }).limit(40).toArray(),
    notificaciones.countDocuments({ ...filtro, leida: false }),
  ])
  ok(res, {
    sinLeer,
    notificaciones: lista.map((n) => ({
      id: String(n._id),
      titulo: n.titulo,
      cuerpo: n.cuerpo,
      enlace: n.enlace,
      tipo: n.tipo,
      leida: n.leida,
      creadoEn: n.creadoEn,
    })),
  })
})

registrar('PATCH', '/notificaciones/leer-todas', async ({ req, res }) => {
  const usuario = await requerir(req)
  const notificaciones = await col(COLECCIONES.notificaciones)
  await notificaciones.updateMany(
    { usuarioId: String(usuario._id), leida: false },
    { $set: { leida: true } }
  )
  ok(res, { listo: true })
})

registrar('PATCH', '/notificaciones/:id', async ({ req, res, params }) => {
  const usuario = await requerir(req)
  const notificaciones = await col(COLECCIONES.notificaciones)
  await notificaciones.updateOne(
    { _id: idValido(params.id), usuarioId: String(usuario._id) },
    { $set: { leida: true } }
  )
  ok(res, { listo: true })
})
