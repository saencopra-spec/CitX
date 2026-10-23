<script setup>
import { onMounted, ref } from 'vue'
import { History } from 'lucide-vue-next'
import HistorialSanciones from './HistorialSanciones.vue'
import { useSanciones } from '@/stores/sanciones'

/** "Mi historial" en la cuenta: alertas y sanciones de la soda. */
const sanciones = useSanciones()
const cargando = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    await sanciones.cargarHistorial()
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <section class="bloque mi-historial" aria-labelledby="t-mi-historial">
    <h2 id="t-mi-historial" class="mi-historial__titulo">
      <History :size="18" aria-hidden="true" /> Mi historial
    </h2>
    <p class="mi-historial__explica">
      Alertas y sanciones de la soda por pedidos que no se recogieron.
    </p>
    <p v-if="cargando" class="mi-historial__explica">Cargando...</p>
    <p v-else-if="error" class="mi-historial__explica">{{ error }}</p>
    <HistorialSanciones v-else :items="sanciones.historial" />
  </section>
</template>

<style scoped>
.mi-historial__titulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  margin: 0;
  font-size: var(--txt-md);
}

.mi-historial__explica {
  margin: 0;
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}
</style>
