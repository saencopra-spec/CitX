<script setup>
import { nextTick, onUnmounted, ref } from 'vue'
import {
  ImagePlus,
  Trash2,
  CircleAlert,
  Camera,
  Upload,
  RefreshCw,
} from 'lucide-vue-next'
import Dialogo from '@/components/avisos/Dialogo.vue'
import { comprimirImagen } from '@/lib/imagenes'

/**
 * Elegir una foto o tomarla con la camara, comprimirla en el navegador y
 * mostrar como queda.
 * - En celular, "Tomar foto" abre la camara del telefono directamente.
 * - En computadora, abre una ventana con la camara web.
 */
const props = defineProps({
  id: { type: String, required: true },
  etiqueta: { type: String, default: 'Foto' },
  error: { type: String, default: '' },
})
const modelo = defineModel({ type: String, default: null })

const procesando = ref(false)
const problema = ref('')
const peso = ref(0)

const esTactil =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches
const hayCamara =
  typeof navigator !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia)

async function procesar(archivo) {
  problema.value = ''
  procesando.value = true
  try {
    const { dataUrl, bytes } = await comprimirImagen(archivo)
    modelo.value = dataUrl
    peso.value = bytes
  } catch (err) {
    problema.value = err.message
  } finally {
    procesando.value = false
  }
}

function alElegir(e) {
  const archivo = e.target.files?.[0]
  e.target.value = ''
  if (archivo) procesar(archivo)
}

// --- Camara web en computadora ---
const camaraAbierta = ref(false)
const video = ref(null)
const problemaCamara = ref('')
const usandoFrontal = ref(false)
let flujo = null

async function encender() {
  apagar()
  problemaCamara.value = ''
  try {
    flujo = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: usandoFrontal.value ? 'user' : 'environment',
        width: { ideal: 1280 },
      },
      audio: false,
    })
    await nextTick()
    if (video.value) {
      video.value.srcObject = flujo
      await video.value.play()
    }
  } catch {
    problemaCamara.value =
      'No pudimos usar la cámara. Revisá que el navegador tenga permiso, o elegí una foto guardada.'
  }
}

function apagar() {
  flujo?.getTracks().forEach((t) => t.stop())
  flujo = null
}

async function abrirCamara() {
  camaraAbierta.value = true
  await encender()
}

function cerrarCamara() {
  apagar()
  camaraAbierta.value = false
}

function cambiarCamara() {
  usandoFrontal.value = !usandoFrontal.value
  encender()
}

function capturar() {
  const v = video.value
  if (!v?.videoWidth) return
  const lienzo = document.createElement('canvas')
  lienzo.width = v.videoWidth
  lienzo.height = v.videoHeight
  lienzo.getContext('2d').drawImage(v, 0, 0)
  lienzo.toBlob(
    (blob) => {
      if (blob) procesar(new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
      cerrarCamara()
    },
    'image/jpeg',
    0.92
  )
}

onUnmounted(apagar)
</script>

<template>
  <div class="campo">
    <span :id="`${props.id}-etiqueta`" class="campo__etiqueta">{{
      etiqueta
    }}</span>
    <div class="foto">
      <div class="foto__vista">
        <img
          v-if="modelo"
          :src="modelo"
          alt="Vista previa de la foto elegida"
        />
        <ImagePlus v-else :size="28" aria-hidden="true" />
      </div>
      <div class="foto__acciones">
        <!-- Tomar foto: en celular abre la camara; en computadora, la ventana de camara web -->
        <template v-if="esTactil">
          <label
            class="boton boton--accion boton--pequeno"
            :for="`${props.id}-camara`"
          >
            <Camera :size="16" aria-hidden="true" /> Tomar foto
          </label>
          <input
            :id="`${props.id}-camara`"
            type="file"
            accept="image/*"
            capture="environment"
            class="solo-lectores"
            :aria-labelledby="`${props.id}-etiqueta`"
            @change="alElegir"
          />
        </template>
        <button
          v-else-if="hayCamara"
          type="button"
          class="boton boton--accion boton--pequeno"
          @click="abrirCamara"
        >
          <Camera :size="16" aria-hidden="true" /> Tomar foto
        </button>

        <label class="boton boton--contorno boton--pequeno" :for="props.id">
          <Upload :size="16" aria-hidden="true" />
          {{
            procesando
              ? 'Preparando foto...'
              : modelo
                ? 'Cambiar foto'
                : 'Elegir foto'
          }}
        </label>
        <input
          :id="props.id"
          type="file"
          accept="image/*"
          class="solo-lectores"
          :aria-labelledby="`${props.id}-etiqueta`"
          @change="alElegir"
        />
        <button
          v-if="modelo"
          type="button"
          class="boton boton--texto boton--pequeno"
          @click="modelo = null"
        >
          <Trash2 :size="16" aria-hidden="true" /> Quitar
        </button>
        <p class="campo__ayuda">
          {{
            peso
              ? `Lista: ${Math.round(peso / 1024)} KB.`
              : 'Se achica sola para que suba rápido.'
          }}
        </p>
      </div>
    </div>
    <p v-if="problema || error" class="campo__error">
      <CircleAlert :size="16" aria-hidden="true" /> {{ problema || error }}
    </p>

    <Dialogo
      :abierto="camaraAbierta"
      titulo="Tomar foto"
      descripcion="Acomodá el objeto en el recuadro y tocá «Capturar»."
      modo="centro"
      ancho="34rem"
      encima
      @cerrar="cerrarCamara"
    >
      <p v-if="problemaCamara" class="nota nota--aviso">
        <CircleAlert :size="18" aria-hidden="true" /><span>{{
          problemaCamara
        }}</span>
      </p>
      <div v-else class="camara">
        <video ref="video" playsinline muted />
      </div>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="cambiarCamara"
        >
          <RefreshCw :size="18" aria-hidden="true" /> Cambiar cámara
        </button>
        <button
          type="button"
          class="boton boton--accion"
          :disabled="Boolean(problemaCamara)"
          @click="capturar"
        >
          <Camera :size="18" aria-hidden="true" /> Capturar
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.foto {
  display: flex;
  gap: var(--e-4);
  align-items: center;
}

.foto__vista {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 96px;
  height: 72px;
  border-radius: var(--radio-md);
  background: var(--superficie-3);
  color: var(--texto-tenue);
  overflow: hidden;
}

.foto__vista img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foto__acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
}

.foto__acciones .campo__ayuda {
  width: 100%;
}

.foto__acciones label:has(+ input:focus-visible) {
  outline: 3px solid var(--foco);
  outline-offset: 2px;
}

.camara {
  border-radius: var(--radio-md);
  overflow: hidden;
  background: #000000;
  aspect-ratio: 4 / 3;
}

.camara video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
