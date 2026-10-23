<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

/**
 * Paginacion numerada (anterior, numeros, siguiente) para listas que la API
 * entrega de a una pagina. Con muchas paginas muestra la primera, la ultima
 * y las vecinas de la actual, con "…" en el medio.
 */
const props = defineProps({
  pagina: { type: Number, required: true },
  total: { type: Number, required: true },
  porPagina: { type: Number, default: 20 },
  etiqueta: { type: String, default: 'Páginas' },
})
const emit = defineEmits(['cambiar'])

const paginas = computed(() =>
  Math.max(1, Math.ceil(props.total / props.porPagina))
)

const numeros = computed(() => {
  const n = paginas.value
  const actual = props.pagina
  const lista = []
  for (let i = 1; i <= n; i++) {
    if (i === 1 || i === n || Math.abs(i - actual) <= 1) lista.push(i)
    else if (lista.at(-1) !== '…') lista.push('…')
  }
  return lista
})

function ir(n) {
  if (n < 1 || n > paginas.value || n === props.pagina) return
  emit('cambiar', n)
}
</script>

<template>
  <nav v-if="paginas > 1" class="paginacion" :aria-label="etiqueta">
    <button
      type="button"
      class="paginacion__boton"
      :disabled="pagina <= 1"
      @click="ir(pagina - 1)"
    >
      <ChevronLeft :size="18" aria-hidden="true" />
      <span>Anterior</span>
    </button>
    <ol class="paginacion__numeros">
      <li v-for="(n, i) in numeros" :key="`${n}-${i}`">
        <span v-if="n === '…'" class="paginacion__salto" aria-hidden="true"
          >…</span
        >
        <button
          v-else
          type="button"
          class="paginacion__numero"
          :aria-current="n === pagina ? 'page' : undefined"
          @click="ir(n)"
        >
          <span class="solo-lectores">Página </span>{{ n }}
        </button>
      </li>
    </ol>
    <button
      type="button"
      class="paginacion__boton"
      :disabled="pagina >= paginas"
      @click="ir(pagina + 1)"
    >
      <span>Siguiente</span>
      <ChevronRight :size="18" aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped>
.paginacion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--e-2);
  margin-top: var(--e-4);
  font-size: var(--txt-sm);
}

.paginacion__numeros {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.paginacion__boton,
.paginacion__numero {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: var(--objetivo-tactil);
  min-height: var(--objetivo-tactil);
  padding: 0 var(--e-3);
  border: 1px solid var(--borde);
  border-radius: var(--radio-sm);
  background: var(--superficie);
  color: var(--texto);
  font-weight: var(--peso-semi);
  font-variant-numeric: tabular-nums;
}

.paginacion__boton:hover:not(:disabled),
.paginacion__numero:hover {
  background: var(--superficie-hover);
}

.paginacion__boton:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.paginacion__numero[aria-current='page'] {
  border-color: var(--principal);
  background: var(--principal-suave);
}

.paginacion__salto {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  min-height: var(--objetivo-tactil);
  color: var(--texto-tenue);
}

@media (max-width: 480px) {
  .paginacion__boton span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .paginacion__boton {
    padding: 0;
  }
}
</style>
