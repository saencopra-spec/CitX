<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

/**
 * Encabezado de cada pantalla: boton para volver, titulo con la letra
 * manuscrita de la marca y una linea que explica para que sirve.
 */
const props = defineProps({
  titulo: { type: String, required: true },
  bajada: { type: String, default: '' },
  /** Ruta a la que vuelve. Si no se da, no hay boton de volver. */
  volver: { type: [String, Object], default: null },
})

const router = useRouter()

function regresar() {
  if (window.history.state?.back) router.back()
  else router.push(props.volver)
}
</script>

<template>
  <header class="encabezado">
    <button
      v-if="volver"
      type="button"
      class="boton-icono encabezado__volver"
      aria-label="Volver"
      @click="regresar"
    >
      <ArrowLeft :size="22" aria-hidden="true" />
    </button>
    <div class="encabezado__textos">
      <h1 class="encabezado__titulo titulo-manuscrito">{{ titulo }}</h1>
      <p v-if="bajada" class="encabezado__bajada">{{ bajada }}</p>
    </div>
    <div v-if="$slots.acciones" class="encabezado__acciones">
      <slot name="acciones" />
    </div>
  </header>
</template>

<style scoped>
.encabezado {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--e-2);
  padding-block: var(--e-5) var(--e-4);
}

.encabezado__volver {
  margin-left: calc(var(--e-3) * -1);
  flex-shrink: 0;
}

.encabezado__textos {
  flex: 1 1 13rem;
  min-width: 0;
  padding-top: 4px;
}

.encabezado__titulo {
  font-size: var(--txt-2xl);
}

.encabezado__bajada {
  margin-top: var(--e-1);
  color: var(--texto-suave);
  max-width: var(--ancho-lectura);
}

.encabezado__acciones {
  display: flex;
  gap: var(--e-2);
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .encabezado {
    padding-block: var(--e-8) var(--e-6);
  }

  .encabezado__titulo {
    font-size: var(--txt-3xl);
  }
}
</style>
