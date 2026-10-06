/**
 * Cliente para hablar con la API de CitX.
 * La sesion viaja en una cookie httpOnly, por eso siempre mandamos
 * credentials: 'include' y nunca guardamos el token en JavaScript.
 */

const BASE = '/api'

export class ErrorApi extends Error {
  constructor(mensaje, estado, datos) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.datos = datos ?? null
    /** Errores por campo, para mostrarlos junto al input correspondiente. */
    this.campos = datos?.campos ?? null
  }

  get esDeRed() {
    return this.estado === 0
  }

  get esDeSesion() {
    return this.estado === 401
  }

  get esDePermiso() {
    return this.estado === 403
  }
}

async function pedir(metodo, ruta, cuerpo, opciones = {}) {
  const config = {
    method: metodo,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(opciones.headers || {}) },
    signal: opciones.signal,
  }

  if (cuerpo !== undefined && cuerpo !== null) {
    config.headers['Content-Type'] = 'application/json'
    config.body = JSON.stringify(cuerpo)
  }

  let respuesta
  try {
    respuesta = await fetch(BASE + ruta, config)
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ErrorApi(
      'No se pudo conectar. Revisa tu conexion a internet.',
      0,
      null
    )
  }

  const tipo = respuesta.headers.get('content-type') || ''
  const datos = tipo.includes('application/json')
    ? await respuesta.json().catch(() => null)
    : null

  if (!respuesta.ok) {
    throw new ErrorApi(
      datos?.mensaje || 'Ocurrio un error inesperado. Intenta de nuevo.',
      respuesta.status,
      datos
    )
  }

  return datos
}

export const api = {
  get: (ruta, opciones) => pedir('GET', ruta, undefined, opciones),
  post: (ruta, cuerpo, opciones) => pedir('POST', ruta, cuerpo, opciones),
  put: (ruta, cuerpo, opciones) => pedir('PUT', ruta, cuerpo, opciones),
  patch: (ruta, cuerpo, opciones) => pedir('PATCH', ruta, cuerpo, opciones),
  delete: (ruta, opciones) => pedir('DELETE', ruta, undefined, opciones),
}
