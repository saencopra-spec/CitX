<script setup>
import { onMounted } from 'vue'
import { useSanciones } from '@/stores/sanciones'
import { textoFin } from '@compartido/sanciones.js'

/**
 * Tarjeta roja de la soda para quien tiene una sancion activa. El menu se
 * sigue viendo; solo se apagan los botones de pedir y agregar.
 */
const sanciones = useSanciones()

onMounted(() => {
  // Si falla la consulta, la API igual rechaza el pedido al pagar.
  sanciones.cargarEstado().catch(() => {})
})
</script>

<template>
  <section
    v-if="sanciones.sancion"
    class="tarjeta-sancion"
    role="alert"
    aria-labelledby="t-sancion"
  >
    <h2 id="t-sancion" class="tarjeta-sancion__titulo">
      <span aria-hidden="true">🚫</span> No podés hacer pedidos por ahora
    </h2>
    <p><strong>Razón:</strong> {{ sanciones.sancion.razon }}</p>
    <p v-if="sanciones.sancion.permanente">
      <strong>Sanción permanente</strong>, hablá con administración.
    </p>
    <p v-else>
      <strong>Podrás volver a pedir:</strong>
      {{ textoFin(sanciones.sancion.hasta) }}
    </p>
    <p class="tarjeta-sancion__nota">
      Si ya tenías un pedido hecho, todavía podés recogerlo.
    </p>
  </section>
</template>

<style scoped>
.tarjeta-sancion {
  display: flex;
  flex-direction: column;
  gap: var(--e-1);
  margin-bottom: var(--e-4);
  padding: var(--e-4) var(--e-5);
  border: 1px solid var(--error);
  border-left-width: 6px;
  border-radius: var(--radio-md);
  background: var(--error-fondo);
  color: var(--texto);
  font-size: var(--txt-sm);
}

.tarjeta-sancion__titulo {
  margin: 0 0 var(--e-1);
  color: var(--error);
  font-size: var(--txt-md);
}

.tarjeta-sancion p {
  margin: 0;
}

.tarjeta-sancion__nota {
  color: var(--texto-suave);
}
</style>
