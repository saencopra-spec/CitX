<script setup>
import { ref } from 'vue'
import { UtensilsCrossed } from 'lucide-vue-next'

/** Foto de un producto o lugar, con un respaldo sobrio si no hay o si falla. */
defineProps({
  src: { type: String, default: null },
  alt: { type: String, default: '' },
})
const fallo = ref(false)
</script>

<template>
  <div class="foto-comida">
    <img
      v-if="src && !fallo"
      :src="src"
      :alt="alt"
      loading="lazy"
      decoding="async"
      @error="fallo = true"
    />
    <div
      v-else
      class="foto-comida__respaldo"
      role="img"
      :aria-label="alt || undefined"
      :aria-hidden="alt ? undefined : 'true'"
    >
      <UtensilsCrossed :size="26" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.foto-comida {
  position: relative;
  overflow: hidden;
  background: var(--superficie-3);
}

.foto-comida img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foto-comida__respaldo {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--texto-tenue);
  background:
    repeating-linear-gradient(
      45deg,
      transparent 0 10px,
      color-mix(in srgb, var(--borde) 50%, transparent) 10px 11px
    ),
    var(--superficie-3);
}
</style>
