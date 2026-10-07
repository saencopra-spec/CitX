<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import gsap from 'gsap'
import { Plus, Minus, Maximize } from 'lucide-vue-next'
import { LIENZO, CATEGORIAS } from '@compartido/campus.js'
import { sinMovimiento } from '@/lib/movimiento'

/**
 * Mapa del campus sobre la ilustracion oficial del CIT, con pines propios
 * que se pueden tocar.
 * - Rueda del mouse o botones para acercar y alejar.
 * - Arrastrar para moverse; con dos dedos se hace zoom (pellizco).
 * - Cada pin se puede enfocar con Tab y abrir con Enter.
 * - En modo `colocar`, tocar el mapa emite la posicion (para el panel).
 */
const props = defineProps({
  lugares: { type: Array, default: () => [] },
  seleccionada: { type: String, default: null },
  /** Si se da, los pines que no estan aqui se ven apagados. */
  resaltadas: { type: Set, default: null },
  favoritos: { type: Array, default: () => [] },
  /** Para el panel: tocar el mapa elige una posicion. */
  colocar: { type: Boolean, default: false },
  /** Muestra siempre el nombre de cada lugar. */
  conNombres: { type: Boolean, default: false },
})
const emit = defineEmits(['elegir', 'colocar'])

const MIN = 1
const MAX = 3
const svg = ref(null)
const vista = reactive({ x: 0, y: 0, k: 1 })
let animacion = null

const transformacion = computed(
  () => `translate(${vista.x} ${vista.y}) scale(${vista.k})`
)
/** Los pines crecen menos que el mapa al hacer zoom, para no tapar todo. */
const escalaPin = computed(() => 1 / Math.max(1, vista.k * 0.75))
const mostrarNombres = computed(() => props.conNombres || vista.k >= 1.9)

/** Pines grandes como en el mapa oficial: preescolar, primaria y secundaria. */
const GRANDES = [2, 4, 8]

const ordenados = computed(() =>
  [...props.lugares].sort((a, b) => {
    // El seleccionado se dibuja al final para que quede encima.
    if (a.clave === props.seleccionada) return 1
    if (b.clave === props.seleccionada) return -1
    return a.y - b.y
  })
)

function radio(l) {
  return GRANDES.includes(l.numero) ? 21 : 15
}

/** Silueta de pin con la punta en (0,0) y la cabeza de radio R arriba. */
function forma(R) {
  const c = R * 1.75
  return `M0 0 C${-R * 0.35} ${-R * 0.85} ${-R} ${-R * 1.1} ${-R} ${-c} A${R} ${R} 0 1 1 ${R} ${-c} C${R} ${-R * 1.1} ${R * 0.35} ${-R * 0.85} 0 0 Z`
}

function color(l) {
  return CATEGORIAS[l.categoria]?.color ?? '#5b6573'
}

function limitar(v) {
  const margen = 240
  return {
    k: v.k,
    x: Math.min(
      margen,
      Math.max(LIENZO.ancho - LIENZO.ancho * v.k - margen, v.x)
    ),
    y: Math.min(
      margen,
      Math.max(LIENZO.alto - LIENZO.alto * v.k - margen, v.y)
    ),
  }
}

function aplicar(destino, animar = false) {
  const final = limitar({ ...vista, ...destino })
  animacion?.kill()
  if (animar && !sinMovimiento()) {
    animacion = gsap.to(vista, {
      ...final,
      duration: 0.7,
      ease: 'power3.inOut',
    })
  } else {
    Object.assign(vista, final)
  }
}

