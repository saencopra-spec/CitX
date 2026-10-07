<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  CalendarDays,
  GraduationCap,
  PackageSearch,
  ListChecks,
  HeartPulse,
  ChevronRight,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { entradaEscalonada } from '@/lib/movimiento'
import { estadoEnfermeria } from '@compartido/enfermeria.js'
import { bloqueActual, DIAS_LECTIVOS } from '@compartido/jornada.js'
import { fechaRelativa, horaLegible, partesCR } from '@compartido/hora.js'

const auth = useAuth()
const raiz = ref(null)

const eventos = ref(null)
const recordatorios = ref(null)
const objetos = ref(null)
const horario = ref(null)

const enfermeria = estadoEnfermeria()

const resumenEventos = computed(() => {
  if (!eventos.value) return 'Actividades del colegio y de tu sección.'
  const e = eventos.value[0]
  return e
    ? `Próximo: ${e.titulo}, ${fechaRelativa(e.inicio)}.`
    : 'No hay eventos próximos por ahora.'
})

const resumenClases = computed(() => {
  const bloque = bloqueActual()
  if (!horario.value || !bloque)
    return 'Especialidades, talleres, materias y tu horario.'
  if (bloque.tipo === 'pausa') return `Ahora: ${bloque.nombre.toLowerCase()}.`
  const dia = DIAS_LECTIVOS[partesCR().diaSemana - 1]
  const celda = horario.value.dias?.[dia]?.[bloque.numero - 1]
  return celda?.materia
    ? `Ahora: ${celda.materia}${celda.aula ? `, ${celda.aula}` : ''}.`
    : 'Especialidades, talleres, materias y tu horario.'
})

const resumenRecordatorios = computed(() => {
  if (!recordatorios.value) return 'Tareas y fechas que no se te pueden pasar.'
  const pendientes = recordatorios.value.filter((r) => !r.hecho).length
  if (!pendientes) return 'Estás al día. No tenés pendientes.'
  return pendientes === 1
    ? 'Tenés 1 pendiente.'
    : `Tenés ${pendientes} pendientes.`
})

const resumenObjetos = computed(() => {
  if (!objetos.value) return '¿Perdiste algo? Revisá lo que se ha encontrado.'
  const n = objetos.value.length
  return n === 1
    ? 'Hay 1 objeto esperando a su dueño.'
    : `Hay ${n} objetos esperando a su dueño.`
})

const secciones = computed(() => [
  {
    nombre: 'eventos',
    titulo: 'Próximos eventos',
    texto: resumenEventos.value,
    icono: CalendarDays,
  },
  {
    nombre: 'clases',
    titulo: 'Clases',
    texto: resumenClases.value,
    icono: GraduationCap,
  },
  {
    nombre: 'objetos-perdidos',
    titulo: 'Objetos perdidos',
    texto: resumenObjetos.value,
    icono: PackageSearch,
  },
  {
    nombre: 'recordatorios',
    titulo: 'Recordatorios',
    texto: resumenRecordatorios.value,
    icono: ListChecks,
  },
  {
    nombre: 'enfermeria',
    titulo: 'Enfermería',
    texto: enfermeria.mensaje,
    icono: HeartPulse,
    estado: enfermeria.abierta ? 'abierta' : 'cerrada',
  },
])

onMounted(async () => {
  entradaEscalonada(raiz.value)
  const tareas = [
    api.get('/eventos').then((d) => (eventos.value = d.eventos)),
    api
      .get('/recordatorios')
      .then((d) => (recordatorios.value = d.recordatorios)),
    api.get('/objetos').then((d) => (objetos.value = d.objetos)),
  ]
  if (auth.usuario?.seccion) {
    tareas.push(
      api
        .get(`/horarios/${auth.usuario.seccion}`)
        .then((d) => (horario.value = d.horario))
    )
  }
  await Promise.allSettled(tareas)
})
</script>

<template>
  <div ref="raiz" class="pagina guia">
    <EncabezadoPagina
      titulo="Guía digital"
      bajada="Lo que pasa en el colegio, tus clases y lo que tenés pendiente."
    />

    <nav aria-label="Secciones de la guía">
      <ul class="secciones">
        <li v-for="s in secciones" :key="s.nombre" data-entra>
          <RouterLink :to="{ name: s.nombre }" class="seccion">
            <span class="seccion__icono" aria-hidden="true"
              ><component :is="s.icono" :size="22"
            /></span>
            <span class="seccion__textos">
              <span class="seccion__titulo titulo-manuscrito">{{
                s.titulo
              }}</span>
              <span
                class="seccion__resumen"
                :class="s.estado ? `es-${s.estado}` : ''"
                >{{ s.texto }}</span
              >
            </span>
            <ChevronRight
              :size="22"
              class="seccion__flecha"
              aria-hidden="true"
            />
          </RouterLink>
        </li>
      </ul>
    </nav>

    <p class="pie texto-suave">
      Jornada de {{ horaLegible('07:00') }} a {{ horaLegible('15:30') }}, de
      lunes a viernes.
    </p>
  </div>
</template>

<style scoped>
.secciones {
  display: flex;
  flex-direction: column;
  max-width: 46rem;
  border-top: 1.5px solid var(--borde-fuerte);
}

.seccion {
  display: flex;
  align-items: center;
  gap: var(--e-4);
  min-height: 84px;
  padding: var(--e-4) var(--e-2);
  border-bottom: 1.5px solid var(--borde-fuerte);
  color: var(--texto);
  text-decoration: none;
  transition: background-color var(--dur-rapida) var(--curva-suave);
}

.seccion:hover {
  background: var(--superficie-hover);
  color: var(--texto);
}

.seccion__icono {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: var(--radio-md);
  background: var(--principal-suave);
  color: var(--principal-fuerte);
}

.seccion__textos {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.seccion__titulo {
  font-size: var(--txt-lg);
  color: var(--texto-titulo);
}

.seccion__resumen {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.es-abierta {
  color: var(--exito);
  font-weight: var(--peso-semi);
}

.seccion__flecha {
  color: var(--texto);
  flex-shrink: 0;
  transition: transform var(--dur-media) var(--curva);
}

.seccion:hover .seccion__flecha {
  transform: translateX(4px);
}

.pie {
  margin-top: var(--e-6);
  font-size: var(--txt-sm);
}
</style>
