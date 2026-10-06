/** Ayudas para responder siempre con el mismo formato JSON. */

export function json(res, estado, cuerpo) {
  res.statusCode = estado
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.end(JSON.stringify(cuerpo))
}

export const ok = (res, datos = {}) => json(res, 200, datos)
export const creado = (res, datos = {}) => json(res, 201, datos)
export const sinContenido = (res) => {
  res.statusCode = 204
  res.end()
}

/** Error de la aplicacion con codigo HTTP y, opcionalmente, errores por campo. */
export class ErrorHttp extends Error {
  constructor(estado, mensaje, campos = null) {
    super(mensaje)
    this.name = 'ErrorHttp'
    this.estado = estado
    this.campos = campos
  }
}

export const malaPeticion = (mensaje, campos) =>
  new ErrorHttp(400, mensaje, campos)
export const noAutenticado = (mensaje = 'Necesitas iniciar sesion.') =>
  new ErrorHttp(401, mensaje)
export const sinPermiso = (mensaje = 'No tenes permiso para hacer esto.') =>
  new ErrorHttp(403, mensaje)
export const noExiste = (mensaje = 'No encontramos lo que buscabas.') =>
  new ErrorHttp(404, mensaje)
export const conflicto = (mensaje, campos) =>
  new ErrorHttp(409, mensaje, campos)
export const demasiados = (mensaje) => new ErrorHttp(429, mensaje)

/** Traduce cualquier error a una respuesta JSON entendible. */
export function responderError(res, error) {
  if (error instanceof ErrorHttp) {
    const cuerpo = { mensaje: error.mensaje ?? error.message }
    if (error.campos) cuerpo.campos = error.campos
    return json(res, error.estado, cuerpo)
  }

  if (error?.name === 'ZodError') {
    const campos = {}
    for (const problema of error.issues ?? []) {
      const clave = problema.path.join('.')
      if (!campos[clave]) campos[clave] = problema.message
    }
    return json(res, 400, {
      mensaje: 'Revisa los datos del formulario.',
      campos,
    })
  }

  // Correo o clave repetida en un indice unico.
  if (error?.code === 11000) {
    return json(res, 409, { mensaje: 'Ese registro ya existe.' })
  }

  console.error('[citx] Error no controlado:', error)
  return json(res, 500, {
    mensaje: 'Algo salio mal de nuestro lado. Intenta de nuevo en un momento.',
  })
}

/** Lee el cuerpo JSON de la peticion. */
export async function leerCuerpo(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body)
      } catch {
        throw malaPeticion('El cuerpo de la peticion no es JSON valido.')
      }
    }
    return req.body
  }

  const trozos = []
  let tamano = 0
  for await (const trozo of req) {
    tamano += trozo.length
    // Tope de 6 MB: las fotos ya vienen comprimidas desde el navegador.
    if (tamano > 6 * 1024 * 1024) {
      throw malaPeticion('El contenido enviado es demasiado grande.')
    }
    trozos.push(trozo)
  }

  if (trozos.length === 0) return {}

  try {
    return JSON.parse(Buffer.concat(trozos).toString('utf8'))
  } catch {
    throw malaPeticion('El cuerpo de la peticion no es JSON valido.')
  }
}
