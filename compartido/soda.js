/**
 * Estado de un producto de la soda. La API, el panel, el menu y las pruebas
 * usan esta misma funcion. El estado lo elige la soda a mano: un producto
 * esta disponible o agotado, sin llevar la cuenta de unidades.
 */

export const ESTADOS_PRODUCTO = ['disponible', 'agotado']

export const NOMBRE_ESTADO_PRODUCTO = {
  disponible: 'Disponible',
  agotado: 'Agotado',
}

export function estadoDe(p) {
  if (!p) return 'agotado'
  if (ESTADOS_PRODUCTO.includes(p.estado)) return p.estado
  // Productos de antes del campo `estado`.
  return p.disponible === false ? 'agotado' : 'disponible'
}

export function sePuedePedir(p) {
  return estadoDe(p) !== 'agotado'
}
