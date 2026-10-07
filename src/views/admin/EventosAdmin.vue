<script setup>
import { onMounted, ref } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/estructura/EncabezadoPanel.vue'
import FormularioEvento from '@/components/guia/FormularioEvento.vue'
import { api } from '@/lib/api'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { fechaRelativa, horaLegible } from '@compartido/hora.js'

const avisos = useAvisos()
const confirmar = useConfirmar()

const vista = ref('proximos')
const eventos = ref([])
const cargando = ref(true)
const abierto = ref(false)
const editando = ref(null)

async function cargar() {
  cargando.value = true
  try {
    eventos.value = (
      await api.get(`/eventos${vista.value === 'pasados' ? '?pasados=1' : ''}`)
    ).eventos.filter((e) =>
      vista.value === 'pasados' ? new Date(e.inicio) < new Date() : true
    )
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
}

function cambiarVista(v) {
  vista.value = v
  cargar()
}

function nuevo() {
  editando.value = null
  abierto.value = true
}

function editar(e) {
  editando.value = e
  abierto.value = true
}

async function borrar(e) {
  const si = await confirmar.preguntar({
    titulo: `¿Borrar "${e.titulo}"?`,
    mensaje: 'Desaparece para todas las personas. Esto no se puede deshacer.',
  })
  if (!si) return
  try {
    await api.delete(`/eventos/${e.id}`)
    eventos.value = eventos.value.filter((x) => x.id !== e.id)
    avisos.exito('Evento borrado.')
  } catch (err) {
    avisos.error(err.message)
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Eventos"
      ayuda="Al publicar un evento, a las personas a las que va dirigido les llega un aviso en CitX. Los profesores también pueden publicar desde la guía."
    >
      <template #acciones>
        <button type="button" class="boton boton--accion" @click="nuevo">
          <Plus :size="18" aria-hidden="true" /> Nuevo evento
        </button>
      </template>
    </EncabezadoPanel>

    <div class="segmentos vista" role="group" aria-label="Qué eventos ver">
      <button
        type="button"
        :aria-pressed="vista === 'proximos'"
        @click="cambiarVista('proximos')"
      >
        Próximos
      </button>
      <button
        type="button"
        :aria-pressed="vista === 'pasados'"
        @click="cambiarVista('pasados')"
      >
        Pasados
      </button>
    </div>

    <div v-if="cargando" class="esqueleto" style="height: 300px" />
    <p v-else-if="!eventos.length" class="texto-suave">
      No hay eventos {{ vista === 'pasados' ? 'pasados' : 'próximos' }}.
    </p>
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead>
          <tr>
            <th scope="col">Evento</th>
            <th scope="col">Cuándo</th>
            <th scope="col">Para quién</th>
            <th scope="col">Publicó</th>
            <th scope="col"><span class="solo-lectores">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in eventos" :key="e.id">
            <td>
              <strong>{{ e.titulo }}</strong>
            </td>
            <td>{{ fechaRelativa(e.inicio) }}, {{ horaLegible(e.hora) }}</td>
            <td>{{ e.todos ? 'Todo el colegio' : e.secciones.join(', ') }}</td>
            <td>{{ e.autorNombre }}</td>
            <td class="acciones">
              <button
                type="button"
                class="boton-icono"
                :aria-label="`Editar ${e.titulo}`"
                @click="editar(e)"
              >
                <Pencil :size="18" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="boton-icono peligro"
                :aria-label="`Borrar ${e.titulo}`"
                @click="borrar(e)"
              >
                <Trash2 :size="18" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormularioEvento
      :abierto="abierto"
      :evento="editando"
      @cerrar="abierto = false"
      @guardado="cargar"
    />
  </div>
</template>

<style scoped>
.vista {
  margin-bottom: var(--e-4);
}

.peligro {
  color: var(--error);
}
</style>
