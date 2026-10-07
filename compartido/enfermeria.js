import { partesCR, aMinutos, horaLegible } from './hora.js'

export const HORARIO_ENFERMERIA = { abre: '07:00', cierra: '15:30' }

/**
 * Indica si la enfermeria esta abierta segun la hora de Costa Rica.
 * Atiende de lunes a viernes dentro de la jornada.
 */
export function estadoEnfermeria(
  ahora = new Date(),
  horario = HORARIO_ENFERMERIA
) {
  const p = partesCR(ahora)
  const abre = aMinutos(horario.abre)
  const cierra = aMinutos(horario.cierra)
  const textoAbre = horaLegible(abre)

  if (p.diaSemana === 0 || p.diaSemana === 6) {
    return {
      abierta: false,
      mensaje: `Cerrada. Abre el lunes a las ${textoAbre}.`,
    }
  }
  if (p.minutos < abre) {
    return { abierta: false, mensaje: `Cerrada. Abre hoy a las ${textoAbre}.` }
  }
  if (p.minutos >= cierra) {
    const cuando = p.diaSemana === 5 ? 'el lunes' : 'mañana'
    return {
      abierta: false,
      mensaje: `Cerrada. Abre ${cuando} a las ${textoAbre}.`,
    }
  }
  const faltan = cierra - p.minutos
  if (faltan <= 30) {
    return { abierta: true, mensaje: `Abierta. Cierra en ${faltan} minutos.` }
  }
  return {
    abierta: true,
    mensaje: `Abierta hasta las ${horaLegible(cierra)}.`,
  }
}
