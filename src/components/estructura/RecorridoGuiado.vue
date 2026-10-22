<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuth } from '@/stores/auth'
import { useRecorrido } from '@/stores/recorrido'
import LogoCitx from '@/components/marca/LogoCitx.vue'
import {
  ArrowLeft,
  ArrowRight,
  X,
  House,
  Map as IconoMapa,
  BookOpen,
  UtensilsCrossed,
  Bell,
  CircleUserRound,
  LayoutDashboard,
  PartyPopper,
} from 'lucide-vue-next'

/**
 * Recorrido guiado: oscurece la pantalla y alumbra una parte de la app a la
 * vez, con una tarjeta que explica para que sirve. Los elementos se marcan con
 * data-recorrido="nombre"; si hay dos (barra lateral y barra inferior), se usa
 * el que esta visible.
 */
const auth = useAuth()
const recorrido = useRecorrido()

const pasos = computed(() => {
  const lista = [
    {
      clave: 'hola',
      titulo: `Te damos la bienvenida a CitX`,
      texto:
        'En menos de un minuto te mostramos qué hace cada parte de la app. Podés saltarlo cuando querás.',
    },
    {
      clave: 'inicio',
      icono: House,
      titulo: 'Inicio',
      texto:
        'Tu resumen del día: la clase en curso, tu próximo evento, tus pedidos y los avisos del colegio.',
    },
    {
      clave: 'mapa',
      icono: IconoMapa,
      titulo: 'Mapa interactivo',
      texto:
        'Buscá cualquier lugar del CIT. Tocá un número para ver qué hay ahí, su horario y guardarlo en favoritos.',
    },
    {
      clave: 'guia',
      icono: BookOpen,
      titulo: 'Guía digital',
      texto: auth.esProfesor
        ? 'Eventos, tu horario de profesor, recordatorios para tus secciones, objetos perdidos y enfermería.'
        : 'Eventos, tu horario de clases, recordatorios, objetos perdidos y la enfermería.',
    },
    {
      clave: 'soda',
      icono: UtensilsCrossed,
      titulo: 'Soda Armonía',
      texto: auth.usuario
        ? 'Mirá el menú, pedí desde aquí y retirá en el recreo mostrando tu código QR. Sin hacer fila.'
        : 'Mirá el menú y los precios. Con una cuenta podés pedir y retirar en el recreo sin hacer fila.',
    },
  ]
  if (auth.usuario) {
    lista.push({
      clave: 'avisos',
      icono: Bell,
      titulo: 'Avisos',
      texto:
        'La campanita te avisa de eventos nuevos, anuncios del colegio y cuando tu pedido está listo.',
    })
  }
  if (auth.puedeEntrarAlPanel) {
    lista.push({
      clave: 'panel',
      icono: LayoutDashboard,
      titulo: 'Panel de administración',
      texto:
        'Desde aquí se manejan pedidos, anuncios, eventos, lugares del mapa y horarios, según tus permisos.',
    })
  }
  lista.push({
    clave: 'cuenta',
    icono: CircleUserRound,
    titulo: auth.usuario ? 'Tu cuenta' : 'Modo invitado',
    texto: auth.usuario
      ? 'Configuración, accesibilidad (texto grande, modo oscuro, lectura en voz alta) y cerrar sesión. Desde aquí podés repetir este recorrido.'
      : 'Estás explorando sin cuenta. Desde aquí podés crear tu cuenta cuando querás, o repetir este recorrido.',
  })
  lista.push({
    clave: 'fin',
    icono: PartyPopper,
    titulo: '¡Listo, ya sabés moverte!',
    texto: 'Todo está a uno o dos toques. Que tengás un buen día en el CIT.',
  })
  return lista
})

const indice = ref(0)
const paso = computed(() => pasos.value[indice.value])
const esPrimero = computed(() => indice.value === 0)
const esUltimo = computed(() => indice.value === pasos.value.length - 1)

/** Rectangulo alumbrado (null = tarjeta centrada, sin foco). */
const foco = ref(null)
const tarjeta = ref(null)
const posTarjeta = ref({ x: 0, y: 0, centrada: true })
const botonPrincipal = ref(null)

function elementoDe(clave) {
  const candidatos = document.querySelectorAll(`[data-recorrido="${clave}"]`)
  for (const el of candidatos) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el
  }
  return null
}

