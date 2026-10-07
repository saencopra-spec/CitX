<script setup>
/** Vista previa del mapa del CIT, limpio y sin pines, para la tarjeta del menu. */
</script>

<template>
  <img
    src="/mapa/mapa-cit.webp"
    alt=""
    class="mini"
    width="726"
    height="713"
    loading="lazy"
    decoding="async"
  />
</template>

<style scoped>
.mini {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 45%;
  background: #ffffff;
}
</style>
