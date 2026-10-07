<script setup>
defineProps({
  icono: { type: [Object, Function], default: null },
  titulo: { type: String, required: true },
  texto: { type: String, default: '' },
})
</script>

<template>
  <div class="vacio">
    <span v-if="icono" class="vacio__icono" aria-hidden="true">
      <component :is="icono" :size="28" />
    </span>
    <p class="vacio__titulo">{{ titulo }}</p>
    <p v-if="texto" class="vacio__texto">{{ texto }}</p>
    <div v-if="$slots.default" class="vacio__accion">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.vacio {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--e-2);
  padding: var(--e-8) var(--e-5);
  border: 1.5px dashed var(--borde-fuerte);
  border-radius: var(--radio-lg);
}

.vacio__icono {
  color: var(--texto-tenue);
  margin-bottom: var(--e-1);
}

.vacio__titulo {
  font-weight: var(--peso-semi);
  font-size: var(--txt-md);
}

.vacio__texto {
  color: var(--texto-suave);
  max-width: 44ch;
}

.vacio__accion {
  margin-top: var(--e-3);
}
</style>
