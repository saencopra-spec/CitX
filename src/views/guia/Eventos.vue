<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  CalendarPlus,
  CalendarX2,
  MapPin,
  Users,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/EncabezadoPagina.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import FormularioEvento from '@/components/FormularioEvento.vue'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { entradaEscalonada } from '@/lib/movimiento'
import { useLugares } from '@/stores/lugares'
import {
  fechaRelativa,
  horaLegible,
  fechaLarga,
  partesCR,
} from '@compartido/hora.js'

const auth = useAuth()
const avisos = useAvisos()
const confirmar = useConfirmar()

const eventos = ref([])
const cargando = ref(true)
const error = ref('')
const formularioAbierto = ref(false)
const editando = ref(null)
const lista = ref(null)

const lugaresStore = useLugares()
lugaresStore.cargar()
const nombreLugar = (clave) => lugaresStore.nombreDe(clave)

/** Eventos agrupados por dia, como una agenda. */
const dias = computed(() => {
  const grupos = new Map()
  for (const e of eventos.value) {
    const clave = partesCR(e.inicio).iso
    if (!grupos.has(clave))
      grupos.set(clave, { clave, inicio: e.inicio, eventos: [] })
    grupos.get(clave).eventos.push(e)
  }
  return [...grupos.values()]
})

function tituloDia(inicio) {
  const relativo = fechaRelativa(inicio)
  const largo = fechaLarga(inicio)
  return relativo === largo
    ? largo
    : `${relativo[0].toUpperCase()}${relativo.slice(1)}, ${largo}`
}

function destinatarios(e) {
  if (e.todos) return 'Todo el colegio'
  if (e.secciones.length > 6) return `${e.secciones.length} secciones`
  return `Secciones ${e.secciones.join(', ')}`
}

function puedeEditar(e) {
  return (
    auth.puede('eventos.gestionarTodos') ||
    (auth.puede('eventos.publicar') && e.autorId === auth.usuario?.id)
  )
}

function nuevo() {
  editando.value = null
  formularioAbierto.value = true
}

function editar(e) {
  editando.value = e
  formularioAbierto.value = true
}

