/**
 * Comprime una foto en el navegador antes de subirla, para que pese unos
 * 200 KB como maximo. Asi se sube rapido aunque la senal sea mala y no se
 * llena la base de datos.
 */
const LIMITE_BYTES = 200 * 1024

function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error('No pudimos abrir esa imagen. Probá con una foto JPG o PNG.')
      )
    }
    img.src = url
  })
}

function bytesDeDataUrl(dataUrl) {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.ceil((base64.length * 3) / 4)
}

export async function comprimirImagen(archivo, { ladoMaximo = 1200 } = {}) {
  if (!archivo?.type?.startsWith('image/')) {
    throw new Error('El archivo tiene que ser una imagen.')
  }
  const img = await cargarImagen(archivo)

  let lado = ladoMaximo
  let calidad = 0.8
  let resultado = ''

  // Probamos bajando calidad y luego tamano hasta quedar por debajo del limite.
  for (let intento = 0; intento < 10; intento++) {
    const escala = Math.min(1, lado / Math.max(img.width, img.height))
    const ancho = Math.round(img.width * escala)
    const alto = Math.round(img.height * escala)
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ancho, alto)
    ctx.drawImage(img, 0, 0, ancho, alto)

    resultado = lienzo.toDataURL('image/webp', calidad)
    if (!resultado.startsWith('data:image/webp')) {
      resultado = lienzo.toDataURL('image/jpeg', calidad)
    }
    if (bytesDeDataUrl(resultado) <= LIMITE_BYTES) break

    if (calidad > 0.5) calidad -= 0.1
    else lado = Math.round(lado * 0.8)
  }

  return { dataUrl: resultado, bytes: bytesDeDataUrl(resultado) }
}
