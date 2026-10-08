<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { useConfiguracion } from '@/stores/configuracion'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import LogoCitx from '@/components/marca/LogoCitx.vue'

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
  const base = bombilla.value?.querySelector('[data-base]')

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
      base,
      { opacity: 0, y: 6, duration: 0.4, ease: 'power2.out' },
      '-=0.35'
    )
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
      <span ref="bombilla" class="bienvenida__bombilla">
        <LogoCitx :tamano="0" alternativo="CitX" />
      </span>

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
  display: inline-flex;
}

.bienvenida__bombilla :deep(.marca__bombilla) {
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
