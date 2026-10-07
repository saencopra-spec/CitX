<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Receipt, ChevronRight } from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import EstadoVacio from '@/components/avisos/EstadoVacio.vue'
import { api } from '@/lib/api'
import { colones } from '@compartido/dinero.js'
import { fechaRelativa, horaDe } from '@compartido/hora.js'
import { NOMBRE_ESTADO } from '@compartido/pedidos.js'

const pedidos = ref([])
const cargando = ref(true)
const error = ref('')

const tonos = {
  recibido: 'info',
  preparacion: 'aviso',
  listo: 'exito',
  entregado: 'neutra',
}

function resumen(p) {
  const nombres = p.items.map((i) =>
    i.cantidad > 1 ? `${i.cantidad} ${i.nombre}` : i.nombre
  )
  return nombres.length > 2
    ? `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más`
    : nombres.join(' y ')
}

async function cargar() {
  cargando.value = true
  try {
    pedidos.value = (await api.get('/pedidos/mios')).pedidos
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="pagina">
    <EncabezadoPagina
      titulo="Mis pedidos"
      bajada="Tus pedidos de la soda, del más reciente al más viejo."
      :volver="{ name: 'soda' }"
    />

    <div v-if="cargando" class="lista">
      <div
        v-for="n in 3"
        :key="n"
        class="esqueleto"
        style="height: 84px; border-radius: var(--radio-md)"
      />
    </div>

    <EstadoVacio
      v-else-if="error"
      titulo="No pudimos cargar tus pedidos"
      :texto="error"
    >
      <button type="button" class="boton boton--accion" @click="cargar">
        Intentar de nuevo
      </button>
    </EstadoVacio>

    <EstadoVacio
      v-else-if="!pedidos.length"
      :icono="Receipt"
      titulo="Todavía no has pedido nada"
      texto="Cuando hagás tu primer pedido en la soda, aparece aquí."
    >
      <RouterLink :to="{ name: 'soda' }" class="boton boton--accion"
        >Ver el menú</RouterLink
      >
    </EstadoVacio>

    <ul v-else class="lista">
      <li v-for="p in pedidos" :key="p.codigo">
        <RouterLink
          :to="{ name: 'pedido', params: { codigo: p.codigo } }"
          class="pedido"
        >
          <span class="pedido__codigo">{{ p.codigo }}</span>
          <span class="pedido__info">
            <span class="pedido__resumen">{{ resumen(p) }}</span>
            <span class="pedido__fecha"
              >{{ fechaRelativa(p.creadoEn) }}, {{ horaDe(p.creadoEn) }} ·
              {{ colones(p.total) }}</span
            >
          </span>
          <span class="etiqueta" :class="`etiqueta--${tonos[p.estado]}`">{{
            NOMBRE_ESTADO[p.estado]
          }}</span>
          <ChevronRight :size="20" aria-hidden="true" class="pedido__flecha" />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  max-width: 48rem;
}

.pedido {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'codigo info flecha'
    'codigo estado flecha';
  align-items: center;
  gap: var(--e-1) var(--e-4);
  padding: var(--e-4);
  border-radius: var(--radio-md);
  background: var(--superficie);
  border: 1px solid var(--borde);
  color: var(--texto);
  text-decoration: none;
}

.pedido:hover {
  background: var(--superficie-hover);
  color: var(--texto);
}

.pedido__codigo {
  grid-area: codigo;
  font-family: var(--fuente-mono);
  font-weight: var(--peso-extra);
  font-size: var(--txt-md);
  letter-spacing: 0.08em;
}

.pedido__info {
  grid-area: info;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pedido__resumen {
  font-weight: var(--peso-semi);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pedido__fecha {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.pedido .etiqueta {
  grid-area: estado;
  justify-self: start;
}

.pedido__flecha {
  grid-area: flecha;
  color: var(--texto-tenue);
}
</style>
