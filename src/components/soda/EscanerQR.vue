<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { CircleAlert, RefreshCw, Keyboard } from 'lucide-vue-next'
import Dialogo from '@/components/avisos/Dialogo.vue'
import { codigoDesdeQR } from '@compartido/pedidos.js'

/**
 * Lector de QR con la camara. Usa el detector del navegador cuando existe
 * (Chrome en Android) y, si no, la libreria jsQR, que funciona en cualquier
 * navegador (iPhone, Firefox, computadoras). Emite el codigo del pedido.
 */
const props = defineProps({
  abierto: { type: Boolean, default: false },
})
const emit = defineEmits(['cerrar', 'leido'])

const video = ref(null)
const problema = ref('')
const aviso = ref('')
const trasera = ref(true)
const manual = ref('')
let flujo = null
let animacion = null
let detector = null
let jsQR = null
let lienzo = null

function apagar() {
  cancelAnimationFrame(animacion)
  animacion = null
  flujo?.getTracks().forEach((t) => t.stop())
  flujo = null
}

async function prepararLector() {
  if ('BarcodeDetector' in window) {
    try {
      const formatos = await window.BarcodeDetector.getSupportedFormats?.()
      if (!formatos || formatos.includes('qr_code')) {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        return
      }
    } catch {
      // Si falla, se usa jsQR.
    }
  }
  if (!jsQR) jsQR = (await import('jsqr')).default
}

async function leerCuadro() {
  const v = video.value
  if (!v || v.readyState < 2) return null
  if (detector) {
    const [r] = await detector.detect(v)
    return r?.rawValue ?? null
  }
  lienzo ??= document.createElement('canvas')
  // Se lee en una version reducida: es mas rapido y igual de confiable.
  const escala = Math.min(1, 640 / v.videoWidth)
  lienzo.width = Math.round(v.videoWidth * escala)
  lienzo.height = Math.round(v.videoHeight * escala)
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height)
  const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height)
  return (
    jsQR(datos.data, datos.width, datos.height, {
      inversionAttempts: 'dontInvert',
    })?.data ?? null
  )
}

let ultimoIntento = 0
function bucle(t) {
  animacion = requestAnimationFrame(bucle)
  if (t - ultimoIntento < 180) return
  ultimoIntento = t
  leerCuadro()
    .then((texto) => {
      if (!texto) return
      const codigo = codigoDesdeQR(texto)
      if (codigo) {
        navigator.vibrate?.(80)
        apagar()
        emit('leido', codigo)
      } else {
        aviso.value = 'Ese QR no es de un pedido de CitX.'
      }
    })
    .catch(() => {})
}

async function encender() {
  apagar()
  problema.value = ''
  aviso.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    problema.value =
      'Este navegador no permite usar la cámara. Escribí el código a mano.'
    return
  }
  try {
    await prepararLector()
    flujo = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: trasera.value ? 'environment' : 'user',
        width: { ideal: 1280 },
      },
      audio: false,
    })
    await nextTick()
    video.value.srcObject = flujo
    await video.value.play()
    animacion = requestAnimationFrame(bucle)
  } catch {
    problema.value =
      'No pudimos usar la cámara. Revisá que el navegador tenga permiso, o escribí el código a mano.'
  }
}

function cambiarCamara() {
  trasera.value = !trasera.value
  encender()
}

function usarManual() {
  const codigo = codigoDesdeQR(manual.value)
  if (!codigo) {
    aviso.value = 'El código son 5 letras o números, por ejemplo K7M2Q.'
    return
  }
  apagar()
  emit('leido', codigo)
}

function cerrar() {
  apagar()
  emit('cerrar')
}

watch(
  () => props.abierto,
  (abierto) => {
    if (abierto) {
      manual.value = ''
      encender()
    } else {
      apagar()
    }
  }
)

onUnmounted(apagar)
</script>

<template>
  <Dialogo
    :abierto="abierto"
    titulo="Escanear el QR del pedido"
    descripcion="Apuntá la cámara al código QR que muestra la persona."
    modo="centro"
    ancho="30rem"
    @cerrar="cerrar"
  >
    <p v-if="problema" class="nota nota--aviso">
      <CircleAlert :size="18" aria-hidden="true" /><span>{{ problema }}</span>
    </p>
    <div v-else class="camara">
      <video ref="video" playsinline muted />
      <span class="camara__marco" aria-hidden="true" />
      <span class="camara__linea" aria-hidden="true" />
    </div>
    <p v-if="aviso" class="aviso" role="status">{{ aviso }}</p>

    <form class="manual" novalidate @submit.prevent="usarManual">
      <label class="campo__etiqueta" for="codigo-manual"
        ><Keyboard :size="16" aria-hidden="true" /> O escribí el código</label
      >
      <div class="manual__fila">
        <input
          id="codigo-manual"
          v-model="manual"
          class="entrada manual__entrada"
          autocomplete="off"
          autocapitalize="characters"
          maxlength="12"
          placeholder="K7M2Q"
        />
        <button type="submit" class="boton boton--accion">Buscar</button>
      </div>
    </form>

    <template #pie>
      <button
        type="button"
        class="boton boton--contorno"
        @click="cambiarCamara"
      >
        <RefreshCw :size="18" aria-hidden="true" /> Cambiar cámara
      </button>
      <button type="button" class="boton boton--contorno" @click="cerrar">
        Cerrar
      </button>
    </template>
  </Dialogo>
</template>

<style scoped>
.camara {
  position: relative;
  border-radius: var(--radio-md);
  overflow: hidden;
  background: #000000;
  aspect-ratio: 1;
}

.camara video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camara__marco {
  position: absolute;
  inset: 16%;
  border: 3px solid #ffffff;
  border-radius: var(--radio-lg);
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.35);
}

.camara__linea {
  position: absolute;
  left: 18%;
  right: 18%;
  top: 18%;
  height: 2px;
  background: var(--turquesa-300);
  box-shadow: 0 0 8px var(--turquesa-300);
  animation: barrido calc(2s * var(--mov)) ease-in-out infinite alternate;
}

@keyframes barrido {
  to {
    top: 82%;
  }
}

.aviso {
  margin-top: var(--e-3);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--aviso);
}

.manual {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  margin-top: var(--e-4);
}

.manual .campo__etiqueta {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
}

.manual__fila {
  display: flex;
  gap: var(--e-2);
}

.manual__entrada {
  flex: 1;
  font-family: var(--fuente-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
