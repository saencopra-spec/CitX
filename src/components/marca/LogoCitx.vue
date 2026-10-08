<script setup>
/**
 * Marca de CitX: la bombilla con el visto bueno y, si se pide, el nombre.
 * El degradado es lo unico de la interfaz que lo lleva, por decision de diseno.
 * Los trazos llevan `data-trazo` y la rosca `data-base` para que la
 * bienvenida pueda animarlos.
 */
const sufijo = Math.random().toString(36).slice(2, 9)
const idGradiente = `grad-citx-${sufijo}`
const idMascara = `rosca-citx-${sufijo}`

defineProps({
  /** Alto de la bombilla en pixeles. Con 0, el alto lo pone el CSS de afuera. */
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
      :style="tamano ? { height: `${tamano}px` } : undefined"
      viewBox="13.6 1.4 63.2 76"
      :role="alternativo ? 'img' : 'presentation'"
      :aria-label="alternativo || undefined"
      :aria-hidden="alternativo ? undefined : 'true'"
    >
      <defs>
        <linearGradient
          :id="idGradiente"
          gradientUnits="userSpaceOnUse"
          x1="22"
          y1="6"
          x2="62"
          y2="76"
        >
          <stop offset="0%" stop-color="#63D1B4" />
          <stop offset="45%" stop-color="#5AB4DC" />
          <stop offset="100%" stop-color="#436DDD" />
        </linearGradient>
        <mask :id="idMascara">
          <rect x="0" y="0" width="91" height="78" fill="#fff" />
          <g fill="#000" transform="rotate(-4 46 61)">
            <rect x="35.8" y="56.6" width="20.8" height="2.4" rx="1.2" />
            <rect
              x="35.8"
              y="62.6"
              width="20.8"
              height="2.4"
              rx="1.2"
              transform="rotate(-2 46 64)"
            />
          </g>
        </mask>
      </defs>
      <g
        fill="none"
        :stroke="`url(#${idGradiente})`"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          data-trazo
          stroke-width="8"
          d="M27.5 52.6 C24.5 47 18 42 18 33 A27.2 27.2 0 0 1 72.4 33 C72.4 42 66 47 63 52.6 Z"
        />
        <path
          data-trazo
          stroke-width="5.8"
          d="M41.6 51.5 L36 42.3 A15 15 0 1 1 54.6 42.3 L50 51.5"
        />
        <path
          data-trazo
          stroke-width="5.8"
          d="M40.6 31.5 L46 37.6 L56.6 26.4"
        />
      </g>
      <path
        data-base
        :fill="`url(#${idGradiente})`"
        :mask="`url(#${idMascara})`"
        d="M26.5 52 H65.5 L63.4 56 V65 Q63.4 69.5 58.5 70 L53.5 70.5 Q54 77 46.2 77 Q38.4 77 38.8 70.5 L33 70 Q28.2 69.5 28.2 65 V56 Z"
      />
    </svg>

    <span
      v-if="conNombre"
      class="marca__nombre"
      :style="tamano ? { fontSize: `${tamano * 0.46}px` } : undefined"
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
