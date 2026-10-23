<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Settings,
  LayoutDashboard,
  Compass,
  LogOut,
  UserPlus,
  LogIn,
  CalendarClock,
  ChevronDown,
} from 'lucide-vue-next'
import { useAuth } from '@/stores/auth'
import { useConfirmar } from '@/stores/confirmar'
import { useRecorrido } from '@/stores/recorrido'

/**
 * Boton con las iniciales de la persona. Abre un menu con su cuenta, los
 * ajustes, el recorrido guiado y cerrar sesion. En la barra lateral se abre
 * hacia arriba (`hacia="arriba"`).
 */
const props = defineProps({
  hacia: { type: String, default: 'abajo' },
  /** Muestra el nombre junto al circulo (barra lateral). */
  conNombre: { type: Boolean, default: false },
})

const auth = useAuth()
const router = useRouter()
const confirmar = useConfirmar()
const recorrido = useRecorrido()

const abierto = ref(false)
const raiz = ref(null)
const boton = ref(null)
const id = `menu-usuario-${Math.random().toString(36).slice(2, 7)}`

const iniciales = computed(() => {
  if (!auth.usuario?.nombre) return 'I'
  const partes = auth.usuario.nombre.trim().split(/\s+/)
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
})

const detalle = computed(() => {
  if (!auth.usuario) return 'Explorando sin cuenta'
  return auth.usuario.seccion
    ? `${auth.nombreRol} · Sección ${auth.usuario.seccion}`
    : auth.nombreRol
})

function alternar() {
  abierto.value = !abierto.value
  if (abierto.value)
    nextTick(() => raiz.value?.querySelector('[role="menuitem"]')?.focus())
}

function cerrar(devolverFoco = false) {
  abierto.value = false
  if (devolverFoco) boton.value?.focus()
}

function verRecorrido() {
  cerrar()
  router.push(auth.inicioDe()).then(() => recorrido.iniciar())
}

async function salir() {
  cerrar()
  if (auth.invitado && !auth.usuario) {
    await auth.salir()
    router.replace({ name: 'bienvenida' })
    return
  }
  const si = await confirmar.preguntar({
    titulo: '¿Cerrar sesión?',
    mensaje: 'Vas a necesitar tu correo y tu contraseña para volver a entrar.',
    aceptar: 'Cerrar sesión',
    peligro: false,
  })
  if (!si) return
  await auth.salir()
  router.replace({ name: 'entrar' })
}

/** Flechas arriba y abajo para moverse entre las opciones. */
function alTeclearMenu(e) {
  const opciones = [...raiz.value.querySelectorAll('[role="menuitem"]')]
  const i = opciones.indexOf(document.activeElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    opciones[(i + 1) % opciones.length]?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    opciones[(i - 1 + opciones.length) % opciones.length]?.focus()
  } else if (e.key === 'Escape') {
    cerrar(true)
  }
}

function alClicFuera(e) {
  if (abierto.value && raiz.value && !raiz.value.contains(e.target)) cerrar()
}

onMounted(() => document.addEventListener('pointerdown', alClicFuera))
onUnmounted(() => document.removeEventListener('pointerdown', alClicFuera))
</script>

<template>
  <div
    ref="raiz"
    class="menu-usuario"
    :class="[`menu-usuario--${props.hacia}`, { 'con-nombre': conNombre }]"
  >
    <button
      ref="boton"
      type="button"
      class="disparador"
      :aria-expanded="abierto"
      :aria-controls="id"
      aria-haspopup="menu"
      :aria-label="`Tu cuenta: ${auth.usuario?.nombre ?? 'invitado'}`"
      data-recorrido="cuenta"
      @click="alternar"
    >
      <span class="avatar" :class="{ 'avatar--invitado': !auth.usuario }">{{
        iniciales
      }}</span>
      <span v-if="conNombre" class="disparador__textos">
        <strong>{{ auth.usuario?.nombre ?? 'Invitado' }}</strong>
        <span>{{ detalle }}</span>
      </span>
      <ChevronDown
        v-if="conNombre"
        :size="16"
        class="disparador__flecha"
        :class="{ 'es-abierto': abierto }"
        aria-hidden="true"
      />
    </button>

    <Transition name="emergente">
      <div
        v-if="abierto"
        :id="id"
        class="hoja-menu"
        role="menu"
        :aria-label="'Cuenta'"
        @keydown="alTeclearMenu"
      >
        <div class="cabecera" data-escalon style="--i: 0">
          <span
            class="avatar avatar--grande"
            :class="{ 'avatar--invitado': !auth.usuario }"
            >{{ iniciales }}</span
          >
          <span class="cabecera__textos">
            <strong>{{ auth.usuario?.nombre ?? 'Invitado' }}</strong>
            <span>{{ auth.usuario?.correo ?? detalle }}</span>
            <span v-if="auth.usuario" class="etiqueta etiqueta--principal">{{
              detalle
            }}</span>
          </span>
        </div>

        <template v-if="auth.usuario">
          <RouterLink
            v-if="auth.esProfesor || auth.esAdmin"
            :to="{ name: 'clases', query: { ver: 'mio' } }"
            class="opcion"
            role="menuitem"
            data-escalon
            style="--i: 1"
            @click="cerrar()"
          >
            <CalendarClock :size="18" aria-hidden="true" /> Mi horario
          </RouterLink>
          <RouterLink
            v-if="auth.puedeEntrarAlPanel"
            to="/admin"
            class="opcion"
            role="menuitem"
            data-escalon
            style="--i: 2"
            @click="cerrar()"
          >
            <LayoutDashboard :size="18" aria-hidden="true" /> Panel de
            administración
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink
            :to="{ name: 'registro' }"
            class="opcion opcion--destacada"
            role="menuitem"
            data-escalon
            style="--i: 1"
            @click="cerrar()"
          >
            <UserPlus :size="18" aria-hidden="true" /> Crear mi cuenta
          </RouterLink>
          <RouterLink
            :to="{ name: 'entrar' }"
            class="opcion"
            role="menuitem"
            data-escalon
            style="--i: 2"
            @click="cerrar()"
          >
            <LogIn :size="18" aria-hidden="true" /> Ya tengo cuenta
          </RouterLink>
        </template>

        <RouterLink
          :to="{ name: 'configuracion' }"
          class="opcion"
          role="menuitem"
          data-escalon
          style="--i: 3"
          @click="cerrar()"
        >
          <Settings :size="18" aria-hidden="true" /> Configuración
        </RouterLink>
        <button
          type="button"
          class="opcion"
          role="menuitem"
          data-escalon
          style="--i: 4"
          @click="verRecorrido"
        >
          <Compass :size="18" aria-hidden="true" /> Ver el recorrido guiado
        </button>
        <hr class="divisor" />
        <button
          type="button"
          class="opcion opcion--salir"
          role="menuitem"
          data-escalon
          style="--i: 5"
          @click="salir"
        >
          <LogOut :size="18" aria-hidden="true" />
          {{ auth.usuario ? 'Cerrar sesión' : 'Salir del modo invitado' }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-usuario {
  position: relative;
}

.disparador {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  min-height: var(--objetivo-tactil);
  min-width: var(--objetivo-tactil);
  justify-content: center;
  border-radius: var(--radio-pildora);
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-rapida) ease,
    transform var(--dur-toque) var(--curva-salida);
}

