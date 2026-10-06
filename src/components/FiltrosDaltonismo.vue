<script setup>
/**
 * Matrices de color para simular como ve una persona con daltonismo.
 * Se aplican sobre <body> desde tokens.css segun data-daltonismo.
 * El SVG no ocupa espacio ni se lee: solo guarda las definiciones.
 */
</script>

<template>
  <svg class="filtros-daltonismo" aria-hidden="true" focusable="false">
    <defs>
      <filter id="filtro-protanopia" color-interpolation-filters="linearRGB">
        <feColorMatrix
          type="matrix"
          values="0.567 0.433 0 0 0
                  0.558 0.442 0 0 0
                  0 0.242 0.758 0 0
                  0 0 0 1 0"
        />
      </filter>
      <filter id="filtro-deuteranopia" color-interpolation-filters="linearRGB">
        <feColorMatrix
          type="matrix"
          values="0.625 0.375 0 0 0
                  0.7 0.3 0 0 0
                  0 0.3 0.7 0 0
                  0 0 0 1 0"
        />
      </filter>
      <filter id="filtro-tritanopia" color-interpolation-filters="linearRGB">
        <feColorMatrix
          type="matrix"
          values="0.95 0.05 0 0 0
                  0 0.433 0.567 0 0
                  0 0.475 0.525 0 0
                  0 0 0 1 0"
        />
      </filter>
    </defs>
  </svg>
</template>

<style scoped>
.filtros-daltonismo {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
