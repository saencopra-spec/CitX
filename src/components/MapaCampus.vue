<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import gsap from 'gsap'
import { Plus, Minus, Maximize } from 'lucide-vue-next'
import { ZONAS, LIENZO, centroDe, cajaDe } from '@/datos/campus'
import { sinMovimiento } from '@/lib/movimiento'

/**
 * Mapa del campus dibujado en SVG.
 * - Rueda del mouse o botones para acercar y alejar.
 * - Arrastrar para moverse; con dos dedos se hace zoom (pellizco).
 * - Cada zona se puede tocar, o enfocar con Tab y abrir con Enter.
 */
const props = defineProps({
  /** clave -> { nombre, categoria, restringido } */
  lugares: { type: Object, default: () => ({}) },
  seleccionada: { type: String, default: null },
  /** Si se da, las zonas que no estan aqui se ven apagadas (busqueda o filtro). */
  resaltadas: { type: Set, default: null },
  favoritos: { type: Array, default: () => [] },
})
const emit = defineEmits(['elegir'])

const MIN = 1
const MAX = 5
const svg = ref(null)
const vista = reactive({ x: 0, y: 0, k: 1 })
let animacion = null

const transformacion = computed(
  () => `translate(${vista.x} ${vista.y}) scale(${vista.k})`
)