.disparador:active {
  transform: scale(0.96);
}

.con-nombre .disparador {
  width: 100%;
  justify-content: flex-start;
  padding: var(--e-2);
  border-radius: var(--radio-md);
  text-align: left;
}

.disparador:hover {
  background: var(--superficie-hover);
}

.disparador__textos {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  font-size: var(--txt-sm);
  line-height: 1.3;
}

.disparador__textos strong,
.disparador__textos span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disparador__textos span {
  color: var(--texto-tenue);
  font-size: var(--txt-xs);
}

.disparador__flecha {
  color: var(--texto-tenue);
  transition: transform var(--dur-media) var(--curva-salida);
}

.menu-usuario--arriba .disparador__flecha {
  transform: rotate(180deg);
}

.disparador__flecha.es-abierto {
  transform: rotate(180deg);
}

.menu-usuario--arriba .disparador__flecha.es-abierto {
  transform: rotate(0deg);
}

.avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--degradado-marca);
  color: #ffffff;
  font-size: var(--txt-sm);
  font-weight: var(--peso-extra);
  letter-spacing: 0.02em;
  box-shadow:
    0 0 0 2px var(--fondo-elevado),
    0 0 0 3.5px color-mix(in srgb, var(--principal) 45%, transparent);
}

.avatar--invitado {
  background: var(--superficie-3);
  color: var(--texto-suave);
}

.avatar--grande {
  width: 48px;
  height: 48px;
  font-size: var(--txt-md);
}

.hoja-menu {
  position: absolute;
  z-index: var(--z-hoja);
  right: 0;
  top: calc(100% + 8px);
  width: min(19rem, calc(100vw - 2rem));
  padding: var(--e-2);
  border-radius: var(--radio-lg);
  background: var(--fondo-elevado);
  box-shadow: var(--sombra-flotante);
  --origen: top right;
}

.menu-usuario--arriba .hoja-menu {
  top: auto;
  right: auto;
  left: 0;
  bottom: calc(100% + 8px);
  width: 100%;
  --origen: bottom left;
}

.cabecera {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  padding: var(--e-3) var(--e-3) var(--e-4);
  margin-bottom: var(--e-1);
  border-bottom: 1px solid var(--borde-sutil);
}

.cabecera__textos {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  font-size: var(--txt-sm);
}

.cabecera__textos > span:not(.etiqueta) {
  color: var(--texto-tenue);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  white-space: nowrap;
}

.cabecera__textos .etiqueta {
  margin-top: 4px;
}

.opcion {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  width: 100%;
  min-height: var(--objetivo-tactil);
  padding: 0 var(--e-3);
  border-radius: var(--radio-sm);
  color: var(--texto);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  text-decoration: none;
  text-align: left;
  transition:
    background-color var(--dur-rapida) ease,
    transform var(--dur-toque) var(--curva-salida);
}

.opcion svg {
  color: var(--texto-tenue);
  transition:
    color var(--dur-rapida) ease,
    transform var(--dur-media) var(--curva-salida);
}

.opcion:hover,
.opcion:focus-visible {
  background: var(--superficie-hover);
  color: var(--texto);
  outline: none;
}

.opcion:hover svg,
.opcion:focus-visible svg {
  color: var(--principal-fuerte);
  transform: translateX(2px);
}

.opcion:active {
  transform: scale(0.98);
}

.opcion--destacada {
  background: var(--principal-suave);
  color: var(--principal-fuerte);
}

.opcion--destacada svg {
  color: var(--principal-fuerte);
}

.opcion--salir:hover,
.opcion--salir:hover svg {
  color: var(--error);
}

.divisor {
  border: none;
  height: 1px;
  margin: var(--e-1) var(--e-2);
  background: var(--borde-sutil);
}
</style>
