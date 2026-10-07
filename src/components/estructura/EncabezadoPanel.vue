<script setup>
/** Titulo de cada seccion del panel. */
defineProps({
  titulo: { type: String, required: true },
  ayuda: { type: String, default: '' },
})
</script>

<template>
  <header class="encabezado">
    <div class="encabezado__fila">
      <h1 class="encabezado__titulo">{{ titulo }}</h1>
      <div v-if="$slots.acciones" class="encabezado__acciones">
        <slot name="acciones" />
      </div>
    </div>
    <p v-if="ayuda" class="encabezado__ayuda">{{ ayuda }}</p>
  </header>
</template>

<style scoped>
.encabezado {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding-block: var(--e-6) var(--e-5);
}

.encabezado__fila {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
}

.encabezado__titulo {
  font-size: var(--txt-2xl);
}

.encabezado__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}

.encabezado__ayuda {
  max-width: 62ch;
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}
</style>