/** Evita que el mapa se vaya del todo fuera de la pantalla. */
function limitar(v) {
  const margen = 80
  const minX = LIENZO.ancho - LIENZO.ancho * v.k - margen
  const minY = LIENZO.alto - LIENZO.alto * v.k - margen
  return {
    k: v.k,
    x: Math.min(margen, Math.max(minX, v.x)),
    y: Math.min(margen, Math.max(minY, v.y)),
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
  const ctm = svg.value.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
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

function acercar() {
  zoomEn({ x: LIENZO.ancho / 2, y: LIENZO.alto / 2 }, 1.5, true)
}

function alejar() {
  zoomEn({ x: LIENZO.ancho / 2, y: LIENZO.alto / 2 }, 1 / 1.5, true)
}

function restablecer() {
  aplicar({ x: 0, y: 0, k: 1 }, true)
}

/** Acerca el mapa a una zona y la deja un poco arriba del centro (la hoja inferior tapa abajo). */
function enfocar(clave) {
  const zona = ZONAS.find((z) => z.clave === clave)
  if (!zona) return
  const caja = cajaDe(zona)
  const centro = centroDe(zona)
  const k = Math.min(
    3.2,
    Math.max(
      1.6,
      Math.min(LIENZO.ancho / (caja.w * 3), LIENZO.alto / (caja.h * 3))
    )
  )
  const angosto = window.matchMedia('(max-width: 767px)').matches
  const objetivoY = LIENZO.alto * (angosto ? 0.36 : 0.5)
  aplicar(
    { k, x: LIENZO.ancho / 2 - centro.x * k, y: objetivoY - centro.y * k },
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
  punteros.delete(e.pointerId)
  if (punteros.size === 1) {
    const [p] = [...punteros.values()]
    inicioArrastre = { vx: vista.x, vy: vista.y, px: p.x, py: p.y }
  } else if (punteros.size === 0) {
    inicioArrastre = null
  }
}

function alRueda(e) {
  e.preventDefault()
  const factor = Math.exp(-e.deltaY * 0.0018)
  zoomEn(aLienzo(e.clientX, e.clientY), factor)
}

function tocarZona(clave) {
  if (seMovio) return
  emit('elegir', clave)
}

function infoDe(clave) {
  return props.lugares[clave] ?? {}
}

function etiquetaAccesible(zona) {
  const info = infoDe(zona.clave)
  const partes = [info.nombre ?? zona.etiqueta]
  if (info.restringido) partes.push('acceso restringido')
  if (props.favoritos.includes(zona.clave)) partes.push('favorito')
  return partes.join(', ')
}

function apagada(clave) {
  return props.resaltadas !== null && !props.resaltadas.has(clave)
}

// Arboles del bosque y del cacaotal: posiciones fijas para que no cambien al recargar.
function arboles(x0, y0, ancho, alto, columnas, filas, radio) {
  const lista = []
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      const desfase = f % 2 ? 0.5 : 0
      lista.push({
        x: x0 + ((c + 0.5 + desfase) * ancho) / (columnas + 0.5),
        y: y0 + ((f + 0.5) * alto) / filas,
        r: radio * (0.8 + ((c * 7 + f * 13) % 5) / 10),
      })
    }
  }
  return lista
}
const arbolesBosque = arboles(60, 50, 250, 130, 7, 4, 15)
const arbolesCacao = arboles(362, 58, 186, 120, 6, 4, 9)

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
  <div class="mapa">
    <svg
      ref="svg"
      class="mapa__lienzo"
      :viewBox="`0 0 ${LIENZO.ancho} ${LIENZO.alto}`"
      role="group"
      aria-label="Mapa del campus. Usá Tab para recorrer los lugares y Enter para ver uno."
      @pointerdown="alPresionar"
      @pointermove="alMover"
      @pointerup="alSoltar"
      @pointercancel="alSoltar"
      @pointerleave="alSoltar"
    >
      <defs>
        <pattern
          id="rayado"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="12" height="12" fill="transparent" />
          <line x1="0" y1="0" x2="0" y2="12" class="rayado__linea" />
        </pattern>
      </defs>

      <g :transform="transformacion">
        <rect :width="LIENZO.ancho" :height="LIENZO.alto" class="suelo" />

        <!-- Calle de acceso y caminos internos -->
        <rect x="0" y="690" :width="LIENZO.ancho" height="30" class="calle" />
        <path d="M20 690 H980" class="calle__linea" />
        <path
          d="M30 214 H975 M30 510 H975 M202 214 V510 M478 214 V630 M672 214 V510 M805 214 V690"
          class="camino"
        />

        <!-- Zonas -->
        <g
          v-for="zona in ZONAS"
          :key="zona.clave"
          class="zona"
          :class="{
            'es-seleccionada': seleccionada === zona.clave,
            'es-apagada': apagada(zona.clave),
          }"
          :data-cat="infoDe(zona.clave).categoria ?? 'otro'"
          role="button"
          tabindex="0"
          :aria-label="etiquetaAccesible(zona)"
          :aria-pressed="seleccionada === zona.clave"
          @click="tocarZona(zona.clave)"
          @keydown.enter.prevent="emit('elegir', zona.clave)"
          @keydown.space.prevent="emit('elegir', zona.clave)"
        >
          <path v-if="zona.d" :d="zona.d" class="zona__forma" />
          <rect
            v-else
            :x="zona.x"
            :y="zona.y"
            :width="zona.w"
            :height="zona.h"
            :rx="zona.r"
            class="zona__forma"
          />

          <!-- Detalles que ayudan a reconocer cada lugar -->
          <g v-if="zona.clave === 'bosque'" class="detalle" aria-hidden="true">
            <circle
              v-for="(a, i) in arbolesBosque"
              :key="i"
              :cx="a.x"
              :cy="a.y"
              :r="a.r"
              class="arbol"
            />
          </g>
          <g
            v-else-if="zona.clave === 'cacaotal'"
            class="detalle"
            aria-hidden="true"
          >
            <circle
              v-for="(a, i) in arbolesCacao"
              :key="i"
              :cx="a.x"
              :cy="a.y"
              :r="a.r"
              class="arbol arbol--cacao"
            />
          </g>
          <g
            v-else-if="zona.clave === 'armonia'"
            class="detalle"
            aria-hidden="true"
          >
            <rect
              v-for="n in 6"
              :key="n"
              :x="596"
              :y="50 + n * 20"
              width="168"
              height="9"
              rx="4"
              class="surco"
            />
          </g>
          <g
            v-else-if="zona.clave === 'piscina'"
            class="detalle"
            aria-hidden="true"
          >
            <rect x="832" y="410" width="126" height="60" rx="6" class="agua" />
            <path
              d="M832 425 H958 M832 440 H958 M832 455 H958"
              class="carril"
            />
          </g>
          <g
            v-else-if="zona.clave === 'canchas'"
            class="detalle"
            aria-hidden="true"
          >
            <rect
              x="830"
              y="245"
              width="130"
              height="120"
              rx="2"
              class="linea-cancha"
            />
            <path d="M830 305 H960" class="linea-cancha" />
            <circle cx="895" cy="305" r="16" class="linea-cancha" />
          </g>
          <g
            v-else-if="zona.clave === 'parqueo'"
            class="detalle"
            aria-hidden="true"
          >
            <path
              v-for="n in 7"
              :key="n"
              :d="`M${48 + n * 28} 545 v38 M${48 + n * 28} 627 v38`"
              class="linea-parqueo"
            />
          </g>
          <g
            v-else-if="zona.clave === 'plaza'"
            class="detalle"
            aria-hidden="true"
          >
            <circle cx="575" cy="318" r="30" class="fuente" />
          </g>

          <!-- Areas restringidas: rayado y candado -->
          <template v-if="infoDe(zona.clave).restringido">
            <path
              v-if="zona.d"
              :d="zona.d"
              class="zona__rayado"
              aria-hidden="true"
            />
            <rect
              v-else
              :x="zona.x"
              :y="zona.y"
              :width="zona.w"
              :height="zona.h"
              :rx="zona.r"
              class="zona__rayado"
              aria-hidden="true"
            />
          </template>

          <text
            :x="centroDe(zona).x"
            :y="centroDe(zona).y"
            class="zona__etiqueta"
            aria-hidden="true"
          >
            {{ zona.etiqueta }}
          </text>
          <g
            v-if="infoDe(zona.clave).restringido"
            :transform="`translate(${cajaDe(zona).x + 8} ${cajaDe(zona).y + 8})`"
            class="candado"
            aria-hidden="true"
          >
            <rect width="22" height="22" rx="6" class="candado__fondo" />
            <rect
              x="6"
              y="10"
              width="10"
              height="8"
              rx="1.5"
              class="candado__cuerpo"
            />
            <path d="M8 10 V7.5 a3 3 0 0 1 6 0 V10" class="candado__arco" />
          </g>

          <g v-if="favoritos.includes(zona.clave)" aria-hidden="true">
            <circle
              :cx="cajaDe(zona).x + cajaDe(zona).w - 12"
              :cy="cajaDe(zona).y + 12"
              r="10"
              class="favorito"
            />
            <path
              :transform="`translate(${cajaDe(zona).x + cajaDe(zona).w - 18} ${cajaDe(zona).y + 6}) scale(0.5)`"
              d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"
              class="favorito__estrella"
            />
          </g>
        </g>

        <!-- Indicador de norte y entrada -->
        <g class="norte" aria-hidden="true" transform="translate(965 22)">
          <path d="M0 -12 L7 8 L0 3 L-7 8 Z" />
          <text y="24">N</text>
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
  background: var(--mapa-suelo);
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

