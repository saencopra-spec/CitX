<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import LogoCitx from '@/components/marca/LogoCitx.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import CarruselFotos from '@/components/marca/CarruselFotos.vue'

/**
 * Marco de las pantallas para entrar y crear cuenta. En computadora, a la
 * izquierda va la marca con fotos del colegio (completas, sin recortes); en
 * celular, la marca arriba y el formulario debajo.
 */
defineProps({
  titulo: { type: String, required: true },
  bajada: { type: String, default: '' },
})

const router = useRouter()

function volver() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'bienvenida' })
}
</script>

<template>
  <div class="entrada-pantalla">
    <section class="portada">
      <button type="button" class="volver" aria-label="Volver" @click="volver">
        <ArrowLeft :size="22" aria-hidden="true" />
      </button>
      <div class="portada__marca">
        <div class="portada__logos">
          <span class="portada__escudo"><EscudoCit :tamano="64" /></span>
          <span class="portada__linea" aria-hidden="true" />
          <LogoCitx
            :tamano="52"
            con-nombre
            direccion="horizontal"
            alternativo="CitX"
            class="portada__logo"
          />
        </div>
        <p class="portada__lema">
          El mapa del campus, la guía del colegio y la soda, en el mismo lugar.
        </p>
        <CarruselFotos class="portada__fotos" con-pie />
        <p class="portada__pie">
          Complejo Educativo CIT · La Asunción de Belén, Heredia
        </p>
      </div>
    </section>

    <main id="contenido" class="tarjeta">
      <div class="tarjeta__contenido">
        <h1 class="titulo titulo-manuscrito">{{ titulo }}</h1>
        <p v-if="bajada" class="bajada">{{ bajada }}</p>
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.entrada-pantalla {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--fondo-elevado);
}

.portada {
  position: relative;
  display: flex;
  justify-content: center;
  padding: calc(var(--e-5) + env(safe-area-inset-top)) var(--margen-lateral)
    var(--e-12);
  background:
    radial-gradient(
      28rem 18rem at 85% 0%,
      rgba(99, 209, 180, 0.22),
      transparent 70%
    ),
    radial-gradient(
      24rem 16rem at 0% 100%,
      rgba(67, 109, 221, 0.25),
      transparent 70%
    ),
    var(--marino-800);
  color: #ffffff;
  overflow: hidden;
}

.volver {
  position: absolute;
  top: calc(var(--e-3) + env(safe-area-inset-top));
  left: var(--e-3);
  z-index: 2;
  display: grid;
  place-items: center;
  width: var(--objetivo-tactil);
  height: var(--objetivo-tactil);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  transition:
    background-color var(--dur-rapida) ease,
    transform var(--dur-toque) var(--curva-salida);
}

.volver:hover {
  background: rgba(255, 255, 255, 0.16);
}

.volver:active {
  transform: scale(0.92);
}

.portada__marca {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-3);
  width: 100%;
  max-width: 34rem;
  text-align: center;
}

.portada__logos {
  display: flex;
  align-items: center;
  gap: var(--e-4);
  animation: entra calc(700ms * var(--mov)) var(--curva-salida) backwards;
}

.portada__escudo {
  display: inline-flex;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
}

.portada__logo :deep(.marca__nombre) {
  color: #ffffff;
}

.portada__linea {
  width: 1px;
  height: 52px;
  background: rgba(255, 255, 255, 0.22);
}

.portada__lema {
  max-width: 30ch;
  font-family: var(--fuente-titulo);
  font-size: var(--txt-md);
  color: var(--marino-100);
  animation: entra calc(700ms * var(--mov)) var(--curva-salida)
    calc(100ms * var(--mov)) backwards;
}

.portada__fotos,
.portada__pie {
  display: none;
}

@keyframes entra {
  from {
    opacity: 0;
    transform: translateY(14px);
    filter: blur(4px);
  }
}

.tarjeta {
  position: relative;
  z-index: 2;
  flex: 1;
  margin-top: calc(var(--e-8) * -1);
  padding: var(--e-8) var(--margen-lateral)
    calc(var(--e-8) + env(safe-area-inset-bottom));
  background: var(--fondo-elevado);
  border-radius: var(--radio-xl) var(--radio-xl) 0 0;
  box-shadow: 0 -10px 30px rgba(13, 17, 23, 0.12);
  animation: tarjeta-sube calc(650ms * var(--mov)) var(--curva) backwards;
}

@keyframes tarjeta-sube {
  from {
    transform: translateY(48px);
    opacity: 0;
  }
}

.tarjeta__contenido {
  width: 100%;
  max-width: 25rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

/* Lo que va dentro de la tarjeta entra en cascada. */
.tarjeta__contenido > :deep(*) {
  animation: entra calc(600ms * var(--mov)) var(--curva-salida) backwards;
}

.tarjeta__contenido > :deep(:nth-child(2)) {
  animation-delay: calc(60ms * var(--mov));
}

.tarjeta__contenido > :deep(:nth-child(3)) {
  animation-delay: calc(120ms * var(--mov));
}

.tarjeta__contenido > :deep(:nth-child(n + 4)) {
  animation-delay: calc(180ms * var(--mov));
}

.titulo {
  font-size: var(--txt-2xl);
}

.bajada {
  margin-top: calc(var(--e-4) * -1);
  color: var(--texto-suave);
}

@media (min-width: 1024px) {
  .entrada-pantalla {
    display: grid;
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
  }

  .portada {
    position: sticky;
    top: 0;
    height: 100dvh;
    align-items: center;
    padding: var(--e-10) var(--e-12);
  }

  .portada__marca {
    gap: var(--e-5);
  }

  .portada__linea {
    height: 80px;
  }

  .portada__escudo :deep(.escudo) {
    height: 96px !important;
  }

  .portada__logo :deep(.marca__bombilla) {
    height: 76px !important;
  }

  .portada__logo :deep(.marca__nombre) {
    font-size: 34px !important;
  }

  .portada__lema {
    font-size: var(--txt-xl);
    line-height: 1.35;
  }

  .portada__fotos {
    display: flex;
    width: 100%;
    margin-top: var(--e-4);
    border-radius: var(--radio-xl);
    color: #ffffff;
    animation: entra calc(800ms * var(--mov)) var(--curva-salida)
      calc(200ms * var(--mov)) backwards;
  }

  .portada__fotos :deep(.carrusel__marco) {
    border-radius: var(--radio-xl);
    box-shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.55);
  }

  .portada__pie {
    display: block;
    font-size: var(--txt-sm);
    color: var(--marino-200);
  }

  .tarjeta {
    display: flex;
    align-items: center;
    margin: 0;
    padding: var(--e-10);
    border-radius: 0;
    box-shadow: none;
    animation: none;
  }

  .titulo {
    font-size: var(--txt-3xl);
  }
}
</style>