function medir() {
  const el = paso.value ? elementoDe(paso.value.clave) : null
  if (!el) {
    foco.value = null
    posTarjeta.value = { x: 0, y: 0, centrada: true }
    return
  }
  const r = el.getBoundingClientRect()
  const margen = 8
  foco.value = {
    x: r.left - margen,
    y: r.top - margen,
    ancho: r.width + margen * 2,
    alto: r.height + margen * 2,
    radio: Math.min(24, (r.height + margen * 2) / 2),
  }
  const anchoT = Math.min(340, window.innerWidth - 32)
  const altoT = tarjeta.value?.offsetHeight ?? 220
  const vw = window.innerWidth
  const vh = window.innerHeight
  const espacio = 16

  let x
  let y
  if (r.right + espacio + anchoT < vw && r.height > vh * 0.25) {
    // Elementos altos (barra lateral): la tarjeta va a la derecha.
    x = r.right + espacio + margen
    y = r.top + r.height / 2 - altoT / 2
  } else {
    x = r.left + r.width / 2 - anchoT / 2
    const abajo = r.bottom + espacio + margen
    const arriba = r.top - espacio - margen - altoT
    y = abajo + altoT < vh - espacio || arriba < espacio ? abajo : arriba
    // En la barra lateral, a la derecha del enlace.
    if (r.left < 280 && r.width < 280 && vw >= 1024) {
      x = r.right + espacio + margen
      y = r.top + r.height / 2 - altoT / 2
    }
  }
  x = Math.max(espacio, Math.min(vw - anchoT - espacio, x))
  y = Math.max(espacio, Math.min(vh - altoT - espacio, y))
  posTarjeta.value = { x, y, centrada: false }
}

async function irA(i) {
  indice.value = Math.max(0, Math.min(pasos.value.length - 1, i))
  await nextTick()
  const el = paso.value && elementoDe(paso.value.clave)
  if (el) {
    const r = el.getBoundingClientRect()
    if (r.top < 0 || r.bottom > window.innerHeight)
      el.scrollIntoView({ block: 'center' })
  }
  medir()
  // Segunda medicion: la tarjeta ya tiene su alto real con el texto nuevo.
  requestAnimationFrame(() => {
    medir()
    botonPrincipal.value?.focus({ preventScroll: true })
  })
}

function siguiente() {
  if (esUltimo.value) terminar()
  else irA(indice.value + 1)
}

function anterior() {
  if (!esPrimero.value) irA(indice.value - 1)
}

function terminar() {
  recorrido.cerrar(auth.usuario?.id)
}

function alTeclear(e) {
  if (!recorrido.abierto) return
  if (e.key === 'Escape') terminar()
  else if (e.key === 'ArrowRight') siguiente()
  else if (e.key === 'ArrowLeft') anterior()
}

const alCambiarTamano = () => recorrido.abierto && medir()

watch(
  () => recorrido.abierto,
  (abierto) => {
    if (abierto) {
      document.body.style.overflow = 'hidden'
      irA(0)
    } else {
      document.body.style.overflow = ''
    }
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('keydown', alTeclear)
  window.addEventListener('resize', alCambiarTamano)
  // Primera vez de esta persona en este navegador: el recorrido sale solo.
  if (!recorrido.yaLoVio(auth.usuario?.id)) {
    setTimeout(() => recorrido.iniciar(), 1900)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', alTeclear)
  window.removeEventListener('resize', alCambiarTamano)
  document.body.style.overflow = ''
})

const estiloFoco = computed(() =>
  foco.value
    ? {
        width: `${foco.value.ancho}px`,
        height: `${foco.value.alto}px`,
        transform: `translate(${foco.value.x}px, ${foco.value.y}px)`,
        borderRadius: `${foco.value.radio}px`,
      }
    : null
)

const estiloTarjeta = computed(() =>
  posTarjeta.value.centrada
    ? null
    : {
        transform: `translate(${posTarjeta.value.x}px, ${posTarjeta.value.y}px)`,
      }
)
</script>

<template>
  <Transition name="recorrido">
    <div
      v-if="recorrido.abierto"
      class="recorrido"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recorrido-titulo"
      aria-describedby="recorrido-texto"
    >
      <!-- Velo: si hay foco, el hueco lo hace la sombra enorme del foco. -->
      <div class="recorrido__velo" :class="{ 'es-solo': !foco }" />
      <div
        class="recorrido__foco"
        :class="{ 'es-oculto': !foco }"
        :style="estiloFoco"
        aria-hidden="true"
      />

      <div
        ref="tarjeta"
        class="recorrido__tarjeta"
        :class="{ 'es-centrada': posTarjeta.centrada }"
        :style="estiloTarjeta"
      >
        <button
          type="button"
          class="recorrido__cerrar boton-icono"
          aria-label="Saltar el recorrido"
          @click="terminar"
        >
          <X :size="18" aria-hidden="true" />
        </button>

        <Transition name="paso" mode="out-in">
          <div :key="paso.clave" class="recorrido__cuerpo">
            <div v-if="paso.clave === 'hola'" class="recorrido__logo">
              <LogoCitx :tamano="64" alternativo="" />
            </div>
            <span v-else class="recorrido__icono" aria-hidden="true">
              <component :is="paso.icono" :size="22" />
            </span>
            <h2 id="recorrido-titulo" class="recorrido__titulo">
              {{ paso.titulo }}
            </h2>
            <p id="recorrido-texto" class="recorrido__texto">
              {{ paso.texto }}
            </p>
          </div>
        </Transition>

        <div class="recorrido__pie">
          <div class="recorrido__puntos" aria-hidden="true">
            <span
              v-for="(p, i) in pasos"
              :key="p.clave"
              :class="{ 'es-actual': i === indice, 'es-pasado': i < indice }"
            />
          </div>
          <span class="solo-lectores"
            >Paso {{ indice + 1 }} de {{ pasos.length }}</span
          >
          <div class="recorrido__botones">
            <button
              v-if="!esPrimero"
              type="button"
              class="boton-icono"
              aria-label="Paso anterior"
              @click="anterior"
            >
              <ArrowLeft :size="18" aria-hidden="true" />
            </button>
            <button
              ref="botonPrincipal"
              type="button"
              class="boton boton--principal boton--pequeno"
              @click="siguiente"
            >
              {{ esPrimero ? 'Empezar' : esUltimo ? 'Terminar' : 'Siguiente' }}
              <ArrowRight
                v-if="!esUltimo"
                :size="16"
                class="icono-avanza"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.recorrido {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-aviso) + 10);
}

