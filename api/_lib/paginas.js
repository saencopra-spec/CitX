/**
 * Paginacion en el servidor: las listas largas del panel llegan de a
 * POR_PAGINA, junto con el total, y la interfaz pide la pagina que se ve.
 */

export const POR_PAGINA = 20

/** Lee `?pagina=` (desde 1). Cualquier valor raro cuenta como la primera. */
export function paginaDe(query) {
  const n = Number.parseInt(String(query?.pagina ?? '1'), 10)
  const pagina = Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 1
  return { pagina, saltar: (pagina - 1) * POR_PAGINA, porPagina: POR_PAGINA }
}
