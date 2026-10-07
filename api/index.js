import { responderError, json } from './_lib/respuesta.js'
import { registrar, buscar } from './_lib/enrutador.js'

/**
 * Unica funcion de la API. En vercel.json reescribimos /api/(.*) hacia aqui
 * y el enrutador interno decide que modulo atiende cada direccion.
 */

// Las rutas se registran al importar cada modulo.
import './_rutas/auth.js'
import './_rutas/configuracion.js'
import './_rutas/lugares.js'
import './_rutas/eventos.js'
import './_rutas/soda.js'
import './_rutas/pedidos.js'
import './_rutas/objetos.js'
import './_rutas/recordatorios.js'
import './_rutas/clases.js'
import './_rutas/enfermeria.js'
import './_rutas/notificaciones.js'
import './_rutas/usuarios.js'
import './_rutas/resumen.js'
import './_rutas/imagenes.js'

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

    // Quitamos el prefijo /api que deja la reescritura de Vercel.
    let ruta = url.pathname.replace(/^\/api/, '') || '/'
    if (ruta.length > 1 && ruta.endsWith('/')) ruta = ruta.slice(0, -1)

    const { entrada, params, coincideRuta } = buscar(req.method, ruta)

    if (!entrada) {
      return json(res, coincideRuta ? 405 : 404, {
        mensaje: coincideRuta
          ? 'Ese método no está permitido en esta dirección.'
          : 'Esa dirección de la API no existe.',
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