async function borrar(e) {
  const si = await confirmar.preguntar({
    titulo: `¿Borrar "${e.titulo}"?`,
    mensaje:
      'El evento desaparece para todas las personas. Esto no se puede deshacer.',
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

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    eventos.value = (await api.get('/eventos')).eventos
    await nextTick()
    entradaEscalonada(lista.value)
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
      titulo="Próximos eventos"
      :bajada="
        auth.usuario?.seccion
          ? `Los de todo el colegio y los de la sección ${auth.usuario.seccion}.`
          : 'Actividades del colegio.'
      "
      :volver="{ name: 'guia' }"
    >
      <template v-if="auth.puede('eventos.publicar')" #acciones>
        <button
          type="button"
          class="boton boton--accion boton--pequeno"
          @click="nuevo"
        >
          <CalendarPlus :size="18" aria-hidden="true" /> Publicar
        </button>
      </template>
    </EncabezadoPagina>

    <div v-if="cargando" class="agenda">
      <div
        v-for="n in 3"
        :key="n"
        class="esqueleto"
        style="height: 132px; border-radius: var(--radio-lg)"
      />
    </div>

    <EstadoVacio
      v-else-if="error"
      titulo="No pudimos cargar los eventos"
      :texto="error"
    >
      <button type="button" class="boton boton--accion" @click="cargar">
        Intentar de nuevo
      </button>
    </EstadoVacio>

    <EstadoVacio
      v-else-if="!eventos.length"
      :icono="CalendarX2"
      titulo="No hay eventos próximos"
      texto="Cuando publiquen algo para el colegio o tu sección, aparece aquí y te llega un aviso."
    >
      <button
        v-if="auth.puede('eventos.publicar')"
        type="button"
        class="boton boton--accion"
        @click="nuevo"
      >
        Publicar el primero
      </button>
    </EstadoVacio>

    <div v-else ref="lista" class="agenda">
      <section
        v-for="d in dias"
        :key="d.clave"
        data-entra
        class="dia"
        :aria-label="tituloDia(d.inicio)"
      >
        <h2 class="dia__titulo">{{ tituloDia(d.inicio) }}</h2>
        <ul class="dia__eventos">
          <li v-for="e in d.eventos" :key="e.id" class="evento">
            <div class="evento__hora">
              <Clock :size="16" aria-hidden="true" />
              {{ horaLegible(e.hora) }}
            </div>
            <div class="evento__cuerpo">
              <h3 class="evento__titulo">{{ e.titulo }}</h3>
              <p class="evento__descripcion">{{ e.descripcion }}</p>
              <ul class="evento__datos">
                <li v-if="e.lugarClave">
                  <MapPin :size="16" aria-hidden="true" />
                  <RouterLink
                    :to="{ name: 'mapa', query: { lugar: e.lugarClave } }"
                  >
                    {{ nombreLugar(e.lugarClave) ?? 'Ver en el mapa'
                    }}<span class="solo-lectores"> (ver en el mapa)</span>
                  </RouterLink>
                </li>
                <li v-else-if="e.lugarTexto">
                  <MapPin :size="16" aria-hidden="true" /> {{ e.lugarTexto }}
                </li>
                <li>
                  <Users :size="16" aria-hidden="true" /> {{ destinatarios(e) }}
                </li>
              </ul>
              <p class="evento__autor">Publicó: {{ e.autorNombre }}</p>
              <div v-if="puedeEditar(e)" class="evento__acciones">
                <button
                  type="button"
                  class="boton boton--texto boton--pequeno"
                  @click="editar(e)"
                >
                  <Pencil :size="16" aria-hidden="true" /> Editar
                </button>
                <button
                  type="button"
                  class="boton boton--texto boton--pequeno peligro"
                  @click="borrar(e)"
                >
                  <Trash2 :size="16" aria-hidden="true" /> Borrar
                </button>
              </div>
            </div>
            <img
              v-if="e.imagen"
              :src="e.imagen"
              alt=""
              class="evento__imagen"
              loading="lazy"
            />
          </li>
        </ul>
      </section>
    </div>

    <FormularioEvento
      :abierto="formularioAbierto"
      :evento="editando"
      @cerrar="formularioAbierto = false"
      @guardado="cargar"
    />
  </div>
</template>

<style scoped>
.agenda {
  display: flex;
  flex-direction: column;
  gap: var(--e-8);
  max-width: 52rem;
}

.dia__titulo {
  font-size: var(--txt-md);
  font-weight: var(--peso-fuerte);
  color: var(--texto-suave);
  padding-bottom: var(--e-2);
  margin-bottom: var(--e-3);
  border-bottom: 1px solid var(--borde);
}

.dia__eventos {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.evento {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--e-3);
  padding: var(--e-4);
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
}

.evento__hora {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  font-weight: var(--peso-fuerte);
  color: var(--accion);
  font-variant-numeric: tabular-nums;
}

.evento__titulo {
  font-size: var(--txt-lg);
}

.evento__descripcion {
  margin-top: var(--e-1);
  color: var(--texto-suave);
}

.evento__datos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2) var(--e-5);
  margin-top: var(--e-3);
  font-size: var(--txt-sm);
}

.evento__datos li {
  display: inline-flex;
  align-items: center;
  gap: var(--e-1);
}

.evento__datos a {
  font-weight: var(--peso-semi);
}

.evento__autor {
  margin-top: var(--e-2);
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
}

.evento__acciones {
  display: flex;
  gap: var(--e-2);
  margin: var(--e-2) 0 0 calc(var(--e-3) * -1);
}

.peligro {
  color: var(--error);
}

.evento__imagen {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radio-md);
  order: -1;
}

@media (min-width: 768px) {
  .evento {
    grid-template-columns: 7.5rem minmax(0, 1fr) 11rem;
    align-items: start;
  }

  .evento:not(:has(.evento__imagen)) {
    grid-template-columns: 7.5rem minmax(0, 1fr);
  }

  .evento__hora {
    padding-top: 3px;
  }

  .evento__imagen {
    order: 0;
    aspect-ratio: 4 / 3;
  }
}
</style>
