/** Quita tildes y pasa a minusculas, para buscar sin importar como se escriba. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** true si todas las palabras de la busqueda aparecen en alguno de los campos. */
export function coincide(busqueda, ...campos) {
  const b = normalizar(busqueda)
  if (!b) return true
  const pajar = normalizar(campos.join(' '))
  return b.split(/\s+/).every((p) => pajar.includes(p))
}
