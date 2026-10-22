<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { sinMovimiento } from '@/lib/movimiento'

/**
 * Fotos reales del colegio que se van turnando con un fundido. Cada foto se
 * ve completa (sin recortes): el marco tiene la misma proporcion que las
 * fotos (3:2) y lo que sobre se llena con la misma foto desenfocada.
 * Si la persona pidio reducir el movimiento, se queda fija la primera.
 */
const props = defineProps({
  intervalo: { type: Number, default: 5000 },
  /** Ancho que ocupa en pantalla, para que el navegador elija la foto justa. */
  sizes: { type: String, default: '(min-width: 1024px) 45vw, 100vw' },
  /** Muestra el nombre de cada foto abajo. */
  conPie: { type: Boolean, default: false },
})

const fotos = [
  { nombre: 'estudiantes', texto: 'Estudiantes de secundaria' },
  { nombre: 'secundaria', texto: 'Pasillo de secundaria' },
  { nombre: 'innovacion', texto: 'Laboratorio de innovación' },
  { nombre: 'piscina', texto: 'Piscina del complejo deportivo' },
  { nombre: 'vivero', texto: 'Vivero Retoño' },
].map((f) => ({
  ...f,
  src: `/fotos/carrusel/${f.nombre}-1280.webp`,
  srcset: `/fotos/carrusel/${f.nombre}-1280.webp 1280w, /fotos/carrusel/${f.nombre}-1920.webp 1920w`,
}))

const actual = ref(0)
let temporizador = null

function ir(i) {
  actual.value = (i + fotos.length) % fotos.length
  reiniciar()
}

function reiniciar() {
  clearInterval(temporizador)
  if (sinMovimiento()) return
  temporizador = setInterval(() => {
    actual.value = (actual.value + 1) % fotos.length
  }, props.intervalo)
}

onMounted(reiniciar)
onUnmounted(() => clearInterval(temporizador))
</script>

<template>
  <figure class="carrusel">
    <div class="carrusel__marco">
      <div
        v-for="(f, i) in fotos"
        :key="f.src"
        class="carrusel__capa"
        :class="{ 'es-visible': i === actual }"
        :aria-hidden="i !== actual"
      >
        <img
          :src="f.src"
          alt=""
          class="carrusel__fondo"
          aria-hidden="true"
          :loading="i === 0 ? 'eager' : 'lazy'"
          decoding="async"
        />
        <img
          :src="f.src"
          :srcset="f.srcset"
          :sizes="sizes"
          :alt="f.texto"
          class="carrusel__foto"
          :loading="i === 0 ? 'eager' : 'lazy'"
          decoding="async"
        />
      </div>
    </div>
    <figcaption class="carrusel__pie">
      <Transition name="pie" mode="out-in">
        <span v-if="conPie" :key="actual" class="carrusel__texto">{{
          fotos[actual].texto
        }}</span>
      </Transition>
      <span class="carrusel__puntos">
        <button
          v-for="(f, i) in fotos"
          :key="f.src"
          type="button"
          :class="{ 'es-activo': i === actual }"
          :aria-label="`Ver foto: ${f.texto}`"
          :aria-pressed="i === actual"
          @click="ir(i)"
        />
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.carrusel {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.carrusel__marco {
  position: relative;
  aspect-ratio: 3 / 2;
  border-radius: inherit;
  overflow: hidden;
  background: var(--marino-800);
}

.carrusel__capa {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: scale(1.02);
  filter: blur(6px);
  transition:
    opacity calc(1s * var(--mov)) ease,
    transform calc(1.4s * var(--mov)) var(--curva-salida),
    filter calc(1s * var(--mov)) ease;
}

.carrusel__capa.es-visible {
  opacity: 1;
  transform: none;
  filter: none;
}

.carrusel__fondo {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  max-width: none;
  object-fit: cover;
  filter: blur(20px) saturate(1.2);
  opacity: 0.8;
}

.carrusel__foto {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.carrusel__pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
  min-height: 24px;
}

.carrusel__texto {
  font-size: var(--txt-sm);
  color: inherit;
  opacity: 0.85;
}

.carrusel__puntos {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.carrusel__puntos button {
  position: relative;
  width: 22px;
  height: 24px;
  -webkit-tap-highlight-color: transparent;
}

.carrusel__puntos button::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: var(--radio-pildora);
  background: currentColor;
  opacity: 0.35;
  transform: translateY(-50%);
  transition:
    width calc(400ms * var(--mov)) var(--curva-salida),
    opacity calc(300ms * var(--mov)) ease;
}

.carrusel__puntos button.es-activo {
  width: 32px;
}

.carrusel__puntos button.es-activo::after {
  width: 22px;
  opacity: 1;
}

.pie-enter-active,
.pie-leave-active {
  transition:
    opacity calc(260ms * var(--mov)) ease,
    transform calc(320ms * var(--mov)) var(--curva-salida);
}

.pie-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.pie-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
