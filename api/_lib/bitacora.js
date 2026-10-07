import { col, COLECCIONES } from './db.js'
import { ipDe } from './sesion.js'

/**
 * Registro de acciones importantes del panel (quien hizo que y cuando).
 * Sirve para revisar cambios de permisos, cuentas borradas o invitaciones.
 * Si falla, no se interrumpe la accion principal.
 */
export async function anotar(req, usuario, accion, detalle = '') {
  try {
    const bitacora = await col(COLECCIONES.bitacora)
    await bitacora.insertOne({
      usuarioId: usuario ? String(usuario._id) : null,
      usuarioNombre: usuario?.nombre ?? 'Sistema',
      accion,
      detalle: String(detalle).slice(0, 300),
      ip: ipDe(req),
      creadoEn: new Date(),
    })
  } catch (e) {
    console.error('[citx] No se pudo anotar en la bitácora:', e.message)
  }
}
