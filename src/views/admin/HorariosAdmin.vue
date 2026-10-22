<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Save, Copy } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/estructura/EncabezadoPanel.vue'
import HorarioProfesor from '@/components/guia/HorarioProfesor.vue'
import Campo from '@/components/formularios/Campo.vue'
import { api } from '@/lib/api'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { opcionesSeccion } from '@/lib/errores'
import { SECCIONES, NOMBRE_NIVEL } from '@compartido/permisos.js'
import { LECCIONES, DIAS_LECTIVOS, NOMBRE_DIA } from '@compartido/jornada.js'
import { horaLegible } from '@compartido/hora.js'

const avisos = useAvisos()
const confirmar = useConfirmar()

/** 'secciones' edita el horario de cada seccion; 'profesores', el de cada profesor. */
const modo = ref('secciones')
const profesores = ref([])
const profesorId = ref('')
const profesorElegido = computed(() =>
  profesores.value.find((p) => p.id === profesorId.value)
)

async function cargarProfesores() {
  try {
    profesores.value = (await api.get('/horarios/profesores')).profesores
    if (!profesorId.value && profesores.value.length)
      profesorId.value = profesores.value[0].id
  } catch (e) {
    avisos.error(e.message)
  }
}

watch(modo, (m) => {
  if (m === 'profesores' && !profesores.value.length) cargarProfesores()
})

const seccion = ref('10-A')
const dia = ref('lunes')
const dias = ref(null)
const materias = ref([])
const cargando = ref(false)
const guardando = ref(false)
const cambiado = ref(false)
const existia = ref(false)

const opciones = opcionesSeccion(SECCIONES, NOMBRE_NIVEL)

function vacio() {
  return Object.fromEntries(
    DIAS_LECTIVOS.map((d) => [
      d,
      LECCIONES.map(() => ({ materia: '', aula: '' })),
    ])
  )
}

