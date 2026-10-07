<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { sinMovimiento } from '@/lib/movimiento'

/**
 * Fotos reales del colegio que se van turnando con un acercamiento lento.
 * Si la persona pidio reducir el movimiento, se queda fija la primera.
 */
const props = defineProps({
  intervalo: { type: Number, default: 5500 },
})

const fotos = [
  { src: '/fotos/campus-aereo.webp', texto: 'Vista aérea del campus' },
  {
    src: '/fotos/portada-estudiantes.webp',
    texto: 'Estudiantes de secundaria',
  },
  { src: '/fotos/lugar-secundaria.webp', texto: 'Pasillo de secundaria' },
  {
    src: '/fotos/lugar-deportes.webp',
    texto: 'Piscina del complejo deportivo',
  },
  { src: '/fotos/lugar-vivero.webp', texto: 'Vivero Retoño' },
  { src: '/fotos/portada-guia.webp', texto: 'Laboratorio de innovación' },
]

const actual = ref(0)
const animado = ref(false)
let temporizador = null

onMounted(() => {
  if (sinMovimiento()) return
  animado.value = true
  temporizador = setInterval(() => {
    actual.value = (actual.value + 1) % fotos.length
  }, props.intervalo)
})

onUnmounted(() => clearInterval(temporizador))
</script>

<template>
  <div
    class="carrusel"
    :class="{ 'carrusel--animado': animado }"
    aria-hidden="true"
  >
    <img
      v-for="(f, i) in fotos"
      :key="f.src"
      :src="f.src"
      alt=""
      class="carrusel__foto"
      :class="{ 'es-visible': i === actual }"
      :loading="i === 0 ? 'eager' : 'lazy'"
      decoding="async"
    />
    <div class="carrusel__velo" />
    <div class="carrusel__puntos">
      <span
        v-for="(f, i) in fotos"
        :key="f.src"
        :class="{ 'es-activo': i === actual }"
      />
    </div>
  </div>
</template>

<style scoped>
.carrusel {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--marino-800);
}

.carrusel__foto {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.4s ease;
}

.carrusel__foto.es-visible {
  opacity: 1;
}

.carrusel--animado .carrusel__foto.es-visible {
  animation: acercar 9s ease-out forwards;
}

@keyframes acercar {
  from {
    transform: scale(1.02);
  }
  to {
    transform: scale(1.14) translate(-1.5%, -1%);
  }
}

.carrusel__velo {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(21, 35, 74, 0.35) 0%,
      rgba(21, 35, 74, 0.15) 35%,
      rgba(21, 35, 74, 0.85) 100%
    ),
    linear-gradient(120deg, rgba(3, 122, 118, 0.35), transparent 60%);
}

.carrusel__puntos {
  position: absolute;
  left: 50%;
  bottom: var(--e-4);
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}

.carrusel__puntos span {
  width: 6px;
  height: 6px;
  border-radius: var(--radio-pildora);
  background: rgba(255, 255, 255, 0.45);
  transition:
    width var(--dur-lenta) var(--curva),
    background-color var(--dur-lenta) var(--curva);
}

.carrusel__puntos .es-activo {
  width: 20px;
  background: #ffffff;
}
</style>
