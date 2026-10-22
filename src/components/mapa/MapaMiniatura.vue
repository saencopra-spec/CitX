<script setup>
import FotoCompleta from '@/components/marca/FotoCompleta.vue'

/** Vista previa del mapa del CIT, limpio, sin pines y sin recortar. */
</script>

<template>
  <FotoCompleta
    src="/mapa/mapa-cit-1452.webp"
    class="mini"
    ancho="1452"
    alto="1426"
  />
</template>

<style scoped>
.mini {
  width: 100%;
  height: 100%;
  background: #ffffff;
}

.mini :deep(.foto-completa__fondo) {
  display: none;
}
</style>