.recorrido__velo {
  position: absolute;
  inset: 0;
  background: transparent;
  transition: background-color calc(400ms * var(--mov)) ease;
}

.recorrido__velo.es-solo {
  background: var(--velo);
}

.recorrido__foco {
  position: absolute;
  top: 0;
  left: 0;
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--turquesa-300) 85%, transparent),
    0 0 0 9px color-mix(in srgb, var(--turquesa-300) 22%, transparent),
    0 0 0 200vmax var(--velo);
  pointer-events: none;
  transition:
    transform calc(560ms * var(--mov)) var(--curva-mover),
    width calc(560ms * var(--mov)) var(--curva-mover),
    height calc(560ms * var(--mov)) var(--curva-mover),
    border-radius calc(560ms * var(--mov)) var(--curva-mover),
    opacity calc(300ms * var(--mov)) ease;
}

.recorrido__foco.es-oculto {
  opacity: 0;
}

.recorrido__tarjeta {
  position: absolute;
  top: 0;
  left: 0;
  width: min(340px, calc(100vw - 32px));
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--fondo-elevado);
  color: var(--texto);
  box-shadow: var(--sombra-flotante);
  transition: transform calc(560ms * var(--mov)) var(--curva-mover);
}

.recorrido__tarjeta.es-centrada {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(380px, calc(100vw - 32px));
  text-align: center;
}

.recorrido__cerrar {
  position: absolute;
  top: var(--e-2);
  right: var(--e-2);
  width: 36px;
  height: 36px;
}

.recorrido__cuerpo {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.es-centrada .recorrido__cuerpo {
  align-items: center;
}

.recorrido__logo {
  margin-bottom: var(--e-2);
  animation: logo-flota calc(3s * var(--mov)) ease-in-out infinite;
}

@keyframes logo-flota {
  50% {
    transform: translateY(-5px);
  }
}

.recorrido__icono {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radio-md);
  background: var(--principal-suave);
  color: var(--principal-fuerte);
}

.recorrido__titulo {
  font-family: var(--fuente-titulo);
  font-size: var(--txt-xl);
  color: var(--texto-titulo);
  padding-right: var(--e-6);
}

.es-centrada .recorrido__titulo {
  padding-right: 0;
}

.recorrido__texto {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
  line-height: var(--alto-amplio);
}

.recorrido__pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
  margin-top: var(--e-5);
}

.recorrido__puntos {
  display: flex;
  gap: 5px;
}

.recorrido__puntos span {
  width: 6px;
  height: 6px;
  border-radius: var(--radio-pildora);
  background: var(--borde-fuerte);
  transition:
    width calc(400ms * var(--mov)) var(--curva-salida),
    background-color calc(300ms * var(--mov)) ease;
}

.recorrido__puntos .es-pasado {
  background: var(--principal-borde);
}

.recorrido__puntos .es-actual {
  width: 20px;
  background: var(--principal);
}

.recorrido__botones {
  display: flex;
  align-items: center;
  gap: var(--e-1);
}

.recorrido-enter-active {
  transition: opacity calc(400ms * var(--mov)) ease;
}

.recorrido-leave-active {
  transition: opacity calc(260ms * var(--mov)) ease;
}

.recorrido-enter-from,
.recorrido-leave-to {
  opacity: 0;
}

.recorrido-enter-active .recorrido__tarjeta {
  animation: tarjeta-entra calc(520ms * var(--mov)) var(--curva-salida)
    backwards;
  animation-delay: calc(120ms * var(--mov));
}

@keyframes tarjeta-entra {
  from {
    opacity: 0;
    scale: 0.94;
    translate: 0 10px;
  }
}

.paso-enter-active {
  transition:
    opacity calc(260ms * var(--mov)) var(--curva-salida),
    transform calc(320ms * var(--mov)) var(--curva-salida),
    filter calc(260ms * var(--mov)) var(--curva-salida);
}

.paso-leave-active {
  transition:
    opacity calc(120ms * var(--mov)) ease,
    filter calc(120ms * var(--mov)) ease;
}

.paso-enter-from {
  opacity: 0;
  transform: translateX(10px);
  filter: blur(3px);
}

.paso-leave-to {
  opacity: 0;
  filter: blur(2px);
}
</style>
