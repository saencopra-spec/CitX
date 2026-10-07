<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { CalendarClock, Coffee, Utensils } from 'lucide-vue-next'
import EncabezadoPagina from '@/components/EncabezadoPagina.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import Campo from '@/components/Campo.vue'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import {
  BLOQUES,
  DIAS_LECTIVOS,
  NOMBRE_DIA,
  bloqueActual,
} from '@compartido/jornada.js'
import { horaLegible, partesCR } from '@compartido/hora.js'

const auth = useAuth()

const pestanas = [
  { valor: 'horario', texto: 'Horario' },
  { valor: 'especialidades', texto: 'Especialidades' },
  { valor: 'materias', texto: 'Talleres y materias' },
]
const pestana = ref('horario')

const materias = ref([])
const seccionesConHorario = ref([])
const seccion = ref(auth.usuario?.seccion ?? '')
const horario = ref(null)
const cargandoHorario = ref(false)

const hoy = partesCR()
const diaHoy = DIAS_LECTIVOS[hoy.diaSemana - 1] ?? null
const dia = ref(diaHoy ?? 'lunes')

// La clase en curso se recalcula cada 30 segundos.
const actual = ref(bloqueActual())
let reloj = null

const especialidades = computed(() =>
  materias.value.filter((m) => m.tipo === 'especialidad')
)
const talleres = computed(() =>
  materias.value.filter((m) => m.tipo === 'taller')
)
const academicas = computed(() =>
  materias.value.filter((m) => m.tipo === 'academica')
)

/** Bloques del dia elegido, mezclando lecciones del horario con recreos. */
const filas = computed(() => {
  const celdas = horario.value?.dias?.[dia.value] ?? []
  return BLOQUES.map((b) => {
    const enCurso =
      dia.value === diaHoy && actual.value && actual.value.inicio === b.inicio
    if (b.tipo === 'pausa') return { ...b, enCurso }
    const celda = celdas[b.numero - 1] ?? {}
    return {
      ...b,
      materia: celda.materia || 'Lección libre',
      aula: celda.aula || '',
      enCurso,
    }
  })
})

async function cargarHorario() {
  if (!seccion.value) {
    horario.value = null
    return
  }
  cargandoHorario.value = true
  try {
    horario.value = (await api.get(`/horarios/${seccion.value}`)).horario
  } catch {
    horario.value = null
  } finally {
    cargandoHorario.value = false
  }
}

watch(seccion, cargarHorario)

onMounted(async () => {
  reloj = setInterval(() => (actual.value = bloqueActual()), 30000)
  const [m, h] = await Promise.allSettled([
    api.get('/clases'),
    api.get('/horarios'),
  ])
  if (m.status === 'fulfilled') materias.value = m.value.materias
  if (h.status === 'fulfilled') {
    seccionesConHorario.value = h.value.secciones
    if (!seccion.value && h.value.secciones.length)
      seccion.value = h.value.secciones[0]
  }
  cargarHorario()
})

onUnmounted(() => clearInterval(reloj))
</script>

