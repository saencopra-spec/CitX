<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { useConfiguracion } from '@/stores/configuracion'
import EscudoCit from '@/components/marca/EscudoCit.vue'

const router = useRouter()
const configuracion = useConfiguracion()

const raiz = ref(null)
const bombilla = ref(null)
let temporizador = null
let linea = null

function continuar() {
  clearTimeout(temporizador)
  router.replace({ name: 'empieza' })
}

onMounted(() => {
  const reducido = configuracion.movimientoReducido

  if (reducido) {
    temporizador = setTimeout(continuar, 900)
    return
  }

  const trazos = bombilla.value?.querySelectorAll('[data-trazo]') ?? []

  linea = gsap.timeline()

  // La bombilla se dibuja sola, trazo por trazo.
  trazos.forEach((trazo) => {
    const largo = trazo.getTotalLength?.() ?? 300
    gsap.set(trazo, { strokeDasharray: largo, strokeDashoffset: largo })
  })

  linea
    .to(trazos, {
      strokeDashoffset: 0,
      duration: 0.75,
      stagger: 0.075,
      ease: 'power2.inOut',
    })
    .from(
      '[data-nombre]',
      { opacity: 0, y: 14, duration: 0.45, ease: 'power2.out' },
      '-=0.2'
    )
    .from(
      '[data-lema]',
      { opacity: 0, y: 10, duration: 0.4, ease: 'power2.out' },
      '-=0.25'
    )

  temporizador = setTimeout(continuar, 2600)
})

onUnmounted(() => {
  clearTimeout(temporizador)
  linea?.kill()
})
</script>

<template>
  <main
    ref="raiz"
    class="bienvenida"
    tabindex="-1"
    @click="continuar"
    @keydown.enter="continuar"
    @keydown.space.prevent="continuar"
  >
    <div class="bienvenida__centro">
      <svg
        ref="bombilla"
        class="bienvenida__bombilla"
        viewBox="0 0 128 163"
        role="img"
        aria-label="CitX"
      >
        <defs>
          <linearGradient
            id="grad-bienvenida"
            gradientUnits="userSpaceOnUse"
            x1="13"
            y1="0"
            x2="115"
            y2="163"
          >
            <stop offset="0%" stop-color="#0AD0C0" />
            <stop offset="38%" stop-color="#04AFA8" />
            <stop offset="72%" stop-color="#1F8DAD" />
            <stop offset="100%" stop-color="#2179D8" />
          </linearGradient>
        </defs>
        <g
          fill="none"
          stroke="url(#grad-bienvenida)"
          stroke-width="11"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            data-trazo
            d="M42 108 C42 98 38 93 33 88 A43 43 0 1 1 95 88 C90 93 86 98 86 108 Z"
          />
          <circle data-trazo cx="64" cy="56" r="21" />
          <path data-trazo d="M53 57 l8 9 l23 -26" />
          <path data-trazo d="M44 121 H84" />
          <path data-trazo d="M46 135 H82" />
          <path data-trazo d="M54 149 H74" />
        </g>
      </svg>

      <p data-nombre class="bienvenida__nombre">CITX</p>
      <p data-lema class="bienvenida__lema">
        <EscudoCit :tamano="40" alternativo="" />
        Complejo Educativo CIT
      </p>
    </div>

    <button type="button" class="bienvenida__saltar" @click.stop="continuar">
      Continuar
    </button>
  </main>
</template>

<style scoped>
.bienvenida {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--e-10);
  min-height: 100dvh;
  padding: var(--e-8) var(--margen-lateral)
    calc(var(--e-8) + env(safe-area-inset-bottom));
  background: var(--fondo-elevado);
  cursor: pointer;
}

.bienvenida__centro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-2);
}

.bienvenida__bombilla {
  width: auto;
  height: clamp(118px, 26vh, 180px);
}

.bienvenida__nombre {
  font-family: var(--fuente-base);
  font-size: clamp(2.6rem, 11vw, 3.6rem);
  font-weight: var(--peso-extra);
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--marino-600);
}

:root[data-tema='oscuro'] .bienvenida__nombre {
  color: var(--gris-0);
}

.bienvenida__lema {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  margin-top: var(--e-3);
  font-family: var(--fuente-titulo);
  font-size: var(--txt-md);
  color: var(--texto-suave);
}

.bienvenida__saltar {
  position: absolute;
  bottom: calc(var(--e-8) + env(safe-area-inset-bottom));
  min-height: var(--objetivo-tactil);
  padding-inline: var(--e-5);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-tenue);
  border-radius: var(--radio-pildora);
}

.bienvenida__saltar:hover {
  color: var(--texto);
  background: var(--superficie-hover);
}
</style>
