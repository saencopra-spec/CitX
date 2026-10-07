<script setup>
/**
 * Marca de CitX: la bombilla con el visto bueno y, si se pide, el nombre.
 * El degradado es lo unico de la interfaz que lo lleva, por decision de diseno.
 */
defineProps({
  /** Alto de la bombilla en pixeles. */
  tamano: { type: Number, default: 56 },
  /** Muestra el nombre "CITX" debajo o al lado. */
  conNombre: { type: Boolean, default: false },
  /** 'vertical' pone el nombre debajo, 'horizontal' al lado. */
  direccion: { type: String, default: 'vertical' },
  /** Texto alternativo. Si esta vacio, la marca se considera decorativa. */
  alternativo: { type: String, default: 'CitX' },
})
</script>

<template>
  <span class="marca" :class="`marca--${direccion}`">
    <svg
      class="marca__bombilla"
      :style="{ height: `${tamano}px` }"
      viewBox="0 0 128 163"
      :role="alternativo ? 'img' : 'presentation'"
      :aria-label="alternativo || undefined"
      :aria-hidden="alternativo ? undefined : 'true'"
    >
      <defs>
        <linearGradient
          :id="`grad-${tamano}-${direccion}`"
          gradientUnits="userSpaceOnUse"
          x1="13"
          y1="0"
          x2="115"
          y2="163"
        >
          <stop offset="0%" stop-color="#0AD0C0" />
          <stop offset="38%" stop-color="#04AFA8" />
          <stop offset="72%" stop-color="#1F8DAD" />
          <stop offset="100%" stop-color="#2179D8" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        :stroke="`url(#grad-${tamano}-${direccion})`"
        stroke-width="11"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M42 108 C42 98 38 93 33 88 A43 43 0 1 1 95 88 C90 93 86 98 86 108 Z"
        />
        <circle cx="64" cy="56" r="21" />
        <path d="M53 57 l8 9 l23 -26" />
        <path d="M44 121 H84" />
        <path d="M46 135 H82" />
        <path d="M54 149 H74" />
      </g>
    </svg>

    <span
      v-if="conNombre"
      class="marca__nombre"
      :style="{ fontSize: `${tamano * 0.46}px` }"
      aria-hidden="true"
      >CITX</span
    >
  </span>
</template>

<style scoped>
.marca {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
}

.marca--vertical {
  flex-direction: column;
  gap: var(--e-1);
}

.marca__bombilla {
  width: auto;
  flex-shrink: 0;
}

.marca__nombre {
  font-family: var(--fuente-base);
  font-weight: var(--peso-extra);
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--marino-600);
}

:root[data-tema='oscuro'] .marca__nombre {
  color: var(--gris-0);
}

:root[data-contraste='alto'] .marca__nombre {
  color: var(--texto);
}
</style>
