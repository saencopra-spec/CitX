import { col, COLECCIONES } from './db.js'
import { sinPermiso } from './respuesta.js'
import { notificar } from './notificar.js'
import { partesCR } from '../../compartido/hora.js'
import { NO_RECOGIDO } from '../../compartido/pedidos.js'
import {
  MARGEN_GRACIA_MIN,
  debeMarcarseNoRecogido,
  mensajeBloqueo,
} from '../../compartido/sanciones.js'

/**
 * Lo que comparten las rutas de pedidos y de sanciones. Vercel no tiene
 * tareas programadas finas en el plan Hobby, asi que estas revisiones corren
 * cada vez que alguien consulta o crea pedidos (y una vez al dia por cron).
 */

/** Se puede cambiar con MARGEN_NO_RECOGIDO_MIN sin tocar el codigo. */
export function margenGracia() {
  const valor = process.env.MARGEN_NO_RECOGIDO_MIN
  const n = Number(valor)
  return valor !== undefined && valor !== '' && Number.isFinite(n) && n >= 0
    ? n
    : MARGEN_GRACIA_MIN
}

/**
 * Pasa a "no recogido" los pedidos listos cuya franja ya termino (mas el
 * margen). No sanciona ni avisa a nadie: eso lo decide la administracion.
 */
export async function revisarNoRecogidos(ahora = new Date()) {
  const pedidos = await col(COLECCIONES.pedidos)
  const listos = await pedidos
    .find(
      { estado: 'listo', 'franja.fecha': { $lte: partesCR(ahora).iso } },
      { projection: { estado: 1, franja: 1 } }
    )
    .toArray()
  const margen = margenGracia()
  const vencidos = listos
    .filter((p) => debeMarcarseNoRecogido(p, ahora, margen))
    .map((p) => p._id)
  if (vencidos.length === 0) return 0
  // Se vuelve a pedir estado 'listo' por si la soda lo entrego en el medio.
  const r = await pedidos.updateMany(
    { _id: { $in: vencidos }, estado: 'listo' },
    {
      $set: { estado: NO_RECOGIDO },
      $push: { historial: { estado: NO_RECOGIDO, en: ahora } },
    }
  )
  return r.modifiedCount
}

/** Filtro de las sanciones que estan bloqueando en este momento. */
export function filtroVigentes(ahora = new Date()) {
  return { tipo: 'sancion', levantada: null, hasta: { $gt: ahora } }
}

export async function buscarSancionActiva(usuarioId, ahora = new Date()) {
  const sanciones = await col(COLECCIONES.sanciones)
  return sanciones
    .find({ ...filtroVigentes(ahora), usuarioId: String(usuarioId) })
    .sort({ hasta: -1 })
    .limit(1)
    .next()
}

/** Rechaza el pedido de alguien sancionado con el mismo texto de la tarjeta. */
export async function exigirSinSancion(usuario, ahora = new Date()) {
  const sancion = await buscarSancionActiva(usuario._id, ahora)
  if (sancion) throw sinPermiso(mensajeBloqueo(sancion))
}

export async function avisarQuePuedePedir(usuarioId, cuerpo) {
  await notificar([usuarioId], {
    titulo: 'Ya podés volver a pedir',
    cuerpo,
    enlace: '/soda',
    tipo: 'sancion',
  })
}

/**
 * Avisa una sola vez a quienes ya cumplieron su sancion. `finAvisado` evita
 * que el cron y la consulta del usuario manden el aviso dos veces.
 */
export async function avisarSancionesVencidas(
  { usuarioId = null } = {},
  ahora = new Date()
) {
  const sanciones = await col(COLECCIONES.sanciones)
  const filtro = {
    tipo: 'sancion',
    levantada: null,
    hasta: { $lte: ahora },
    finAvisado: { $ne: true },
  }
  if (usuarioId) filtro.usuarioId = String(usuarioId)
  const vencidas = await sanciones.find(filtro).limit(200).toArray()
  let avisadas = 0
  for (const s of vencidas) {
    const r = await sanciones.updateOne(
      { _id: s._id, finAvisado: { $ne: true } },
      { $set: { finAvisado: true } }
    )
    if (r.modifiedCount === 0) continue
    if (await buscarSancionActiva(s.usuarioId, ahora)) continue
    await avisarQuePuedePedir(
      s.usuarioId,
      'Tu sanción en la soda terminó. Ya podés hacer pedidos de nuevo.'
    )
    avisadas++
  }
  return avisadas
}
