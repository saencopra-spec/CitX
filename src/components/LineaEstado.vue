<script setup>
import { computed } from 'vue'
import {
  ClipboardCheck,
  CookingPot,
  BellRing,
  PackageCheck,
} from 'lucide-vue-next'
import { ESTADOS_PEDIDO, NOMBRE_ESTADO } from '@compartido/pedidos.js'
import { horaDe } from '@compartido/hora.js'

/**
 * Linea de tiempo del pedido. La barra avanza hasta el estado actual y cada
 * paso muestra la hora en que ocurrio. El estado se indica con texto e icono,
 * no solo con color.
 */
const props = defineProps({
  estado: { type: String, required: true },
  historial: { type: Array, default: () => [] },
})

const iconos = {
  recibido: ClipboardCheck,
  preparacion: CookingPot,
  listo: BellRing,
  entregado: PackageCheck,
}

const explicaciones = {
  recibido: 'La soda ya tiene tu pedido.',
  preparacion: 'Lo están preparando.',
  listo: 'Pasá a retirarlo con tu código.',
  entregado: 'Ya lo retiraste. Buen provecho.',
}

const indice = computed(() => ESTADOS_PEDIDO.indexOf(props.estado))
const progreso = computed(
  () => (indice.value / (ESTADOS_PEDIDO.length - 1)) * 100
)

function horaDel(estado) {
  const paso = [...props.historial].reverse().find((h) => h.estado === estado)
  return paso ? horaDe(paso.en) : ''
}
</script>

<template>
  <ol class="linea" :style="{ '--progreso': `${progreso}%` }">
    <li
      v-for="(e, i) in ESTADOS_PEDIDO"
      :key="e"
      class="paso"
      :class="{ 'es-hecho': i < indice, 'es-actual': i === indice }"
      :aria-current="i === indice ? 'step' : undefined"
    >
      <span class="paso__punto" aria-hidden="true">
        <component :is="iconos[e]" :size="20" />
      </span>
      <span class="paso__texto">
        <strong>{{ NOMBRE_ESTADO[e] }}</strong>
        <span v-if="i === indice">{{ explicaciones[e] }}</span>
        <span v-if="i <= indice && horaDel(e)" class="paso__hora">{{
          horaDel(e)
        }}</span>
        <span class="solo-lectores">{{
          i < indice
            ? '(listo)'
            : i === indice
              ? '(estado actual)'
              : '(pendiente)'
        }}</span>
      </span>
    </li>
  </ol>
</template>

<style scoped>
.linea {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--e-6);
  padding-left: 0;
}

.linea::before,
.linea::after {
  content: '';
  position: absolute;
  left: 21px;
  top: 22px;
  bottom: 22px;
  width: 4px;
  border-radius: 4px;
  background: var(--borde);
}

.linea::after {
  background: var(--principal);
  bottom: auto;
  height: calc((100% - 44px) * var(--progreso) / 100);
  transition: height calc(900ms * var(--mov)) var(--curva);
}

.paso {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: var(--e-4);
}

.paso__punto {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--superficie);
  border: 3px solid var(--borde);
  color: var(--texto-tenue);
  transition:
    background-color var(--dur-lenta) var(--curva),
    border-color var(--dur-lenta) var(--curva),
    color var(--dur-lenta) var(--curva),
    transform var(--dur-lenta) var(--curva-rebote);
}

.es-hecho .paso__punto {
  background: var(--principal);
  border-color: var(--principal);
  color: var(--sobre-principal);
}

.es-actual .paso__punto {
  background: var(--principal-suave);
  border-color: var(--principal);
  color: var(--principal-fuerte);
  transform: scale(1.08);
  animation: latido calc(1800ms * var(--mov)) ease-in-out infinite;
}

@keyframes latido {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--foco-halo);
  }
  50% {
    box-shadow: 0 0 0 10px transparent;
  }
}

.paso__texto {
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  color: var(--texto-tenue);
}

.es-hecho .paso__texto,
.es-actual .paso__texto {
  color: var(--texto);
}

.paso__texto span {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.paso__hora {
  font-variant-numeric: tabular-nums;
}
</style>