async function cargar() {
  cargando.value = true
  try {
    const { horario } = await api.get(`/horarios/${seccion.value}`)
    existia.value = Boolean(horario)
    dias.value = horario ? horario.dias : vacio()
    cambiado.value = false
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
}

watch(seccion, async (nueva, anterior) => {
  if (cambiado.value) {
    const si = await confirmar.preguntar({
      titulo: 'Tenés cambios sin guardar',
      mensaje: `Si cambiás de sección se pierden los cambios de la ${anterior}.`,
      aceptar: 'Cambiar sin guardar',
    })
    if (!si) {
      seccion.value = anterior
      return
    }
  }
  cargar()
})

function copiarLunes() {
  for (const d of DIAS_LECTIVOS.slice(1)) {
    dias.value[d] = dias.value.lunes.map((c) => ({ ...c }))
  }
  cambiado.value = true
  avisos.info('Copiamos el lunes a toda la semana. Revisá y guardá.')
}

async function guardar() {
  guardando.value = true
  try {
    await api.put(`/horarios/${seccion.value}`, { dias: dias.value })
    cambiado.value = false
    existia.value = true
    avisos.exito(`Guardamos el horario de la ${seccion.value}.`)
  } catch (e) {
    avisos.error(e.message)
  } finally {
    guardando.value = false
  }
}

onMounted(async () => {
  cargar()
  try {
    materias.value = (await api.get('/clases')).materias.map((m) => m.nombre)
  } catch {
    materias.value = []
  }
})
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Horarios"
      ayuda="Elegí la sección y el día, escribí la materia y el aula de cada lección y tocá Guardar. Los recreos y el almuerzo ya están puestos."
    />

    <div class="segmentos modo" role="group" aria-label="Qué horario editar">
      <button
        type="button"
        :aria-pressed="modo === 'secciones'"
        @click="modo = 'secciones'"
      >
        Secciones
      </button>
      <button
        type="button"
        :aria-pressed="modo === 'profesores'"
        @click="modo = 'profesores'"
      >
        Profesores
      </button>
    </div>

    <div v-if="modo === 'profesores'" class="profesores">
      <Campo
        id="hor-profesor"
        v-model="profesorId"
        etiqueta="Profesor"
        tipo="select"
        vacio="No hay profesores todavía"
        :opciones="
          profesores.map((p) => ({
            valor: p.id,
            texto: `${p.nombre}${p.tieneHorario ? '' : ' (sin horario)'}`,
          }))
        "
      />
      <HorarioProfesor
        v-if="profesorElegido"
        :key="profesorElegido.id"
        :ruta="`/horarios/profesores/${profesorElegido.id}`"
        :de="profesorElegido.nombre"
        :materias="materias"
      />
    </div>

    <template v-else>
      <div class="controles">
        <Campo
          id="hor-seccion"
          v-model="seccion"
          etiqueta="Sección"
          tipo="select"
          :opciones="opciones"
        />
        <div class="segmentos" role="group" aria-label="Día">
          <button
            v-for="d in DIAS_LECTIVOS"
            :key="d"
            type="button"
            :aria-pressed="dia === d"
            @click="dia = d"
          >
            {{ NOMBRE_DIA[d] }}
          </button>
        </div>
      </div>

      <p v-if="!cargando && !existia" class="nota nota--aviso">
        Esta sección todavía no tiene horario. Lo que escribás aquí se crea al
        guardar.
      </p>

      <div v-if="cargando || !dias" class="esqueleto" style="height: 420px" />
      <div v-else class="tabla-envoltura">
        <table class="tabla">
          <caption class="solo-lectores">
            Horario de la
            {{
              seccion
            }},
            {{
              NOMBRE_DIA[dia]
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">Lección</th>
              <th scope="col">Materia</th>
              <th scope="col">Aula</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in LECCIONES" :key="l.numero">
              <th scope="row" class="leccion">
                {{ l.numero }}. {{ horaLegible(l.inicio) }}
              </th>
              <td>
                <label class="solo-lectores" :for="`m-${i}`"
                  >Materia de la lección {{ l.numero }}</label
                >
                <input
                  :id="`m-${i}`"
                  v-model="dias[dia][i].materia"
                  class="entrada celda"
                  list="materias-horario"
                  maxlength="50"
                  @input="cambiado = true"
                />
              </td>
              <td>
                <label class="solo-lectores" :for="`a-${i}`"
                  >Aula de la lección {{ l.numero }}</label
                >
                <input
                  :id="`a-${i}`"
                  v-model="dias[dia][i].aula"
                  class="entrada celda celda--aula"
                  maxlength="30"
                  @input="cambiado = true"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <datalist id="materias-horario">
          <option v-for="m in materias" :key="m" :value="m" />
        </datalist>
      </div>

      <div class="barra-guardar">
        <button
          v-if="dia === 'lunes'"
          type="button"
          class="boton boton--contorno"
          @click="copiarLunes"
        >
          <Copy :size="18" aria-hidden="true" /> Copiar el lunes a toda la
          semana
        </button>
        <button
          type="button"
          class="boton boton--accion"
          :disabled="guardando || !cambiado"
          @click="guardar"
        >
          <Save :size="18" aria-hidden="true" />
          {{
            guardando
              ? 'Guardando...'
              : cambiado
                ? 'Guardar cambios'
                : 'Sin cambios'
          }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.modo {
  margin-bottom: var(--e-5);
}

.profesores {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
  max-width: 60rem;
}

.profesores > :first-child {
  max-width: 24rem;
}

.controles {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--e-4);
  margin-bottom: var(--e-4);
}

.controles .campo {
  width: 12rem;
}

.nota {
  margin-bottom: var(--e-4);
}

.leccion {
  white-space: nowrap;
  font-weight: var(--peso-semi);
  color: var(--texto-suave);
  background: transparent;
  border-bottom: 1px solid var(--borde-sutil);
}

.celda {
  min-height: 40px;
  padding: var(--e-2) var(--e-3);
  border-radius: var(--radio-sm);
  min-width: 10rem;
}

.celda--aula {
  min-width: 6rem;
}

.barra-guardar {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--e-3);
  padding: var(--e-4) 0;
  margin-top: var(--e-3);
  background: var(--fondo);
}
</style>
