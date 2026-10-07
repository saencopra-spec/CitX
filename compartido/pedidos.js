export const ESTADOS_PEDIDO = ['recibido', 'preparacion', 'listo', 'entregado']

export const NOMBRE_ESTADO = {
  recibido: 'Recibido',
  preparacion: 'En preparación',
  listo: 'Listo para retirar',
  entregado: 'Entregado',
}

export const METODOS_PAGO = {
  sinpe: 'SINPE Móvil',
  tarjeta: 'Tarjeta',
  efectivo: 'Efectivo al retirar',
}

/** Siguiente estado en la linea de tiempo, o null si ya termino. */
export function siguienteEstado(estado) {
  const i = ESTADOS_PEDIDO.indexOf(estado)
  if (i === -1 || i === ESTADOS_PEDIDO.length - 1) return null
  return ESTADOS_PEDIDO[i + 1]
}

/** Se avanza de uno en uno, o se devuelve un paso si fue un error. */
export function cambioDeEstadoPermitido(actual, nuevo) {
  const a = ESTADOS_PEDIDO.indexOf(actual)
  const n = ESTADOS_PEDIDO.indexOf(nuevo)
  if (a === -1 || n === -1) return false
  return n === a + 1 || n === a - 1
}

/** Codigo corto, sin caracteres que se confundan (0/O, 1/I/L). */
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generarCodigo(azar = Math.random) {
  let c = ''
  for (let i = 0; i < 5; i++) {
    c += ALFABETO_CODIGO[Math.floor(azar() * ALFABETO_CODIGO.length)]
  }
  return c
}

export function codigoValido(codigo) {
  return new RegExp(`^[${ALFABETO_CODIGO}]{5}$`).test(
    String(codigo ?? '').toUpperCase()
  )
}

/**
 * Lo que lleva el QR del pedido: un enlace a la pagina de verificacion. Asi
 * la soda lo puede escanear con la camara de cualquier celular y se abre el
 * pedido listo para entregar.
 */
export function textoQR(codigo, origen = 'https://citx.vercel.app') {
  return `${origen}/verificar/${codigo}`
}

/**
 * Saca el codigo de lo que leyo la camara. Acepta el enlace del QR, el
 * formato viejo (CITX-PEDIDO:XXXXX) o el codigo escrito a mano.
 */
export function codigoDesdeQR(texto) {
  const limpio = String(texto ?? '').trim()
  const enlace = /\/verificar\/([A-Za-z0-9]{5})\/?(?:[?#].*)?$/.exec(limpio)
  if (enlace && codigoValido(enlace[1])) return enlace[1].toUpperCase()
  const viejo = /^CITX-PEDIDO:([A-Za-z0-9]{5})$/i.exec(limpio)
  if (viejo && codigoValido(viejo[1])) return viejo[1].toUpperCase()
  const solo = limpio.toUpperCase().replace(/[\s-]/g, '')
  return codigoValido(solo) ? solo : null
}
