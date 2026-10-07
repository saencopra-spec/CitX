import { createHash, randomInt } from 'node:crypto'
import { col, COLECCIONES } from './db.js'
import { demasiados, malaPeticion } from './respuesta.js'
import {
  ROLES_PERSONAL,
  PERMISOS_ASIGNABLES,
} from '../../compartido/permisos.js'

/**
 * Codigos de invitacion para el personal.
 *
 * - Se generan con el generador seguro de numeros de Node (crypto).
 * - En la base solo se guarda la huella (hash) del codigo, nunca el codigo:
 *   si alguien llegara a ver la base, no podria usarlos.
 * - Vencen, tienen un numero maximo de usos y se pueden revocar.
 * - Probar codigos al azar esta limitado por IP.
 */

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generarCodigoInvitacion() {
  let c = ''
  for (let i = 0; i < 10; i++) c += ALFABETO[randomInt(ALFABETO.length)]
  return `CIT-${c.slice(0, 5)}-${c.slice(5)}`
}

export function huella(codigo) {
  const limpio = String(codigo ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  return createHash('sha256').update(limpio).digest('hex')
}

export function invitacionPublica(i) {
  const ahora = new Date()
  let estado = 'activa'
  if (i.revocada) estado = 'revocada'
  else if (i.usos >= i.usosMaximos) estado = 'usada'
  else if (i.venceEn < ahora) estado = 'vencida'
  return {
    id: String(i._id),
    rol: i.rol,
    permisos: i.permisos ?? null,
    nota: i.nota,
    pista: i.pista,
    usos: i.usos,
    usosMaximos: i.usosMaximos,
    usadoPor: i.usadoPor ?? [],
    venceEn: i.venceEn,
    creadoEn: i.creadoEn,
    creadoPorNombre: i.creadoPorNombre,
    estado,
  }
}

export function validarDatosInvitacion({ rol, permisos }) {
  if (!ROLES_PERSONAL.includes(rol))
    throw malaPeticion('Ese rol no se puede invitar.')
  if (permisos && permisos.some((p) => !PERMISOS_ASIGNABLES.includes(p))) {
    throw malaPeticion('Hay un permiso que no existe.')
  }
}

const MAX_INTENTOS = 10
const VENTANA_MS = 15 * 60 * 1000

/**
 * Gasta un uso del codigo de forma atomica (dos personas no pueden usar el
 * ultimo uso al mismo tiempo). Devuelve la invitacion o lanza un error claro.
 */
export async function canjear(codigo, ip, usuario) {
  const intentos = await col(COLECCIONES.intentosEntrada)
  const llave = `invitacion|${ip}`
  const recientes = await intentos.countDocuments({
    llave,
    creadoEn: { $gte: new Date(Date.now() - VENTANA_MS) },
  })
  if (recientes >= MAX_INTENTOS) {
    throw demasiados(
      'Hubo demasiados códigos equivocados. Esperá 15 minutos y probá de nuevo.'
    )
  }

  const invitaciones = await col(COLECCIONES.invitaciones)
  const ahora = new Date()
  const r = await invitaciones.findOneAndUpdate(
    {
      hash: huella(codigo),
      revocada: { $ne: true },
      venceEn: { $gt: ahora },
      $expr: { $lt: ['$usos', '$usosMaximos'] },
    },
    {
      $inc: { usos: 1 },
      $push: {
        usadoPor: {
          id: String(usuario._id ?? ''),
          nombre: usuario.nombre,
          correo: usuario.correo,
          en: ahora,
        },
      },
    },
    { returnDocument: 'after' }
  )
  if (!r) {
    await intentos.insertOne({ llave, creadoEn: ahora })
    throw malaPeticion(
      'El código de invitación no es válido, ya se usó o venció.',
      {
        codigo:
          'Código no válido, ya usado o vencido. Pedile uno nuevo a la administración.',
      }
    )
  }
  return r
}
