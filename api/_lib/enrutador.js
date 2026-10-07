/**
 * Enrutador interno de la API.
 *
 * El plan Hobby de Vercel cuenta cada archivo de /api como una funcion aparte
 * y permite pocas. Por eso hay una sola funcion (api/index.js) y aqui se
 * decide que codigo atiende cada direccion.
 */

/** Convierte '/pedidos/:codigo' en una expresion regular con grupos. */
function compilar(patron) {
  const nombres = []
  const fuente = patron
    .split('/')
    .map((parte) => {
      if (!parte) return ''
      if (parte.startsWith(':')) {
        nombres.push(parte.slice(1))
        return '/([^/]+)'
      }
      return '/' + parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
  return { regex: new RegExp(`^${fuente || '/'}$`), nombres }
}

const tabla = []

/** Registra una ruta. `manejar(contexto)` recibe req, res, params y query. */
export function registrar(metodo, patron, manejar) {
  tabla.push({ metodo, ...compilar(patron), manejar })
}

export function buscar(metodo, ruta) {
  let coincideRuta = false
  for (const entrada of tabla) {
    const m = entrada.regex.exec(ruta)
    if (!m) continue
    coincideRuta = true
    if (entrada.metodo !== metodo) continue
    const params = {}
    entrada.nombres.forEach((nombre, i) => {
      params[nombre] = decodeURIComponent(m[i + 1])
    })
    return { entrada, params, coincideRuta }
  }
  return { entrada: null, params: null, coincideRuta }
}
