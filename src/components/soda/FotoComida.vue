<script setup>
import { ref } from 'vue'
import { UtensilsCrossed } from 'lucide-vue-next'
import FotoCompleta from '@/components/marca/FotoCompleta.vue'

/**
 * Foto de un producto, lugar u objeto, siempre completa (sin recortes), con un
 * respaldo sobrio si no hay o si falla.
 */
defineProps({
  src: { type: String, default: null },
  alt: { type: String, default: '' },
})
const fallo = ref(false)
</script>

<template>
  <div class="foto-comida">
    <FotoCompleta
      v-if="src && !fallo"
      :src="src"
      :alt="alt"
      class="foto-comida__foto"
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

.foto-comida__foto {
  width: 100%;
  height: 100%;
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