/** Pasa coordenadas de pantalla a coordenadas del lienzo SVG. */
function aLienzo(clientX, clientY) {
  const ctm = svg.value?.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

/** Coordenadas sobre la ilustracion (descontando el zoom y el desplazamiento). */
function aMapa(clientX, clientY) {
  const p = aLienzo(clientX, clientY)
  return { x: (p.x - vista.x) / vista.k, y: (p.y - vista.y) / vista.k }
}

function zoomEn(punto, factor, animar = false) {
  const k = Math.min(MAX, Math.max(MIN, vista.k * factor))
  const r = k / vista.k
  aplicar(
    {
      k,
      x: punto.x - (punto.x - vista.x) * r,
      y: punto.y - (punto.y - vista.y) * r,
    },
    animar
  )
}

const centroLienzo = () => ({ x: LIENZO.ancho / 2, y: LIENZO.alto / 2 })
const acercar = () => zoomEn(centroLienzo(), 1.5, true)
const alejar = () => zoomEn(centroLienzo(), 1 / 1.5, true)
const restablecer = () => aplicar({ x: 0, y: 0, k: 1 }, true)

/** Acerca el mapa a un lugar y lo deja en la parte que no tapa la hoja de informacion. */
function enfocar(clave) {
  const lugar = props.lugares.find((l) => l.clave === clave)
  if (!lugar || !svg.value) return
  const angosto = window.matchMedia('(max-width: 767px)').matches
  const k = angosto ? 2.6 : 2.1
  const marco = svg.value.getBoundingClientRect()
  const objetivo = aLienzo(
    marco.left + marco.width * (angosto ? 0.5 : 0.38),
    marco.top + marco.height * (angosto ? 0.26 : 0.5)
  )
  aplicar(
    { k, x: objetivo.x - lugar.x * k, y: objetivo.y - (lugar.y - 12) * k },
    true
  )
}

defineExpose({ enfocar, restablecer })

// --- Gestos con puntero (mouse, dedo o lapiz) ---
const punteros = new Map()
let inicioArrastre = null
let distanciaInicial = 0
let kInicial = 1
let seMovio = false

function alPresionar(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY })
  seMovio = false
  animacion?.kill()
  if (punteros.size === 1) {
    inicioArrastre = { vx: vista.x, vy: vista.y, px: e.clientX, py: e.clientY }
  } else if (punteros.size === 2) {
    const [a, b] = [...punteros.values()]
    distanciaInicial = Math.hypot(a.x - b.x, a.y - b.y) || 1
    kInicial = vista.k
  }
}

function alMover(e) {
  if (!punteros.has(e.pointerId)) return
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (punteros.size === 1 && inicioArrastre) {
    const dx = e.clientX - inicioArrastre.px
    const dy = e.clientY - inicioArrastre.py
    if (!seMovio && Math.hypot(dx, dy) < 6) return
    if (!seMovio) {
      seMovio = true
      svg.value.setPointerCapture?.(e.pointerId)
    }
    // ctm.a: cuantos pixeles de pantalla mide una unidad del lienzo.
    const escala = svg.value.getScreenCTM()?.a || 1
    aplicar({
      x: inicioArrastre.vx + dx / escala,
      y: inicioArrastre.vy + dy / escala,
    })
  } else if (punteros.size === 2) {
    seMovio = true
    const [a, b] = [...punteros.values()]
    const distancia = Math.hypot(a.x - b.x, a.y - b.y)
    const medio = aLienzo((a.x + b.x) / 2, (a.y + b.y) / 2)
    const k = Math.min(
      MAX,
      Math.max(MIN, (kInicial * distancia) / distanciaInicial)
    )
    zoomEn(medio, k / vista.k)
  }
}

function alSoltar(e) {
  const eraToque = punteros.size === 1 && !seMovio && punteros.has(e.pointerId)
  punteros.delete(e.pointerId)
  if (props.colocar && eraToque && e.type === 'pointerup') {
    const p = aMapa(e.clientX, e.clientY)
    emit('colocar', {
      x: Math.round(Math.min(LIENZO.ancho, Math.max(0, p.x))),
      y: Math.round(Math.min(LIENZO.alto, Math.max(0, p.y))),
    })
  }
  if (punteros.size === 1) {
    const [p] = [...punteros.values()]
    inicioArrastre = { vx: vista.x, vy: vista.y, px: p.x, py: p.y }
  } else if (punteros.size === 0) {
    inicioArrastre = null
  }
}

