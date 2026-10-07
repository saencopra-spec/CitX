/**
 * Montos en colones, siempre enteros (la soda no maneja centimos).
 */

/** 3300 -> '₡3 300' (el espacio no se parte entre lineas). */
export function colones(monto) {
  const entero = Math.round(Number(monto) || 0)
  const signo = entero < 0 ? '-' : ''
  const cifras = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${signo}₡${cifras}`
}

/** Total de un carrito o pedido: suma de precio por cantidad. */
export function calcularTotal(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((suma, item) => {
    const precio = Math.max(0, Math.round(Number(item.precio) || 0))
    const cantidad = Math.max(0, Math.floor(Number(item.cantidad) || 0))
    return suma + precio * cantidad
  }, 0)
}

/** Cantidad total de unidades. */
export function contarUnidades(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce(
    (s, i) => s + Math.max(0, Math.floor(Number(i.cantidad) || 0)),
    0
  )
}
