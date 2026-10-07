<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import gsap from 'gsap'
import {
  Bell,
  BellOff,
  CalendarDays,
  ShoppingBag,
  ListChecks,
  PackageSearch,
  Megaphone,
  MapPin,
  CheckCheck,
  ArrowRight,
} from 'lucide-vue-next'
import { useNotificaciones } from '@/stores/notificaciones'
import { useLugares } from '@/stores/lugares'
import { sinMovimiento } from '@/lib/movimiento'
import { fechaRelativa, horaDe } from '@compartido/hora.js'

/**
 * La campanita: muestra los avisos mas recientes sin salir de la pantalla.
 * Si un aviso tiene un lugar (un evento, un anuncio), lleva directo al mapa.
 */
const notificaciones = useNotificaciones()
const lugares = useLugares()
const router = useRouter()

const abierta = ref(false)
const raiz = ref(null)
const boton = ref(null)
const icono = ref(null)
const id = `campana-${Math.random().toString(36).slice(2, 7)}`

const iconos = {
  evento: CalendarDays,
  pedido: ShoppingBag,
  recordatorio: ListChecks,
  objeto: PackageSearch,
  anuncio: Megaphone,
}

const recientes = computed(() => notificaciones.lista.slice(0, 8))
const etiqueta = computed(() =>
  notificaciones.sinLeer
    ? `Avisos, ${notificaciones.sinLeer} sin leer`
    : 'Avisos'
)

function alternar() {
  abierta.value = !abierta.value
  if (abierta.value) {
    lugares.cargar()
    nextTick(() =>
      raiz.value?.querySelector('.panel a, .panel button')?.focus()
    )
  }
}

function cerrar(devolverFoco = false) {
  abierta.value = false
  if (devolverFoco) boton.value?.focus()
}

async function abrir(n, destino) {
  cerrar()
  await notificaciones.marcarLeida(n.id)
  router.push(destino)
}

function alClicFuera(e) {
  if (abierta.value && raiz.value && !raiz.value.contains(e.target)) cerrar()
}

function alTeclear(e) {
  if (e.key === 'Escape' && abierta.value) cerrar(true)
}

// La campana se mueve un poco cuando llega algo nuevo.
watch(
  () => notificaciones.sinLeer,
  (nuevo, anterior) => {
    if (nuevo > anterior && icono.value && !sinMovimiento()) {
      gsap.fromTo(
        icono.value,
        { rotate: 0 },
        {
          keyframes: [
            { rotate: 16 },
            { rotate: -14 },
            { rotate: 8 },
            { rotate: 0 },
          ],
          duration: 0.7,
          transformOrigin: '50% 10%',
        }
      )
    }
  }
)

onMounted(() => {
  document.addEventListener('pointerdown', alClicFuera)
  document.addEventListener('keydown', alTeclear)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', alClicFuera)
  document.removeEventListener('keydown', alTeclear)
})
</script>

