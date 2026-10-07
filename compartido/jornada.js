import { partesCR, aMinutos, sumarDias, diaSemanaDe } from './hora.js'

/**
 * Jornada del colegio: de 7:00 a. m. a 3:30 p. m., lecciones de 40 minutos,
 * dos recreos y almuerzo. Es un horario de ejemplo.
 */
export const BLOQUES = [
  { tipo: 'leccion', numero: 1, inicio: '07:00', fin: '07:40' },
  { tipo: 'leccion', numero: 2, inicio: '07:40', fin: '08:20' },
  { tipo: 'leccion', numero: 3, inicio: '08:20', fin: '09:00' },
  {
    tipo: 'pausa',
    clave: 'recreo-manana',
    nombre: 'Recreo de la mañana',
    inicio: '09:00',
    fin: '09:20',
  },
  { tipo: 'leccion', numero: 4, inicio: '09:20', fin: '10:00' },
  { tipo: 'leccion', numero: 5, inicio: '10:00', fin: '10:40' },
  { tipo: 'leccion', numero: 6, inicio: '10:40', fin: '11:20' },
  { tipo: 'leccion', numero: 7, inicio: '11:20', fin: '12:00' },
  {
    tipo: 'pausa',
    clave: 'almuerzo',
    nombre: 'Almuerzo',
    inicio: '12:00',
    fin: '12:40',
  },
  { tipo: 'leccion', numero: 8, inicio: '12:40', fin: '13:20' },
  { tipo: 'leccion', numero: 9, inicio: '13:20', fin: '14:00' },
  {
    tipo: 'pausa',
    clave: 'recreo-tarde',
    nombre: 'Recreo de la tarde',
    inicio: '14:00',
    fin: '14:10',
  },
  { tipo: 'leccion', numero: 10, inicio: '14:10', fin: '14:50' },
  { tipo: 'leccion', numero: 11, inicio: '14:50', fin: '15:30' },
]

export const LECCIONES = BLOQUES.filter((b) => b.tipo === 'leccion')
export const PAUSAS = BLOQUES.filter((b) => b.tipo === 'pausa')

export const DIAS_LECTIVOS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
]

export const NOMBRE_DIA = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
}

/** Bloque (leccion o pausa) que esta ocurriendo en este momento, o null. */
export function bloqueActual(ahora = new Date()) {
  const p = partesCR(ahora)
  if (p.diaSemana === 0 || p.diaSemana === 6) return null
  return (
    BLOQUES.find(
      (b) => p.minutos >= aMinutos(b.inicio) && p.minutos < aMinutos(b.fin)
    ) ?? null
  )
}

/** Minutos de anticipacion minima para pedir en la soda. */
export const ANTICIPACION_PEDIDO = 10

function esDiaLectivo(iso) {
  const d = diaSemanaDe(iso)
  return d >= 1 && d <= 5
}

/**
 * Franjas en las que se puede retirar un pedido de la soda. Si ya pasaron
 * todas las de hoy (o es fin de semana), ofrece las del siguiente dia lectivo.
 */
export function franjasDeRetiro(ahora = new Date()) {
  const p = partesCR(ahora)
  const franjas = []

  if (esDiaLectivo(p.iso)) {
    for (const pausa of PAUSAS) {
      if (aMinutos(pausa.inicio) - ANTICIPACION_PEDIDO > p.minutos) {
        franjas.push({
          fecha: p.iso,
          clave: pausa.clave,
          nombre: pausa.nombre,
          inicio: pausa.inicio,
          hoy: true,
        })
      }
    }
  }

  if (franjas.length === 0) {
    let siguiente = sumarDias(p.iso, 1)
    while (!esDiaLectivo(siguiente)) siguiente = sumarDias(siguiente, 1)
    for (const pausa of PAUSAS) {
      franjas.push({
        fecha: siguiente,
        clave: pausa.clave,
        nombre: pausa.nombre,
        inicio: pausa.inicio,
        hoy: false,
      })
    }
  }

  return franjas
}

/** Comprueba que una franja elegida por el usuario sea valida ahora mismo. */
export function franjaValida(fecha, clave, ahora = new Date()) {
  return franjasDeRetiro(ahora).some(
    (f) => f.fecha === fecha && f.clave === clave
  )
}

export function nombreFranja(clave) {
  return PAUSAS.find((p) => p.clave === clave)?.nombre ?? clave
}

export function inicioFranja(clave) {
  return PAUSAS.find((p) => p.clave === clave)?.inicio ?? null
}
