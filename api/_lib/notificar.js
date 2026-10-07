import { col, COLECCIONES } from './db.js'

/**
 * Crea notificaciones dentro de la app. Se guardan en la base y el navegador
 * las consulta cada cierto tiempo (Vercel no mantiene conexiones abiertas).
 */
export async function notificar(
  usuarioIds,
  { titulo, cuerpo, enlace = null, tipo = 'general' }
) {
  const ids = [...new Set(usuarioIds.map(String))]
  if (ids.length === 0) return
  const ahora = new Date()
  const notificaciones = await col(COLECCIONES.notificaciones)
  await notificaciones.insertMany(
    ids.map((id) => ({
      usuarioId: id,
      titulo,
      cuerpo,
      enlace,
      tipo,
      leida: false,
      creadoEn: ahora,
    }))
  )
}

/**
 * Busca a quienes les llega algo dirigido a todo el colegio o a ciertas
 * secciones. El personal sin seccion recibe solo lo que va para todos.
 */
export async function destinatarios(
  { todos, secciones = [] },
  excluirId = null
) {
  const usuarios = await col(COLECCIONES.usuarios)
  const filtro = { activo: { $ne: false }, rol: { $nin: ['soda'] } }
  if (!todos) filtro.seccion = { $in: secciones }
  const lista = await usuarios
    .find(filtro, { projection: { _id: 1 } })
    .toArray()
  return lista
    .map((u) => String(u._id))
    .filter((id) => id !== String(excluirId))
}
