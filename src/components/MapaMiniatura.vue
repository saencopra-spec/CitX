<script setup>
import { ZONAS, LIENZO } from '@/datos/campus'

/** Version decorativa del mapa para la tarjeta del menu principal. */
const categoriaDe = {
  bosque: 'naturaleza',
  cacaotal: 'naturaleza',
  armonia: 'naturaleza',
  veterinaria: 'naturaleza',
  preescolar: 'academico',
  primaria: 'academico',
  secundaria: 'academico',
  laboratorios: 'academico',
  talleres: 'academico',
  plaza: 'servicios',
  soda: 'alimentacion',
  enfermeria: 'servicios',
  bienestar: 'servicios',
  'zona-recreativa': 'servicios',
  canchas: 'deporte',
  piscina: 'deporte',
}
</script>

<template>
  <svg
    class="mini"
    :viewBox="`0 0 ${LIENZO.ancho} ${LIENZO.alto}`"
    aria-hidden="true"
    focusable="false"
  >
    <rect :width="LIENZO.ancho" :height="LIENZO.alto" class="mini__suelo" />
    <path
      d="M0 212 H1000 M0 508 H1000 M202 212 V508 M478 212 V700 M672 212 V508 M805 212 V700"
      class="mini__camino"
    />
    <template v-for="z in ZONAS" :key="z.clave">
      <path
        v-if="z.d"
        :d="z.d"
        class="mini__zona"
        :data-cat="categoriaDe[z.clave] ?? 'otro'"
      />
      <rect
        v-else
        :x="z.x"
        :y="z.y"
        :width="z.w"
        :height="z.h"
        :rx="z.r"
        class="mini__zona"
        :data-cat="categoriaDe[z.clave] ?? 'otro'"
      />
    </template>
  </svg>
</template>

<style scoped>
.mini {
  width: 100%;
  height: 100%;
}

.mini__suelo {
  fill: var(--mapa-suelo);
}

.mini__camino {
  stroke: var(--mapa-camino);
  stroke-width: 14;
  fill: none;
  stroke-linecap: round;
}

.mini__zona {
  fill: var(--mapa-otro);
  stroke: var(--mapa-borde);
  stroke-width: 3;
}

.mini__zona[data-cat='naturaleza'] {
  fill: var(--mapa-naturaleza);
}
.mini__zona[data-cat='academico'] {
  fill: var(--mapa-academico);
}
.mini__zona[data-cat='servicios'] {
  fill: var(--mapa-servicios);
}
.mini__zona[data-cat='alimentacion'] {
  fill: var(--mapa-alimentacion);
}
.mini__zona[data-cat='deporte'] {
  fill: var(--mapa-deporte);
}
</style>
