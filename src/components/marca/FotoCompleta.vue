<script setup>
import { ref } from 'vue'

/**
 * Foto que nunca se corta: la imagen se ve completa (contain) y el espacio que
 * sobra se llena con la misma foto, desenfocada, para que no queden franjas
 * vacias. Aparece con un fundido suave cuando termina de cargar.
 */
defineProps({
  src: { type: String, required: true },
  srcset: { type: String, default: undefined },
  sizes: { type: String, default: undefined },
  alt: { type: String, default: '' },
  ancho: { type: [Number, String], default: undefined },
  alto: { type: [Number, String], default: undefined },
  /** 'lazy' o 'eager'. */
  carga: { type: String, default: 'lazy' },
})
const emit = defineEmits(['error'])

const lista = ref(false)
</script>

<template>
  <div class="foto-completa" :class="{ 'es-lista': lista }">
    <img
      class="foto-completa__fondo"
      :src="src"
      alt=""
      aria-hidden="true"
      :loading="carga"
      decoding="async"
    />
    <img
      class="foto-completa__imagen"
      :src="src"
      :srcset="srcset"
      :sizes="sizes"
      :alt="alt"
      :width="ancho"
      :height="alto"
      :loading="carga"
      decoding="async"
      @load="lista = true"
      @error="emit('error')"
    />
  </div>
</template>

<style scoped>
.foto-completa {
  position: relative;
  overflow: hidden;
  background: var(--superficie-3);
  isolation: isolate;
}

.foto-completa__fondo {
  position: absolute;
  inset: -12%;
  width: 124%;
  height: 124%;
  max-width: none;
  object-fit: cover;
  filter: blur(18px) saturate(1.2);
  opacity: 0;
  transform: scale(1.05);
  transition: opacity calc(500ms * var(--mov)) ease;
}

.foto-completa__imagen {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transform: scale(1.015);
  transition:
    opacity calc(500ms * var(--mov)) ease,
    transform calc(900ms * var(--mov)) var(--curva-salida);
}

.es-lista .foto-completa__fondo {
  opacity: 0.85;
}

.es-lista .foto-completa__imagen {
  opacity: 1;
  transform: none;
}
</style>
