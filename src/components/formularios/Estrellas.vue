<script setup>
import { Star } from 'lucide-vue-next'

/** Muestra la calificacion. Con `editable` sirve para elegir de 1 a 5. */
const props = defineProps({
  valor: { type: Number, default: 0 },
  cantidad: { type: Number, default: 0 },
  editable: { type: Boolean, default: false },
  nombre: { type: String, default: 'calificacion' },
})
const emit = defineEmits(['elegir'])
</script>

<template>
  <span v-if="!editable" class="estrellas">
    <Star :size="14" class="estrellas__icono" aria-hidden="true" />
    <span v-if="valor">
      {{ valor.toFixed(1) }}
      <span class="solo-lectores"> de 5 estrellas,</span>
      <span class="estrellas__cuenta"
        >({{ cantidad
        }}<span class="solo-lectores"> calificaciones</span>)</span
      >
    </span>
    <span v-else class="estrellas__cuenta">Sin calificar</span>
  </span>

  <fieldset v-else class="elegir">
    <legend class="solo-lectores">Calificación de 1 a 5 estrellas</legend>
    <label v-for="n in 5" :key="n" class="elegir__opcion">
      <input
        type="radio"
        :name="nombre"
        :value="n"
        :checked="props.valor === n"
        class="solo-lectores"
        @change="emit('elegir', n)"
      />
      <Star
        :size="28"
        :class="{ 'es-llena': n <= props.valor }"
        aria-hidden="true"
      />
      <span class="solo-lectores"
        >{{ n }} {{ n === 1 ? 'estrella' : 'estrellas' }}</span
      >
    </label>
  </fieldset>
</template>

<style scoped>
.estrellas {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
}

.estrellas__icono {
  color: var(--aviso);
  fill: currentColor;
}

.estrellas__cuenta {
  color: var(--texto-tenue);
  font-weight: var(--peso-normal);
}

.elegir {
  display: flex;
  gap: 2px;
  border: none;
  padding: 0;
}

.elegir__opcion {
  display: grid;
  place-items: center;
  width: var(--objetivo-tactil);
  height: var(--objetivo-tactil);
  border-radius: var(--radio-sm);
  cursor: pointer;
  color: var(--borde-fuerte);
}

.elegir__opcion:has(input:focus-visible) {
  outline: 3px solid var(--foco);
}

.elegir__opcion svg {
  transition: transform var(--dur-rapida) var(--curva-rebote);
}

.elegir__opcion:hover svg {
  transform: scale(1.15);
}

.es-llena {
  color: var(--aviso);
  fill: currentColor;
}
</style>
