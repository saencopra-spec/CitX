import { responderError, json } from './_lib/respuesta.js'

/**
 * Unica funcion de la API.
 *
 * El plan Hobby de Vercel limita cuantas funciones se pueden desplegar, asi que
 * en vez de un archivo por endpoint tenemos este enrutador interno. En
 * vercel.json reescribimos /api/(.*) hacia aqui.
 */

/** Convierte '/soda/pedido/:codigo' en una expresion regular con grupos. */
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

function buscar(metodo, ruta) {
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
    return { entrada, params }
  }
  return { entrada: null, params: null, coincideRuta }
}

// Las rutas se registran al importar cada modulo.
import './rutas/auth.js'
import './rutas/configuracion.js'
import './rutas/lugares.js'
import './rutas/eventos.js'
import './rutas/soda.js'
import './rutas/pedidos.js'
import './rutas/objetos.js'
import './rutas/recordatorios.js'
import './rutas/clases.js'
import './rutas/enfermeria.js'
import './rutas/notificaciones.js'
import './rutas/usuarios.js'
import './rutas/resumen.js'

registrar('GET', '/salud', async ({ res }) => {
  json(res, 200, {
    estado: 'bien',
    servicio: 'CitX',
    ahora: new Date().toISOString(),
    baseDeDatos: Boolean(process.env.MONGODB_URI),
  })
})

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'local'}`)

    // Quitamos el prefijo /api que agrega la reescritura de Vercel.
    let ruta = url.pathname.replace(/^\/api/, '') || '/'
    if (ruta.length > 1 && ruta.endsWith('/')) ruta = ruta.slice(0, -1)

    const { entrada, params, coincideRuta } = buscar(req.method, ruta)

    if (!entrada) {
      return json(res, coincideRuta ? 405 : 404, {
        mensaje: coincideRuta
          ? 'Ese metodo no esta permitido en esta direccion.'
          : 'Esa direccion de la API no existe.',
      })
    }

    return await entrada.manejar({
      req,
      res,
      params,
      query: Object.fromEntries(url.searchParams),
    })
  } catch (error) {
    return responderError(res, error)
  }
}
