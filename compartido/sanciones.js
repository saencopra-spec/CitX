import { PAUSAS } from './jornada.js'
import { fechaDesdeCR, fechaLarga, horaDe } from './hora.js'

/**
 * Pedidos no recogidos, alertas y sanciones de la soda. Aqui solo hay
 * calculos (sin base de datos) para que la API, la interfaz y las pruebas
 * usen exactamente las mismas reglas.
 */

/** Minutos de gracia despues de que termina la franja de retiro. */
export const MARGEN_GRACIA_MIN = 15

/**
 * Las sanciones permanentes se guardan con una fecha de fin muy lejana, como
 * en Lyfter. Asi todas las consultas comparan fechas de la misma forma.
 */
export const FIN_PERMANENTE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59))

const DIA_MS = 24 * 60 * 60 * 1000

export const DURACIONES = {
  '1d': { texto: '1 día', dias: 1 },
  '3d': { texto: '3 días', dias: 3 },
  '1s': { texto: '1 semana', dias: 7 },
  personalizada: { texto: 'Personalizada' },
  permanente: { texto: 'Permanente' },
}

export const CLAVES_DURACION = Object.keys(DURACIONES)

export const NOMBRE_ESTADO_SANCION = {
  alerta: 'Alerta',
  activa: 'Activa',
  cumplida: 'Cumplida',
  levantada: 'Levantada',
  reemplazada: 'Reemplazada',
}

export function esPermanente(hasta) {
  return Boolean(hasta) && new Date(hasta).getUTCFullYear() >= 9999
}

/** Momento en que termina la pausa elegida para retirar el pedido. */
export function finDeFranja(franja) {
  const pausa = PAUSAS.find((p) => p.clave === franja?.clave)
  if (!pausa || !franja?.fecha) return null
  return fechaDesdeCR(franja.fecha, pausa.fin)
}

/** Hasta cuando se puede retirar un pedido antes de darlo por no recogido. */
export function limiteRetiro(pedido, margen = MARGEN_GRACIA_MIN) {
  const fin = finDeFranja(pedido?.franja)
  return fin ? new Date(fin.getTime() + margen * 60 * 1000) : null
}

/** Solo un pedido que sigue en "listo" pasa a no recogido. */
export function debeMarcarseNoRecogido(
  pedido,
  ahora = new Date(),
  margen = MARGEN_GRACIA_MIN
) {
  if (pedido?.estado !== 'listo') return false
  const limite = limiteRetiro(pedido, margen)
  return Boolean(limite) && new Date(ahora) > limite
}

/**
 * Fecha de fin de una sancion. `hasta` (AAAA-MM-DDTHH:MM, hora de Costa Rica)
 * solo se usa con la duracion personalizada. Devuelve null si no es valida.
 */
export function calcularFin(duracion, { ahora = new Date(), hasta } = {}) {
  if (duracion === 'permanente') return FIN_PERMANENTE
  if (duracion === 'personalizada') {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(String(hasta ?? ''))
    if (!m) return null
    const fin = fechaDesdeCR(m[1], m[2])
    if (Number.isNaN(fin.getTime()) || fin <= new Date(ahora)) return null
    return fin
  }
  const dias = DURACIONES[duracion]?.dias
  if (!dias) return null
  return new Date(new Date(ahora).getTime() + dias * DIA_MS)
}

/** Una sancion bloquea mientras no se haya levantado y no haya vencido. */
export function sancionVigente(s, ahora = new Date()) {
  return (
    s?.tipo === 'sancion' &&
    !s.levantada &&
    Boolean(s.hasta) &&
    new Date(s.hasta) > new Date(ahora)
  )
}

/** La sancion que esta bloqueando ahora (la que termina mas tarde), o null. */
export function sancionActiva(lista = [], ahora = new Date()) {
  return (
    lista
      .filter((s) => sancionVigente(s, ahora))
      .sort((a, b) => new Date(b.hasta) - new Date(a.hasta))[0] ?? null
  )
}

export function estadoSancion(s, ahora = new Date()) {
  if (s.tipo === 'alerta') return 'alerta'
  if (s.levantada) {
    return s.levantada.motivo === 'reemplazada' ? 'reemplazada' : 'levantada'
  }
  return sancionVigente(s, ahora) ? 'activa' : 'cumplida'
}

/** 'jueves, 29 de octubre, 3:00 p. m.' o 'permanente'. */
export function textoFin(hasta) {
  if (esPermanente(hasta)) return 'permanente'
  return `${fechaLarga(hasta)}, ${horaDe(hasta)}`
}

/** El mismo texto se ve en la tarjeta roja y en el rechazo de la API. */
export function mensajeBloqueo(s) {
  const fin = esPermanente(s.hasta)
    ? 'Sanción permanente, hablá con administración'
    : `Podrás volver a pedir: ${textoFin(s.hasta)}`
  return `No podés hacer pedidos por ahora — Razón: ${s.razon} — ${fin}`
}
