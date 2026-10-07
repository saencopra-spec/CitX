<script setup>
import { onMounted, ref, watch } from 'vue'
import { Search, ScrollText } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import { api } from '@/lib/api'
import { useAvisos } from '@/stores/avisos'
import { fechaRelativa, horaDe } from '@compartido/hora.js'

const avisos = useAvisos()
const registros = ref([])
const cargando = ref(true)
const busqueda = ref('')
let temporizador = null

async function cargar() {
  cargando.value = true
  try {
    const q = busqueda.value
      ? `?buscar=${encodeURIComponent(busqueda.value)}`
      : ''
    registros.value = (await api.get(`/bitacora${q}`)).registros
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
}

watch(busqueda, () => {
  clearTimeout(temporizador)
  temporizador = setTimeout(cargar, 300)
})

onMounted(cargar)
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Bitácora"
      ayuda="Registro de lo importante que se hace en el panel: cuentas creadas o borradas, cambios de permisos, invitaciones, anuncios. Sirve para saber quién hizo qué y cuándo."
    />

    <div class="buscador barra">
      <Search :size="20" aria-hidden="true" />
      <label for="buscar-bitacora" class="solo-lectores"
        >Buscar en la bitácora</label
      >
      <input
        id="buscar-bitacora"
        v-model="busqueda"
        type="search"
        class="entrada"
        placeholder="Buscar por persona o acción"
      />
    </div>

    <div
      v-if="cargando && !registros.length"
      class="esqueleto"
      style="height: 300px"
    />
    <EstadoVacio
      v-else-if="!registros.length"
      :icono="ScrollText"
      titulo="No hay registros"
      texto="Cuando se hagan cambios desde el panel, aparecen aquí."
    />
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead>
          <tr>
            <th scope="col">Cuándo</th>
            <th scope="col">Quién</th>
            <th scope="col">Qué hizo</th>
            <th scope="col">Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in registros" :key="r.id">
            <td class="nowrap">
              {{ fechaRelativa(r.creadoEn) }}, {{ horaDe(r.creadoEn) }}
            </td>
            <td>{{ r.usuarioNombre }}</td>
            <td>
              <strong>{{ r.accion }}</strong>
            </td>
            <td class="detalle">{{ r.detalle }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.barra {
  max-width: 26rem;
  margin-bottom: var(--e-4);
}

.nowrap {
  white-space: nowrap;
}

.detalle {
  color: var(--texto-suave);
  min-width: 14rem;
}
</style>
