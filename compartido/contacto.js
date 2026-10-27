/**
 * Teléfono de contacto de una cuenta. Se usa en el registro, el perfil y a la
 * hora de pedir en la soda. La API, el navegador y las pruebas comparten estas
 * funciones para que la validación sea siempre la misma.
 *
 * En Costa Rica los números son de 8 dígitos. Guardamos solo los dígitos y los
 * mostramos con un espacio en el medio (8888 8888).
 */

export function soloDigitosTelefono(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

export function telefonoValido(valor) {
  return soloDigitosTelefono(valor).length === 8
}

/** Deja el teléfono en su forma guardable (8 dígitos) o null si no es válido. */
export function normalizarTelefono(valor) {
  const digitos = soloDigitosTelefono(valor)
  return digitos.length === 8 ? digitos : null
}

export function formatearTelefono(valor) {
  const d = soloDigitosTelefono(valor).slice(0, 8)
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d
}