<template>
  <div ref="raiz" class="campana">
    <button
      ref="boton"
      type="button"
      class="boton-icono campana__boton"
      :aria-label="etiqueta"
      :aria-expanded="abierta"
      :aria-controls="id"
      @click="alternar"
    >
      <span ref="icono" class="campana__icono"
        ><Bell :size="22" aria-hidden="true"
      /></span>
      <span
        v-if="notificaciones.sinLeer"
        class="campana__cuenta"
        aria-hidden="true"
      >
        {{ notificaciones.sinLeer > 9 ? '9+' : notificaciones.sinLeer }}
      </span>
    </button>

    <Transition name="panel">
      <div
        v-if="abierta"
        :id="id"
        class="panel"
        role="region"
        aria-label="Avisos recientes"
      >
        <header class="panel__encabezado">
          <p class="panel__titulo">Avisos</p>
          <button
            v-if="notificaciones.sinLeer"
            type="button"
            class="boton boton--texto boton--pequeno"
            @click="notificaciones.marcarTodas()"
          >
            <CheckCheck :size="16" aria-hidden="true" /> Marcar leídos
          </button>
        </header>

        <div v-if="!recientes.length" class="panel__vacio">
          <BellOff :size="24" aria-hidden="true" />
          <p>
            No tenés avisos. Aquí te llegan los anuncios del colegio, tus
            pedidos y los eventos de tu sección.
          </p>
        </div>

        <ul v-else class="lista">
          <li
            v-for="n in recientes"
            :key="n.id"
            class="aviso"
            :class="{ 'es-nuevo': !n.leida }"
          >
            <span class="aviso__icono" :data-tipo="n.tipo" aria-hidden="true">
              <component :is="iconos[n.tipo] ?? Bell" :size="18" />
            </span>
            <div class="aviso__cuerpo">
              <p class="aviso__titulo">
                {{ n.titulo }}
                <span v-if="!n.leida" class="solo-lectores">(sin leer)</span>
              </p>
              <p class="aviso__texto">{{ n.cuerpo }}</p>
              <p class="aviso__hora">
                {{ fechaRelativa(n.creadoEn) }}, {{ horaDe(n.creadoEn) }}
              </p>
              <div class="aviso__acciones">
                <button
                  v-if="n.lugarClave"
                  type="button"
                  class="boton boton--accion boton--pequeno"
                  @click="
                    abrir(n, { name: 'mapa', query: { lugar: n.lugarClave } })
                  "
                >
                  <MapPin :size="16" aria-hidden="true" />
                  Ver en el mapa<template v-if="lugares.nombreDe(n.lugarClave)"
                    >: {{ lugares.nombreDe(n.lugarClave) }}</template
                  >
                </button>
                <button
                  v-if="n.enlace && !n.enlace.startsWith('/mapa')"
                  type="button"
                  class="boton boton--contorno boton--pequeno"
                  @click="abrir(n, n.enlace)"
                >
                  Abrir <ArrowRight :size="16" aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        </ul>

        <footer class="panel__pie">
          <RouterLink
            :to="{ name: 'notificaciones' }"
            class="boton boton--texto boton--ancho"
            @click="cerrar()"
          >
            Ver todos los avisos
          </RouterLink>
        </footer>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.campana {
  position: relative;
}

.campana__boton {
  position: relative;
}

.campana__icono {
  display: inline-flex;
}

.campana__cuenta {
  position: absolute;
  top: 4px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: var(--radio-pildora);
  background: var(--error);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: var(--peso-fuerte);
  line-height: 1;
  border: 2px solid var(--fondo);
}

.panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: var(--z-modal);
  width: min(calc(100vw - 1.5rem), 25rem);
  max-height: min(75dvh, 36rem);
  display: flex;
  flex-direction: column;
  background: var(--fondo-elevado);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-4);
  overflow: hidden;
}

.panel__encabezado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-2);
  padding: var(--e-3) var(--e-3) var(--e-2) var(--e-4);
  border-bottom: 1px solid var(--borde);
}

.panel__titulo {
  font-weight: var(--peso-fuerte);
  font-size: var(--txt-md);
}

.panel__vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-2);
  padding: var(--e-8) var(--e-5);
  color: var(--texto-suave);
  text-align: center;
  font-size: var(--txt-sm);
}

.lista {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.aviso {
  display: flex;
  gap: var(--e-3);
  padding: var(--e-3) var(--e-4);
  border-bottom: 1px solid var(--borde-sutil);
}

.aviso.es-nuevo {
  background: var(--principal-suave);
}

.aviso__icono {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--radio-sm);
  background: var(--superficie-3);
  color: var(--texto-suave);
}

.aviso__icono[data-tipo='anuncio'] {
  background: var(--aviso-fondo);
  color: var(--aviso);
}

.aviso__icono[data-tipo='pedido'] {
  background: var(--exito-fondo);
  color: var(--exito);
}

.aviso__icono[data-tipo='evento'] {
  background: var(--info-fondo);
  color: var(--info);
}

.aviso__cuerpo {
  flex: 1;
  min-width: 0;
}

.aviso__titulo {
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
  line-height: 1.35;
}

.aviso__texto {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  margin-top: 2px;
}

.aviso__hora {
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
  margin-top: 2px;
}

.aviso__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
  margin-top: var(--e-2);
}

.aviso__acciones .boton {
  white-space: normal;
  text-align: left;
  line-height: 1.25;
  padding-block: 6px;
}

.panel__pie {
  border-top: 1px solid var(--borde);
  padding: var(--e-1);
}

@media (max-width: 640px) {
  .panel {
    position: fixed;
    top: calc(64px + env(safe-area-inset-top));
    left: var(--e-3);
    right: var(--e-3);
    width: auto;
  }
}

.panel-enter-active,
.panel-leave-active {
  transition:
    opacity var(--dur-media) var(--curva),
    transform var(--dur-media) var(--curva);
  transform-origin: top left;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
