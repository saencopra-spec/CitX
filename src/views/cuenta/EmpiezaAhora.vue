<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  Mail,
  UserPlus,
  UserRound,
  ChevronDown,
  ArrowLeft,
} from 'lucide-vue-next'
import LogoCitx from '@/components/marca/LogoCitx.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import CarruselFotos from '@/components/marca/CarruselFotos.vue'
import BotonesExternos from '@/components/formularios/BotonesExternos.vue'
import { useAuth } from '@/stores/auth'

/**
 * Pantalla para elegir como entrar. Llega aqui quien abre una pagina de la
 * app sin haber iniciado sesion.
 */
const route = useRoute()
const router = useRouter()
const auth = useAuth()
const seguir =
  typeof route.query.seguir === 'string' ? { seguir: route.query.seguir } : {}

const masOpciones = ref(false)

function comoInvitado() {
  auth.entrarComoInvitado()
  router.replace({ name: 'menu' })
}
</script>

<template>
  <main class="empieza">
    <RouterLink
      :to="{ name: 'bienvenida' }"
      class="volver"
      aria-label="Volver a la presentación"
    >
      <ArrowLeft :size="22" aria-hidden="true" />
    </RouterLink>

    <div class="empieza__columna">
      <header class="empieza__marca">
        <EscudoCit :tamano="64" />
        <span class="empieza__linea" aria-hidden="true" />
        <LogoCitx :tamano="56" con-nombre alternativo="CitX" />
      </header>

      <CarruselFotos
        class="empieza__fotos"
        sizes="(min-width: 640px) 30rem, 100vw"
      />

      <h1 class="empieza__titulo titulo-manuscrito">¡Empieza ahora!</h1>
      <p class="empieza__bajada">
        Entrá con tu cuenta del CIT o creá una nueva en un minuto.
      </p>

      <div class="empieza__botones">
        <RouterLink
          :to="{ name: 'entrar', query: seguir }"
          class="boton boton--principal boton--ancho boton--grande"
        >
          <Mail :size="20" aria-hidden="true" />
          Iniciar con correo
        </RouterLink>
        <RouterLink
          :to="{ name: 'registro', query: seguir }"
          class="boton boton--contorno boton--ancho boton--grande"
        >
          <UserPlus :size="20" aria-hidden="true" />
          Crear cuenta
        </RouterLink>
        <button
          type="button"
          class="boton boton--suave boton--ancho"
          @click="comoInvitado"
        >
          <UserRound :size="20" aria-hidden="true" />
          Entrar como invitado
        </button>
      </div>

      <button
        type="button"
        class="alternar"
        :aria-expanded="masOpciones"
        aria-controls="empieza-opciones"
        @click="masOpciones = !masOpciones"
      >
        {{ masOpciones ? 'Ocultar opciones' : 'Más opciones para entrar' }}
        <ChevronDown
          :size="16"
          class="alternar__flecha"
          :class="{ 'es-abierto': masOpciones }"
          aria-hidden="true"
        />
      </button>
      <div
        id="empieza-opciones"
        class="desplegable empieza__mas"
        :class="{ 'es-abierto': masOpciones }"
        :inert="!masOpciones"
      >
        <div><BotonesExternos /></div>
      </div>

      <footer class="empieza__nota">
        <RouterLink :to="{ name: 'configuracion' }" class="empieza__ajustes">
          Ajustes de accesibilidad
        </RouterLink>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.empieza {
  position: relative;
  display: flex;
  justify-content: center;
  min-height: 100dvh;
  padding: calc(var(--e-10) + env(safe-area-inset-top)) var(--margen-lateral)
    calc(var(--e-6) + env(safe-area-inset-bottom));
  background:
    radial-gradient(
      36rem 22rem at 50% -6%,
      color-mix(in srgb, var(--principal) 14%, transparent),
      transparent 70%
    ),
    var(--fondo-elevado);
}

.volver {
  position: absolute;
  top: calc(var(--e-3) + env(safe-area-inset-top));
  left: var(--e-3);
  display: grid;
  place-items: center;
  width: var(--objetivo-tactil);
  height: var(--objetivo-tactil);
  border-radius: 50%;
  color: var(--texto-suave);
  transition:
    background-color var(--dur-rapida) ease,
    transform var(--dur-toque) var(--curva-salida);
}

.volver:hover {
  background: var(--superficie-hover);
  color: var(--texto);
}

.volver:active {
  transform: scale(0.92);
}

.empieza__columna {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-4);
  width: 100%;
  max-width: 26rem;
}

.empieza__columna > * {
  animation: entra calc(650ms * var(--mov)) var(--curva-salida) backwards;
}

.empieza__columna > :nth-child(2) {
  animation-delay: calc(80ms * var(--mov));
}
.empieza__columna > :nth-child(3) {
  animation-delay: calc(150ms * var(--mov));
}
.empieza__columna > :nth-child(4) {
  animation-delay: calc(200ms * var(--mov));
}
.empieza__columna > :nth-child(n + 5) {
  animation-delay: calc(260ms * var(--mov));
}

@keyframes entra {
  from {
    opacity: 0;
    transform: translateY(16px);
    filter: blur(4px);
  }
}

.empieza__marca {
  display: flex;
  align-items: center;
  gap: var(--e-4);
}

.empieza__linea {
  width: 1px;
  height: 56px;
  background: var(--borde-fuerte);
}

.empieza__fotos {
  width: 100%;
  margin-top: var(--e-2);
  color: var(--texto-suave);
}

.empieza__fotos :deep(.carrusel__marco) {
  border-radius: var(--radio-xl);
  box-shadow: var(--sombra-3);
}

.empieza__titulo {
  font-size: var(--txt-3xl);
  text-align: center;
}

.empieza__bajada {
  margin-top: calc(var(--e-3) * -1);
  color: var(--texto-suave);
  text-align: center;
}

.empieza__botones {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  width: 100%;
}

.alternar {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  min-height: var(--objetivo-tactil);
  padding-inline: var(--e-3);
  border-radius: var(--radio-pildora);
  color: var(--texto-suave);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
}

.alternar:hover {
  background: var(--superficie-hover);
  color: var(--texto);
}

.alternar__flecha {
  transition: transform calc(360ms * var(--mov)) var(--curva);
}

.alternar__flecha.es-abierto {
  transform: rotate(180deg);
}

.empieza__mas {
  width: 100%;
  margin-top: calc(var(--e-3) * -1);
}

.empieza__nota {
  margin-top: auto;
  padding-top: var(--e-4);
}

.empieza__ajustes {
  display: inline-flex;
  align-items: center;
  min-height: var(--objetivo-tactil);
  padding-inline: var(--e-3);
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
  text-decoration: none;
}

.empieza__ajustes:hover {
  color: var(--texto);
  text-decoration: underline;
}
</style>