function alRueda(e) {
  e.preventDefault()
  zoomEn(aLienzo(e.clientX, e.clientY), Math.exp(-e.deltaY * 0.0018))
}

function tocar(clave) {
  if (seMovio || props.colocar) return
  emit('elegir', clave)
}

function etiquetaAccesible(l) {
  const partes = [l.numero ? `${l.numero}, ${l.nombre}` : l.nombre]
  if (l.restringido) partes.push('acceso restringido')
  if (props.favoritos.includes(l.clave)) partes.push('favorito')
  return partes.join(', ')
}

function apagado(clave) {
  return props.resaltadas !== null && !props.resaltadas.has(clave)
}

let alAjustarTamano = null
onMounted(() => {
  svg.value.addEventListener('wheel', alRueda, { passive: false })
  alAjustarTamano = () => aplicar({})
  window.addEventListener('resize', alAjustarTamano)
})
onUnmounted(() => {
  svg.value?.removeEventListener('wheel', alRueda)
  window.removeEventListener('resize', alAjustarTamano)
  animacion?.kill()
})
</script>

<template>
  <div class="mapa" :class="{ 'mapa--colocar': colocar }">
    <svg
      ref="svg"
      class="mapa__lienzo"
      :viewBox="`0 0 ${LIENZO.ancho} ${LIENZO.alto}`"
      role="group"
      aria-label="Mapa del Complejo Educativo CIT. Usá Tab para recorrer los lugares y Enter para ver uno."
      @pointerdown="alPresionar"
      @pointermove="alMover"
      @pointerup="alSoltar"
      @pointercancel="alSoltar"
      @pointerleave="alSoltar"
    >
      <defs>
        <filter id="sombra-pin" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="1.5"
            stdDeviation="1.5"
            flood-color="#0d1117"
            flood-opacity="0.35"
          />
        </filter>
        <pattern
          id="rayado-pin"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="5"
            stroke="#ffffff"
            stroke-width="1.6"
            opacity="0.6"
          />
        </pattern>
      </defs>

      <g :transform="transformacion">
        <image
          href="/mapa/mapa-cit.webp"
          :width="LIENZO.ancho"
          :height="LIENZO.alto"
          class="mapa__fondo"
        />

        <g
          v-for="l in ordenados"
          :key="l.clave"
          class="pin"
          :class="{
            'es-seleccionado': seleccionada === l.clave,
            'es-apagado': apagado(l.clave),
          }"
          :transform="`translate(${l.x} ${l.y}) scale(${escalaPin * (seleccionada === l.clave ? 1.25 : 1)})`"
          role="button"
          tabindex="0"
          :aria-label="etiquetaAccesible(l)"
          :aria-pressed="seleccionada === l.clave"
          @click="tocar(l.clave)"
          @keydown.enter.prevent="emit('elegir', l.clave)"
          @keydown.space.prevent="emit('elegir', l.clave)"
        >
          <path
            :d="forma(radio(l))"
            :fill="color(l)"
            class="pin__forma"
            filter="url(#sombra-pin)"
          />
          <path
            v-if="l.restringido"
            :d="forma(radio(l))"
            fill="url(#rayado-pin)"
            class="pin__rayado"
          />
          <circle
            :cy="-radio(l) * 1.75"
            :r="radio(l) * 0.68"
            class="pin__centro"
          />
          <text
            v-if="l.numero"
            :y="-radio(l) * 1.75"
            class="pin__numero"
            :style="{ fontSize: `${radio(l) * 0.82}px` }"
          >
            {{ l.numero }}
          </text>
          <!-- La enfermeria lleva una cruz en vez de numero -->
          <path
            v-else
            :transform="`translate(0 ${-radio(l) * 1.75})`"
            d="M-2.2 -6 H2.2 V-2.2 H6 V2.2 H2.2 V6 H-2.2 V2.2 H-6 V-2.2 H-2.2 Z"
            :fill="color(l)"
          />
          <g
            v-if="l.restringido"
            :transform="`translate(${radio(l) * 0.8} ${-radio(l) * 2.55})`"
            class="pin__candado"
          >
            <circle r="6.5" />
            <rect x="-3" y="-0.5" width="6" height="4.5" rx="0.8" />
            <path d="M-1.8 -0.5 V-2.2 a1.8 1.8 0 0 1 3.6 0 V-0.5" />
          </g>
          <g
            v-if="favoritos.includes(l.clave)"
            :transform="`translate(${-radio(l) * 0.85} ${-radio(l) * 2.55})`"
            class="pin__favorito"
          >
            <circle r="6.5" />
            <path
              transform="scale(0.42) translate(-12 -12.5)"
              d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"
            />
          </g>
          <text
            v-if="mostrarNombres || seleccionada === l.clave"
            :y="5"
            class="pin__nombre"
          >
            {{ l.nombre }}
          </text>
        </g>
      </g>
    </svg>

    <div class="mapa__controles" role="group" aria-label="Zoom del mapa">
      <button
        type="button"
        class="control"
        aria-label="Acercar"
        @click="acercar"
      >
        <Plus :size="20" aria-hidden="true" />
      </button>
      <button type="button" class="control" aria-label="Alejar" @click="alejar">
        <Minus :size="20" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="control"
        aria-label="Ver todo el mapa"
        @click="restablecer"
      >
        <Maximize :size="18" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.mapa {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
  border-radius: inherit;
}

