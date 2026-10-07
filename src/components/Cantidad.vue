<script setup>
import { Minus, Plus, Trash2 } from 'lucide-vue-next'

/** Selector de cantidad: menos, numero, mas. En 1, el menos se vuelve quitar. */
const props = defineProps({
  valor: { type: Number, required: true },
  nombre: { type: String, required: true },
  maximo: { type: Number, default: 20 },
})
const emit = defineEmits(['cambiar'])
</script>

<template>
  <div class="cantidad" role="group" :aria-label="`Cantidad de ${nombre}`">
    <button
      type="button"
      class="cantidad__boton"
      :aria-label="
        props.valor <= 1
          ? `Quitar ${nombre} del carrito`
          : `Uno menos de ${nombre}`
      "
      @click="emit('cambiar', props.valor - 1)"
    >
      <component
        :is="props.valor <= 1 ? Trash2 : Minus"
        :size="18"
        aria-hidden="true"
      />
    </button>
    <output class="cantidad__numero" aria-live="polite">{{ valor }}</output>
    <button
      type="button"
      class="cantidad__boton"
      :disabled="props.valor >= maximo"
      :aria-label="`Uno más de ${nombre}`"
      @click="emit('cambiar', props.valor + 1)"
    >
      <Plus :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.cantidad {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radio-pildora);
  background: var(--superficie-3);
}

.cantidad__boton {
  display: grid;
  place-items: center;
  width: var(--objetivo-tactil);
  height: var(--objetivo-tactil);
  border-radius: 50%;
  color: var(--texto);
}

.cantidad__boton:hover:not(:disabled) {
  background: var(--borde);
}

.cantidad__boton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cantidad__numero {
  min-width: 2ch;
  text-align: center;
  font-weight: var(--peso-fuerte);
  font-variant-numeric: tabular-nums;
}
</style>
