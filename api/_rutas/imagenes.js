import { ObjectId } from 'mongodb'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { json } from '../_lib/respuesta.js'

/**
 * Fotos subidas desde el panel (productos, eventos, objetos perdidos).
 * El navegador las comprime antes de enviarlas (unos 200 KB como maximo) y
 * aqui se guardan como binario en MongoDB. Se sirven con cache largo porque
 * una imagen guardada nunca cambia: si se edita, se guarda una nueva.
 */
registrar('GET', '/imagenes/:id', async ({ res, params }) => {
  if (!ObjectId.isValid(params.id)) {
    return json(res, 404, { mensaje: 'No encontramos esa imagen.' })
  }
  const imagenes = await col(COLECCIONES.imagenes)
  const imagen = await imagenes.findOne({ _id: new ObjectId(params.id) })
  if (!imagen) return json(res, 404, { mensaje: 'No encontramos esa imagen.' })

  const datos = imagen.datos.buffer
    ? Buffer.from(imagen.datos.buffer)
    : imagen.datos
  res.statusCode = 200
  res.setHeader('Content-Type', imagen.tipo)
  res.setHeader('Content-Length', datos.length)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.end(datos)
})