.suelo {
  fill: var(--mapa-suelo);
}

.calle {
  fill: var(--gris-600);
}

:root[data-tema='oscuro'] .calle {
  fill: #2a313b;
}

.calle__linea {
  stroke: #f5d36b;
  stroke-width: 2;
  stroke-dasharray: 18 14;
}

.camino {
  fill: none;
  stroke: var(--mapa-camino);
  stroke-width: 16;
  stroke-linecap: round;
}

.zona {
  cursor: pointer;
  outline: none;
}

.zona__forma {
  fill: var(--mapa-otro);
  stroke: var(--mapa-borde);
  stroke-width: 3;
  transition:
    stroke var(--dur-media) var(--curva),
    stroke-width var(--dur-media) var(--curva),
    filter var(--dur-media) var(--curva);
}

.zona[data-cat='naturaleza'] .zona__forma {
  fill: var(--mapa-naturaleza);
}
.zona[data-cat='academico'] .zona__forma {
  fill: var(--mapa-academico);
}
.zona[data-cat='servicios'] .zona__forma {
  fill: var(--mapa-servicios);
}
.zona[data-cat='alimentacion'] .zona__forma {
  fill: var(--mapa-alimentacion);
}
.zona[data-cat='deporte'] .zona__forma {
  fill: var(--mapa-deporte);
}
.zona[data-cat='administracion'] .zona__forma {
  fill: var(--mapa-administracion);
}
.zona[data-cat='acceso'] .zona__forma {
  fill: var(--mapa-acceso);
}

.zona:hover .zona__forma {
  filter: brightness(0.96);
}

.zona:focus-visible .zona__forma,
.es-seleccionada .zona__forma {
  stroke: var(--mapa-seleccion);
  stroke-width: 6;
}

.zona:focus-visible .zona__forma {
  stroke-dasharray: 10 6;
}

.zona {
  transition: opacity var(--dur-media) var(--curva);
}

.es-apagada {
  opacity: 0.28;
}

.zona__rayado {
  fill: url(#rayado);
  pointer-events: none;
}

:deep(.rayado__linea) {
  stroke: var(--mapa-rayado);
  stroke-width: 3;
  opacity: 0.55;
}

.zona__etiqueta {
  fill: var(--mapa-texto);
  font-family: var(--fuente-base);
  font-size: 15px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
  paint-order: stroke;
  stroke: var(--mapa-suelo);
  stroke-width: 4px;
  stroke-linejoin: round;
  pointer-events: none;
}

.candado__fondo {
  fill: var(--mapa-rayado);
}

.candado__cuerpo {
  fill: #ffffff;
}

.candado__arco {
  fill: none;
  stroke: #ffffff;
  stroke-width: 2;
}

:root[data-tema='oscuro'] .candado__cuerpo {
  fill: var(--gris-950);
}

:root[data-tema='oscuro'] .candado__arco {
  stroke: var(--gris-950);
}

.arbol {
  fill: var(--mapa-arbol);
  opacity: 0.75;
}

.arbol--cacao {
  opacity: 0.6;
}

.surco {
  fill: var(--mapa-arbol);
  opacity: 0.45;
}

.agua {
  fill: var(--mapa-agua);
}

.carril {
  stroke: #ffffff;
  stroke-width: 1.5;
  stroke-dasharray: 6 5;
  opacity: 0.8;
}

.linea-cancha {
  fill: none;
  stroke: #ffffff;
  stroke-width: 2.5;
  opacity: 0.85;
}

.linea-parqueo {
  stroke: #ffffff;
  stroke-width: 2;
  opacity: 0.9;
}

.fuente {
  fill: var(--mapa-agua);
  stroke: #ffffff;
  stroke-width: 4;
}

.favorito {
  fill: var(--aviso);
  stroke: #ffffff;
  stroke-width: 2;
}

.favorito__estrella {
  fill: #ffffff;
}

.norte path {
  fill: var(--mapa-texto);
}

.norte text {
  fill: var(--mapa-texto);
  font-size: 12px;
  font-weight: 800;
  text-anchor: middle;
  font-family: var(--fuente-base);
}

.detalle {
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
