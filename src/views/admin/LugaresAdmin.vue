<script setup>
import { onMounted, ref } from 'vue'
import { Pencil, Lock } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import Dialogo from '@/components/Dialogo.vue'
import Campo from '@/components/Campo.vue'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { useAvisos } from '@/stores/avisos'
import { CATEGORIAS } from '@/datos/campus'

const avisos = useAvisos()
const { errores, limpiar, mostrar } = usarErrores()

const lugares = ref([])
const cargando = ref(true)
const editando = ref(null)
const formulario = ref({})
const guardando = ref(false)

const opcionesCategoria = Object.entries(CATEGORIAS).map(([valor, c]) => ({
  valor,
  texto: c.nombre,
}))

function editar(l) {
  editando.value = l
  formulario.value = { ...l }
  limpiar()
}

async function guardar() {
  guardando.value = true
  limpiar()
  try {
    const { nombre, categoria, descripcion, horario, restringido, notaAcceso } =
      formulario.value
    const { lugar } = await api.put(`/lugares/${editando.value.clave}`, {
      nombre,
      categoria,
      descripcion,
      horario,
      restringido,
      notaAcceso,
    })
    Object.assign(editando.value, lugar)
    avisos.exito(`Guardamos ${lugar.nombre}. Ya se ve así en el mapa.`)
    editando.value = null
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    guardando.value = false
  }
}

onMounted(async () => {
  try {
    lugares.value = (await api.get('/lugares')).lugares
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Lugares del mapa"
      ayuda="Aquí cambiás el nombre, la descripción y el horario de cada zona. La forma en el mapa no cambia. Si marcás un lugar como restringido, aparece rayado y con candado."
    />

    <div v-if="cargando" class="esqueleto" style="height: 400px" />
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead>
          <tr>
            <th scope="col">Lugar</th>
            <th scope="col">Tipo</th>
            <th scope="col">Horario</th>
            <th scope="col"><span class="solo-lectores">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in lugares" :key="l.clave">
            <td>
              <strong>{{ l.nombre }}</strong>
              <span
                v-if="l.restringido"
                class="etiqueta etiqueta--error restringido"
                ><Lock :size="12" aria-hidden="true" /> Restringido</span
              >
            </td>
            <td>{{ CATEGORIAS[l.categoria]?.nombre }}</td>
            <td>{{ l.horario || 'Sin horario' }}</td>
            <td class="acciones">
              <button
                type="button"
                class="boton boton--contorno boton--pequeno"
                @click="editar(l)"
              >
                <Pencil :size="16" aria-hidden="true" /> Editar<span
                  class="solo-lectores"
                >
                  {{ l.nombre }}</span
                >
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialogo
      :abierto="Boolean(editando)"
      :titulo="editando ? `Editar ${editando.nombre}` : ''"
      ancho="34rem"
      @cerrar="editando = null"
    >
      <form
        id="form-lugar"
        class="formulario"
        novalidate
        @submit.prevent="guardar"
      >
        <Campo
          id="lu-nombre"
          v-model="formulario.nombre"
          etiqueta="Nombre"
          obligatorio
          :maximo="60"
          :error="errores.nombre"
        />
        <Campo
          id="lu-categoria"
          v-model="formulario.categoria"
          etiqueta="Tipo de lugar"
          tipo="select"
          :opciones="opcionesCategoria"
          :error="errores.categoria"
        />
        <Campo
          id="lu-descripcion"
          v-model="formulario.descripcion"
          etiqueta="Descripción"
          tipo="textarea"
          :maximo="400"
          :error="errores.descripcion"
        />
        <Campo
          id="lu-horario"
          v-model="formulario.horario"
          etiqueta="Horario"
          placeholder="Lunes a viernes, 7:00 a. m. a 3:30 p. m."
          :maximo="120"
        />
        <div class="interruptor-fila">
          <button
            id="lu-restringido"
            type="button"
            role="switch"
            class="interruptor"
            :aria-checked="formulario.restringido"
            @click="formulario.restringido = !formulario.restringido"
          />
          <label for="lu-restringido">Acceso restringido</label>
        </div>
        <Campo
          v-if="formulario.restringido"
          id="lu-nota"
          v-model="formulario.notaAcceso"
          etiqueta="Quién puede entrar"
          placeholder="Solo personal autorizado."
          :maximo="200"
        />
      </form>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="editando = null"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-lugar"
          class="boton boton--accion"
          :disabled="guardando"
        >
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.restringido {
  margin-left: var(--e-2);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.interruptor-fila {
  display: flex;
  align-items: center;
  gap: var(--e-3);
}
</style>
