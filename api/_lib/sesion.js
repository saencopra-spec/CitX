import jwt from 'jsonwebtoken'
import { parseCookie, stringifySetCookie } from 'cookie'
import { ObjectId } from 'mongodb'
import { col, COLECCIONES, asegurarIndices } from './db.js'
import { noAutenticado, sinPermiso, noExiste } from './respuesta.js'
import { puede, permisosDe } from '../../compartido/permisos.js'

/**
 * Sesion con JWT guardado en una cookie httpOnly: JavaScript del navegador no
 * la puede leer, asi que un script malicioso no se roba la sesion.
 */

export const NOMBRE_COOKIE = 'citx_sesion'
const DURACION_SEGUNDOS = 60 * 60 * 24 * 7 // una semana

function secreto() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) {
    throw new Error(
      'Falta JWT_SECRET o es demasiado corta (minimo 32 caracteres).'
    )
  }
  return s
}

function esLocal(req) {
  const host = String(req.headers.host || '')
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

export function firmar(usuario) {
  // `v` permite cerrar todas las sesiones de alguien: si la version cambia en
  // la base, los tokens viejos dejan de servir.
  return jwt.sign(
    { sub: String(usuario._id), v: usuario.versionSesion ?? 0 },
    secreto(),
    {
      expiresIn: DURACION_SEGUNDOS,
    }
  )
}

export function ponerCookie(req, res, usuario) {
  res.setHeader(
    'Set-Cookie',
    stringifySetCookie({
      name: NOMBRE_COOKIE,
      value: firmar(usuario),
      httpOnly: true,
      secure: !esLocal(req),
      sameSite: 'lax',
      path: '/',
      maxAge: DURACION_SEGUNDOS,
    })
  )
}

export function borrarCookie(req, res) {
  res.setHeader(
    'Set-Cookie',
    stringifySetCookie({
      name: NOMBRE_COOKIE,
      value: '',
      httpOnly: true,
      secure: !esLocal(req),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  )
}

/** Datos del usuario que se pueden mandar al navegador (sin el hash). */
export function usuarioPublico(u) {
  if (!u) return null
  return {
    id: String(u._id),
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    seccion: u.seccion ?? null,
    favoritos: u.favoritos ?? [],
    configuracion: u.configuracion ?? null,
    activo: u.activo !== false,
    permisos: permisosDe(u),
    permisosAjustados: Array.isArray(u.permisos),
    debeCambiarContrasena: u.debeCambiarContrasena === true,
  }
}

/**
 * Lee la sesion. Siempre consulta la base para que un cambio de rol o una
 * cuenta desactivada tengan efecto de inmediato. Devuelve null si no hay.
 */
export async function usuarioDeSesion(req) {
  const cookies = parseCookie(req.headers.cookie || '')
  const token = cookies[NOMBRE_COOKIE]
  if (!token) return null

  let datos
  try {
    datos = jwt.verify(token, secreto())
  } catch {
    return null
  }
  if (!ObjectId.isValid(datos.sub)) return null

  await asegurarIndices()
  const usuarios = await col(COLECCIONES.usuarios)
  const usuario = await usuarios.findOne({ _id: new ObjectId(datos.sub) })
  if (!usuario || usuario.activo === false) return null
  if ((datos.v ?? 0) !== (usuario.versionSesion ?? 0)) return null
  return usuario
}

/** Exige sesion iniciada. Si se pasa una accion, exige tambien el permiso. */
export async function requerir(req, accion = null) {
  const usuario = await usuarioDeSesion(req)
  if (!usuario) throw noAutenticado()
  if (accion && !puede(usuario, accion)) throw sinPermiso()
  return usuario
}

/** Convierte un texto en ObjectId o responde 404. */
export function idValido(texto) {
  if (!ObjectId.isValid(texto)) throw noExiste()
  return new ObjectId(texto)
}

/** IP del cliente segun Vercel. */
export function ipDe(req) {
  const reenviada = String(req.headers['x-forwarded-for'] || '')
  return (
    reenviada.split(',')[0].trim() || req.socket?.remoteAddress || 'desconocida'
  )
}
