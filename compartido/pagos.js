import { partesCR } from './hora.js'

/**
 * Validaciones del pago simulado. Nada de esto cobra dinero: solo revisa que
 * los datos tengan un formato creible, como lo haria una pasarela real.
 */

export const TARJETA_PRUEBA = {
  numero: '4242 4242 4242 4242',
  vencimiento: '12/30',
  cvv: '123',
}

export const SINPE_SODA = { numero: '8888-1234', nombre: 'Soda Armonía CIT' }

export function soloDigitos(texto) {
  return String(texto ?? '').replace(/\D/g, '')
}

/** Algoritmo de Luhn: detecta errores de digitacion en numeros de tarjeta. */
export function pasaLuhn(numero) {
  const digitos = soloDigitos(numero)
  if (digitos.length < 12 || digitos.length > 19) return false
  let suma = 0
  let doblar = false
  for (let i = digitos.length - 1; i >= 0; i--) {
    let d = Number(digitos[i])
    if (doblar) {
      d *= 2
      if (d > 9) d -= 9
    }
    suma += d
    doblar = !doblar
  }
  return suma % 10 === 0
}

/** Marca de la tarjeta segun sus primeros digitos. */
export function marcaTarjeta(numero) {
  const d = soloDigitos(numero)
  if (/^4/.test(d)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'mastercard'
  if (/^3[47]/.test(d)) return 'amex'
  return null
}

export const NOMBRE_MARCA = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
}

/** Agrupa los digitos como se ven en la tarjeta: 4-4-4-4, o 4-6-5 en Amex. */
export function formatearNumeroTarjeta(numero) {
  const d = soloDigitos(numero).slice(0, 19)
  if (marcaTarjeta(d) === 'amex') {
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)]
      .filter(Boolean)
      .join(' ')
  }
  return d.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** 'MM/AA'. Valida que el mes exista y que la tarjeta no este vencida. */
export function vencimientoValido(texto, ahora = new Date()) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(texto ?? '').trim())
  if (!m) return false
  const mes = Number(m[1])
  const anio = 2000 + Number(m[2])
  if (mes < 1 || mes > 12) return false
  const hoy = partesCR(ahora)
  if (anio < hoy.anio) return false
  if (anio === hoy.anio && mes < hoy.mes) return false
  return anio <= hoy.anio + 20
}

export function cvvValido(cvv, marca) {
  const d = String(cvv ?? '')
  return marca === 'amex' ? /^\d{4}$/.test(d) : /^\d{3}$/.test(d)
}

/** Revisa la tarjeta completa y devuelve errores por campo (vacio si esta bien). */
export function validarTarjeta(
  { numero, titular, vencimiento, cvv },
  ahora = new Date()
) {
  const errores = {}
  const marca = marcaTarjeta(numero)
  if (!soloDigitos(numero)) {
    errores.numero = 'Escribí el número de la tarjeta.'
  } else if (!marca) {
    errores.numero = 'Solo aceptamos Visa, Mastercard o American Express.'
  } else if (!pasaLuhn(numero)) {
    errores.numero = 'Ese número no es válido. Revisalo de nuevo.'
  }

  if (String(titular ?? '').trim().length < 3) {
    errores.titular = 'Escribí el nombre como aparece en la tarjeta.'
  }
  if (!vencimientoValido(vencimiento, ahora)) {
    errores.vencimiento =
      'Usá el formato MM/AA con una fecha que no haya pasado.'
  }
  if (!cvvValido(cvv, marca)) {
    errores.cvv =
      marca === 'amex'
        ? 'Son los 4 dígitos del frente de la tarjeta.'
        : 'Son los 3 dígitos de atrás de la tarjeta.'
  }
  return errores
}

/** Comprobante SINPE ficticio: entre 6 y 25 digitos. */
export function comprobanteSinpeValido(texto) {
  const limpio = String(texto ?? '').replace(/[\s-]/g, '')
  return /^\d{6,25}$/.test(limpio)
}

/** Ultimos cuatro digitos: lo unico que se guarda de una tarjeta. */
export function ultimosCuatro(numero) {
  return soloDigitos(numero).slice(-4)
}
