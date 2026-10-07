/**
 * Fechas y horas siempre en la zona de Costa Rica, sin importar donde corra
 * el codigo (el servidor de Vercel esta en UTC y el navegador puede tener otra
 * zona configurada).
 */

export const ZONA = 'America/Costa_Rica'

const DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
]

const formateadorPartes = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
})

const SEMANA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Descompone una fecha en sus partes segun la hora de Costa Rica. */
export function partesCR(fecha = new Date()) {
  const p = {}
  for (const { type, value } of formateadorPartes.formatToParts(
    new Date(fecha)
  )) {
    p[type] = value
  }
  const diaSemana = SEMANA[p.weekday]
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    diaSemana,
    nombreDia: DIAS[diaSemana],
    /** Minutos desde la medianoche, util para comparar con horarios. */
    minutos: Number(p.hour) * 60 + Number(p.minute),
    /** Fecha en formato AAAA-MM-DD. */
    iso: `${p.year}-${p.month}-${p.day}`,
  }
}

/** '07:30' -> 450 */
export function aMinutos(texto) {
  const [h, m] = String(texto).split(':').map(Number)
  return h * 60 + (m || 0)
}

/** 450 -> '7:30 a. m.' */
export function horaLegible(minutosOTexto) {
  const total =
    typeof minutosOTexto === 'number' ? minutosOTexto : aMinutos(minutosOTexto)
  const h = Math.floor(total / 60)
  const m = total % 60
  const sufijo = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`
}

/** Suma dias a una fecha AAAA-MM-DD y devuelve otra en el mismo formato. */
export function sumarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d + dias))
  return f.toISOString().slice(0, 10)
}

/** Dia de la semana (0 = domingo) de una fecha AAAA-MM-DD. */
export function diaSemanaDe(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

/**
 * Convierte una fecha AAAA-MM-DD y una hora HH:MM de Costa Rica a un Date.
 * Costa Rica no usa horario de verano: siempre es UTC-6.
 */
export function fechaDesdeCR(iso, hora = '00:00') {
  return new Date(`${iso}T${hora.padStart(5, '0')}:00-06:00`)
}

const formatoFechaLarga = new Intl.DateTimeFormat('es-CR', {
  timeZone: ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const formatoFechaCorta = new Intl.DateTimeFormat('es-CR', {
  timeZone: ZONA,
  day: 'numeric',
  month: 'short',
})

/** 'viernes, 9 de octubre' */
export function fechaLarga(fecha) {
  return formatoFechaLarga.format(new Date(fecha))
}

/** '9 oct' */
export function fechaCorta(fecha) {
  return formatoFechaCorta.format(new Date(fecha)).replace('.', '')
}

/** '10:30 a. m.' */
export function horaDe(fecha) {
  return horaLegible(partesCR(fecha).minutos)
}

/** 'hoy', 'mañana', 'ayer' o la fecha larga. */
export function fechaRelativa(fecha, ahora = new Date()) {
  const hoy = partesCR(ahora).iso
  const dia = partesCR(fecha).iso
  if (dia === hoy) return 'hoy'
  if (dia === sumarDias(hoy, 1)) return 'mañana'
  if (dia === sumarDias(hoy, -1)) return 'ayer'
  return fechaLarga(fecha)
}

/** Fecha AAAA-MM-DD (sin hora) en texto: 'jueves 8 de octubre'. */
export function fechaIsoLegible(iso) {
  return fechaLarga(fechaDesdeCR(iso, '12:00'))
}

/** Saludo segun la hora de Costa Rica. */
export function saludoSegunHora(ahora = new Date()) {
  const { hora } = partesCR(ahora)
  if (hora < 12) return 'Buenos días'
  if (hora < 18) return 'Buenas tardes'
  return 'Buenas noches'
}