.mapa__lienzo {
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
}

.mapa__lienzo:active {
  cursor: grabbing;
}

.mapa--colocar .mapa__lienzo {
  cursor: crosshair;
}

.mapa__fondo {
  pointer-events: none;
}

.pin {
  cursor: pointer;
  outline: none;
  transition: opacity var(--dur-media) var(--curva);
}

.pin__forma {
  stroke: #ffffff;
  stroke-width: 2;
}

.pin__rayado {
  pointer-events: none;
}

.pin__centro {
  fill: #ffffff;
}

.pin__numero {
  fill: #15234a;
  font-family: var(--fuente-base);
  font-weight: 800;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
}

.pin:hover .pin__forma {
  filter: brightness(1.1);
}

.pin:focus-visible .pin__forma,
.es-seleccionado .pin__forma {
  stroke: #15234a;
  stroke-width: 3;
}

.es-apagado {
  opacity: 0.22;
}

.pin__candado circle {
  fill: #c42b2b;
  stroke: #ffffff;
  stroke-width: 1.5;
}

.pin__candado rect {
  fill: #ffffff;
}

.pin__candado path {
  fill: none;
  stroke: #ffffff;
  stroke-width: 1.3;
}

.pin__favorito circle {
  fill: #e0a33f;
  stroke: #ffffff;
  stroke-width: 1.5;
}

.pin__favorito path {
  fill: #ffffff;
}

.pin__nombre {
  fill: #15234a;
  font-family: var(--fuente-base);
  font-size: 11px;
  font-weight: 800;
  text-anchor: middle;
  dominant-baseline: hanging;
  paint-order: stroke;
  stroke: #ffffff;
  stroke-width: 3.5px;
  stroke-linejoin: round;
  pointer-events: none;
}

.mapa__controles {
  position: absolute;
  right: var(--e-3);
  bottom: var(--e-3);
  display: flex;
  flex-direction: column;
  border-radius: var(--radio-md);
  background: var(--fondo-elevado);
  box-shadow: var(--sombra-3);
  overflow: hidden;
}

.control {
  display: grid;
  place-items: center;
  width: var(--objetivo-tactil);
  height: var(--objetivo-tactil);
  color: var(--texto);
}

.control + .control {
  border-top: 1px solid var(--borde);
}

.control:hover {
  background: var(--superficie-hover);
}
</style>
