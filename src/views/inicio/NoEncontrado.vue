<script setup>
import { RouterLink } from 'vue-router'
import { Compass } from 'lucide-vue-next'
</script>

<template>
  <section class="no-encontrado">
    <Compass :size="56" :stroke-width="1.5" aria-hidden="true" />
    <h1>Esta página no existe</h1>
    <p>
      Puede que el enlace esté viejo o que se haya escrito con un error.
      Volvamos a un lugar conocido.
    </p>
    <RouterLink to="/menu" class="boton boton--principal">
      Ir al menú principal
    </RouterLink>
  </section>
</template>

<style scoped>
.no-encontrado {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--e-4);
  min-height: 70dvh;
  padding: var(--e-8) var(--margen-lateral);
  text-align: center;
  color: var(--texto-suave);
}

.no-encontrado h1 {
  color: var(--texto);
}

.no-encontrado p {
  max-width: 42ch;
}

.no-encontrado .boton {
  margin-top: var(--e-2);
}
</style>
