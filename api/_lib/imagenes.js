import { z } from 'zod'
import { col, COLECCIONES } from './db.js'
import { malaPeticion } from './respuesta.js'

const TIPOS = ['image/jpeg', 'image/webp', 'image/png']
const MAXIMO_BYTES = 400 * 1024

/**
 * Campo de foto en los formularios: puede ser una ruta ya guardada
 * ('/fotos/...', '/api/imagenes/...'), una imagen nueva en base64
 * ('data:image/...') o vacio.
 */
export const campoFoto = z
  .string()
  .max(600000, 'La foto es demasiado pesada.')
  .optional()
  .nullable()

/** Si la foto viene en base64 la guarda y devuelve su direccion; si no, la deja igual. */
export async function guardarFotoSiEsNueva(valor) {
  if (!valor) return null
  if (valor.startsWith('/fotos/') || valor.startsWith('/api/imagenes/'))
    return valor

  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(valor)
  if (!m || !TIPOS.includes(m[1])) {
    throw malaPeticion('La foto debe ser JPG, PNG o WebP.', {
      foto: 'Formato de foto no admitido.',
    })
  }
  const datos = Buffer.from(m[2], 'base64')
  if (datos.length > MAXIMO_BYTES) {
    throw malaPeticion('La foto es demasiado pesada.', {
      foto: 'La foto pesa demasiado. Probá con otra o recortala.',
    })
  }
  const imagenes = await col(COLECCIONES.imagenes)
  const { insertedId } = await imagenes.insertOne({
    tipo: m[1],
    datos,
    creadoEn: new Date(),
  })
  return `/api/imagenes/${insertedId}`
}
