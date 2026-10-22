<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  CalendarDays,
  GraduationCap,
  PackageSearch,
  ListChecks,
  HeartPulse,
  ArrowRight,
  Lock,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { entradaEscalonada } from '@/lib/movimiento'
import { estadoEnfermeria } from '@compartido/enfermeria.js'
import { claseDelMomento } from '@compartido/jornada.js'
import { fechaRelativa, horaLegible } from '@compartido/hora.js'

const auth = useAuth()
const raiz = ref(null)

const eventos = ref(null)
const recordatorios = ref(null)
const objetos = ref(null)
const horario = ref(null)

const enfermeria = estadoEnfermeria()
const conHorarioPropio = computed(() => auth.esProfesor || auth.esAdmin)

const resumenEventos = computed(() => {
  if (!eventos.value) return 'Actividades del colegio y de tu sección.'
  const e = eventos.value[0]
  return e
    ? `Próximo: ${e.titulo}, ${fechaRelativa(e.inicio)}.`
    : 'No hay eventos próximos por ahora.'
})

const resumenClases = computed(() => {
  const momento = claseDelMomento(horario.value?.dias)
  const base = conHorarioPropio.value
    ? 'Tu horario de profesor y el de cada sección.'
    : 'Especialidades, talleres, materias y tu horario.'
  if (!momento) return base
  const { estado, leccion, celda } = momento
  const donde = [celda.seccion, celda.aula].filter(Boolean).join(', ')
  const cuando =
    estado === 'ahora' ? 'Ahora' : `A las ${horaLegible(leccion.inicio)}`
  return `${cuando}: ${celda.materia}${donde ? ` (${donde})` : ''}.`
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
    tono: 'evento',
  },
  {
    nombre: 'clases',
    titulo: conHorarioPropio.value ? 'Clases y mi horario' : 'Clases',
    texto: resumenClases.value,
    icono: GraduationCap,
    tono: 'clases',
    query: conHorarioPropio.value ? { ver: 'mio' } : undefined,
  },
  {
    nombre: 'recordatorios',
    titulo: 'Recordatorios',
    texto: resumenRecordatorios.value,
    icono: ListChecks,
    tono: 'recordatorio',
    conCuenta: true,
  },
  {
    nombre: 'objetos-perdidos',
    titulo: 'Objetos perdidos',
    texto: resumenObjetos.value,
    icono: PackageSearch,
    tono: 'objeto',
    conCuenta: true,
  },
  {
    nombre: 'enfermeria',
    titulo: 'Enfermería',
    texto: enfermeria.mensaje,
    icono: HeartPulse,
    tono: 'salud',
    estado: enfermeria.abierta ? 'abierta' : 'cerrada',
  },
])

onMounted(async () => {
  entradaEscalonada(raiz.value)
  const tareas = [api.get('/eventos').then((d) => (eventos.value = d.eventos))]
  if (auth.usuario) {
    tareas.push(
      api
        .get('/recordatorios')
        .then((d) => (recordatorios.value = d.recordatorios)),
      api.get('/objetos').then((d) => (objetos.value = d.objetos))
    )
    const ruta = conHorarioPropio.value
      ? '/horarios/profesor'
      : auth.usuario.seccion
        ? `/horarios/${auth.usuario.seccion}`
        : null
    if (ruta)
      tareas.push(api.get(ruta).then((d) => (horario.value = d.horario)))
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
        <li
          v-for="(s, i) in secciones"
          :key="s.nombre"
          data-entra
          :class="{ 'es-ancha': i === 0 }"
        >
          <RouterLink
            :to="{ name: s.nombre, query: s.query }"
            class="seccion tocable"
            :data-tono="s.tono"
          >
            <span class="seccion__icono" aria-hidden="true"
              ><component :is="s.icono" :size="24"
            /></span>
            <span class="seccion__textos">
              <span class="seccion__titulo titulo-manuscrito">
                {{ s.titulo }}
                <Lock
                  v-if="s.conCuenta && !auth.usuario"
                  :size="14"
                  class="seccion__candado"
                  aria-label="necesita cuenta"
                />
              </span>
              <span
                class="seccion__resumen"
                :class="s.estado ? `es-${s.estado}` : ''"
                >{{
                  s.conCuenta && !auth.usuario
                    ? 'Necesitás una cuenta para usar esta parte.'
                    : s.texto
                }}</span
              >
            </span>
            <span class="seccion__flecha" aria-hidden="true"
              ><ArrowRight :size="18"
            /></span>
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
  display: grid;
  gap: var(--e-3);
}

.seccion {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--e-4);
  min-height: 92px;
  height: 100%;
  padding: var(--e-4) var(--e-4) var(--e-4) var(--e-4);
  border-radius: var(--radio-lg);
  border: 1px solid var(--borde);
  background: var(--superficie);
  color: var(--texto);
  text-decoration: none;
  box-shadow: var(--sombra-1);
  overflow: hidden;
  --tono: var(--principal);
  --tono-suave: var(--principal-suave);
}

.seccion[data-tono='evento'] {
  --tono: var(--accion);
  --tono-suave: var(--accion-suave);
}
.seccion[data-tono='recordatorio'] {
  --tono: var(--aviso);
  --tono-suave: var(--aviso-fondo);
}
.seccion[data-tono='objeto'] {
  --tono: var(--marino-400);
  --tono-suave: color-mix(in srgb, var(--marino-400) 12%, transparent);
}
.seccion[data-tono='salud'] {
  --tono: var(--error);
  --tono-suave: var(--error-fondo);
}

/* Una franja de color que crece desde la izquierda al pasar el mouse. */
.seccion::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--tono);
  transform: scaleY(0.4);
  opacity: 0;
  transition:
    transform var(--dur-media) var(--curva-salida),
    opacity var(--dur-media) ease;
}

.seccion:hover {
  color: var(--texto);
}

.seccion:hover::before,
.seccion:focus-visible::before {
  transform: none;
  opacity: 1;
}

.seccion__icono {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: var(--radio-md);
  background: var(--tono-suave);
  color: var(--tono);
  transition: transform var(--dur-media) var(--curva-rebote);
}

@media (hover: hover) and (pointer: fine) {
  .seccion:hover .seccion__icono {
    transform: rotate(-6deg) scale(1.06);
  }
}

.seccion__textos {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.seccion__titulo {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-lg);
  color: var(--texto-titulo);
}

.seccion__candado {
  color: var(--texto-tenue);
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
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--superficie-3);
  color: var(--texto-suave);
  transition:
    transform var(--dur-media) var(--curva-salida),
    background-color var(--dur-media) ease,
    color var(--dur-media) ease;
}

.seccion:hover .seccion__flecha {
  transform: translateX(3px);
  background: var(--tono);
  color: #ffffff;
}

.pie {
  margin-top: var(--e-6);
  font-size: var(--txt-sm);
}

@media (min-width: 768px) {
  .secciones {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .es-ancha {
    grid-column: span 2;
  }
}
</style>
