/**
 * Estado de un producto de la soda. La API, el panel, el menu y las pruebas
 * usan esta misma funcion.
 *
 * - Sin control de stock, el estado lo elige la soda a mano.
 * - Con control de stock, se calcula solo con las unidades que quedan.
 */

export const ESTADOS_PRODUCTO = ['disponible', 'pocas', 'agotado']

export const NOMBRE_ESTADO_PRODUCTO = {
  disponible: 'Disponible',
  pocas: 'Pocas unidades',
  agotado: 'Agotado',
}

/** Umbral de "pocas unidades" cuando el producto no tiene uno propio. */
export const UMBRAL_POCAS = 5

/** Tope de unidades que se reponen o quitan en un solo cambio. */
export const CAMBIO_STOCK_MAXIMO = 1000

export function umbralDe(p) {
  return Number.isInteger(p?.umbralPocas) && p.umbralPocas >= 0
    ? p.umbralPocas
    : UMBRAL_POCAS
}

export function estadoDe(p) {
  if (!p) return 'agotado'
  if (p.controlStock) {
    const stock = Math.max(0, Number(p.stock) || 0)
    if (stock === 0) return 'agotado'
    return stock <= umbralDe(p) ? 'pocas' : 'disponible'
  }
  if (ESTADOS_PRODUCTO.includes(p.estado)) return p.estado
  // Productos de antes del estado de tres opciones.
  return p.disponible === false ? 'agotado' : 'disponible'
}

export function sePuedePedir(p) {
  return estadoDe(p) !== 'agotado'
}