<template>
  <div class="pagina">
    <EncabezadoPagina
      titulo="Clases"
      bajada="Tu horario de la semana y lo que se estudia en el CIT."
      :volver="{ name: 'guia' }"
    />

    <div
      class="segmentos pestanas"
      role="tablist"
      aria-label="Partes de clases"
    >
      <button
        v-for="p in pestanas"
        :id="`tab-${p.valor}`"
        :key="p.valor"
        type="button"
        role="tab"
        :aria-selected="pestana === p.valor"
        :aria-pressed="pestana === p.valor"
        :aria-controls="`panel-${p.valor}`"
        @click="pestana = p.valor"
      >
        {{ p.texto }}
      </button>
    </div>

    <!-- Horario -->
    <section
      v-if="pestana === 'horario'"
      id="panel-horario"
      role="tabpanel"
      aria-labelledby="tab-horario"
      class="panel"
    >
      <div class="controles">
        <Campo
          v-if="!auth.esEstudiante"
          id="ver-seccion"
          v-model="seccion"
          etiqueta="Sección"
          tipo="select"
          :opciones="seccionesConHorario.map((s) => ({ valor: s, texto: s }))"
        />
        <p v-else class="tu-seccion">
          Sección <strong>{{ auth.usuario.seccion }}</strong>
        </p>
        <div class="segmentos dias" role="group" aria-label="Día">
          <button
            v-for="d in DIAS_LECTIVOS"
            :key="d"
            type="button"
            :aria-pressed="dia === d"
            @click="dia = d"
          >
            {{ NOMBRE_DIA[d].slice(0, 3)
            }}<span class="solo-lectores">{{ NOMBRE_DIA[d].slice(3) }}</span>
            <span v-if="d === diaHoy" class="hoy" aria-label="hoy">hoy</span>
          </button>
        </div>
      </div>

      <div v-if="cargandoHorario" class="esqueleto" style="height: 360px" />
      <EstadoVacio
        v-else-if="!horario"
        :icono="CalendarClock"
        titulo="Esta sección todavía no tiene horario"
        texto="La administración lo carga desde el panel. Mientras tanto, preguntale a tu profesor guía."
      />
      <ol
        v-else
        class="horario"
        :aria-label="`Horario del ${NOMBRE_DIA[dia].toLowerCase()}`"
      >
        <li
          v-for="f in filas"
          :key="f.inicio"
          class="bloque"
          :class="{
            'bloque--pausa': f.tipo === 'pausa',
            'es-ahora': f.enCurso,
          }"
          :aria-current="f.enCurso ? 'time' : undefined"
        >
          <span class="bloque__hora">{{ horaLegible(f.inicio) }}</span>
          <span class="bloque__contenido">
            <template v-if="f.tipo === 'pausa'">
              <component
                :is="f.clave === 'almuerzo' ? Utensils : Coffee"
                :size="16"
                aria-hidden="true"
              />
              {{ f.nombre }}
            </template>
            <template v-else>
              <strong>{{ f.materia }}</strong>
              <span v-if="f.aula" class="bloque__aula">{{ f.aula }}</span>
            </template>
          </span>
          <span v-if="f.enCurso" class="etiqueta etiqueta--principal"
            >Ahora</span
          >
        </li>
      </ol>
      <p class="nota-ejemplo texto-suave">
        Horario de ejemplo. Lecciones de 40 minutos, de
        {{ horaLegible('07:00') }} a {{ horaLegible('15:30') }}.
      </p>
    </section>

    <!-- Especialidades -->
    <section
      v-else-if="pestana === 'especialidades'"
      id="panel-especialidades"
      role="tabpanel"
      aria-labelledby="tab-especialidades"
      class="panel"
    >
      <p class="introduccion">
        De décimo a duodécimo cada estudiante cursa una especialidad técnica. Al
        terminar obtiene el título de técnico en el nivel medio.
      </p>
      <ul class="especialidades">
        <li
          v-for="(m, i) in especialidades"
          :key="m.clave"
          class="especialidad"
        >
          <span class="especialidad__numero" aria-hidden="true">{{
            String(i + 1).padStart(2, '0')
          }}</span>
          <div>
            <h2 class="especialidad__nombre">{{ m.nombre }}</h2>
            <p>{{ m.descripcion }}</p>
          </div>
        </li>
      </ul>
    </section>

    <!-- Talleres y materias -->
    <section
      v-else
      id="panel-materias"
      role="tabpanel"
      aria-labelledby="tab-materias"
      class="panel"
    >
      <h2 class="subtitulo">Talleres exploratorios</h2>
      <p class="introduccion">
        En sétimo, octavo y noveno se rota por estos talleres para conocer las
        áreas técnicas antes de elegir especialidad.
      </p>
      <ul class="talleres">
        <li v-for="t in talleres" :key="t.clave" class="taller">
          <strong>{{ t.nombre }}</strong>
          <span>{{ t.descripcion }}</span>
        </li>
      </ul>

      <h2 class="subtitulo materias-titulo">Materias académicas</h2>
      <dl class="materias">
        <div v-for="m in academicas" :key="m.clave">
          <dt>{{ m.nombre }}</dt>
          <dd>{{ m.descripcion }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.pestanas {
  margin-bottom: var(--e-5);
  max-width: 100%;
}

.panel {
  max-width: 52rem;
}

.controles {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--e-4);
  margin-bottom: var(--e-4);
}

.tu-seccion {
  color: var(--texto-suave);
}

.dias button {
  position: relative;
  min-width: 52px;
}

.hoy {
  position: absolute;
  top: -8px;
  right: -4px;
  padding: 0 5px;
  border-radius: var(--radio-pildora);
  background: var(--principal);
  color: var(--sobre-principal);
  font-size: 0.625rem;
  line-height: 1.5;
}

.horario {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  overflow: hidden;
  background: var(--superficie);
}

.bloque {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--e-3);
  min-height: 56px;
  padding: var(--e-2) var(--e-4);
  border-bottom: 1px solid var(--borde-sutil);
}

.bloque:last-child {
  border-bottom: none;
}

.bloque__hora {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  font-variant-numeric: tabular-nums;
}

.bloque__contenido {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.bloque__aula {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.bloque--pausa {
  min-height: 40px;
  background: var(--superficie-2);
}

.bloque--pausa .bloque__contenido {
  flex-direction: row;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-suave);
}

.es-ahora {
  background: var(--principal-suave);
  box-shadow: inset 4px 0 0 var(--principal);
}

.nota-ejemplo {
  margin-top: var(--e-3);
  font-size: var(--txt-sm);
}

.introduccion {
  color: var(--texto-suave);
  margin-bottom: var(--e-5);
  max-width: var(--ancho-lectura);
}

.especialidades {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--borde);
}

.especialidad {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  gap: var(--e-3);
  padding: var(--e-5) 0;
  border-bottom: 1px solid var(--borde);
}

.especialidad__numero {
  font-family: var(--fuente-titulo);
  font-size: var(--txt-xl);
  color: var(--principal-fuerte);
  line-height: 1.1;
}

.especialidad__nombre {
  font-size: var(--txt-lg);
  margin-bottom: var(--e-1);
}

.especialidad p {
  color: var(--texto-suave);
  line-height: var(--alto-amplio);
}

.talleres {
  display: grid;
  gap: var(--e-3);
}

.taller {
  display: flex;
  flex-direction: column;
  gap: var(--e-1);
  padding: var(--e-4);
  border-left: 4px solid var(--accion);
  background: var(--superficie);
  border-radius: 0 var(--radio-md) var(--radio-md) 0;
}

.taller span {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.materias-titulo {
  margin-top: var(--e-8);
  margin-bottom: var(--e-4);
}

.materias {
  display: grid;
  gap: var(--e-3) var(--e-6);
}

.materias div {
  padding-bottom: var(--e-3);
  border-bottom: 1px solid var(--borde-sutil);
}

.materias dt {
  font-weight: var(--peso-semi);
}

.materias dd {
  margin: 0;
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

@media (min-width: 768px) {
  .especialidades {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--e-8);
  }

  .talleres {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .materias {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
