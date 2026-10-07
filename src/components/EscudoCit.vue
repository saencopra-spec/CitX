<script setup>
/** Escudo oficial del Complejo Educativo CIT. */
defineProps({
  /** Alto en pixeles. */
  tamano: { type: Number, default: 48 },
  /** Texto alternativo. Vacio si el escudo es decorativo (ya hay texto al lado). */
  alternativo: { type: String, default: 'Escudo del Complejo Educativo CIT' },
})
</script>

<template>
  <img
    :src="tamano > 120 ? '/escudo-cit.png' : '/escudo-cit.webp'"
    :alt="alternativo"
    class="escudo"
    :style="{ height: `${tamano}px` }"
    :width="Math.round(tamano * 0.77)"
    :height="tamano"
    decoding="async"
  />
</template>

<style scoped>
.escudo {
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 3px rgba(13, 17, 23, 0.18));
}
</style>
