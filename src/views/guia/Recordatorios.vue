<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Plus,
  ListChecks,
  Pencil,
  Trash2,
  Presentation,
  Check,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/EncabezadoPagina.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import Dialogo from '@/components/Dialogo.vue'
import Campo from '@/components/Campo.vue'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { usarErrores } from '@/lib/errores'
import { partesCR, sumarDias, fechaIsoLegible } from '@compartido/hora.js'
import { SECCIONES } from '@compartido/permisos.js'

const auth = useAuth()
const avisos = useAvisos()
const confirmar = useConfirmar()
const { errores, limpiar, mostrar } = usarErrores()

const recordatorios = ref([])
const materias = ref([])
const cargando = ref(true)
const error = ref('')

const hoy = partesCR().iso
const manana = sumarDias(hoy, 1)

const abierto = ref(false)
const editando = ref(null)
const formulario = ref({ titulo: '', materia: '', fecha: hoy, secciones: [] })
const guardando = ref(false)

const puedeEnviarSecciones = computed(() =>
  auth.puede('recordatorios.publicarSecciones')
)

const grupos = computed(() => {
  const pendientes = recordatorios.value.filter((r) => !r.hecho)
  const lista = [
    {
      clave: 'vencidos',
      titulo: 'Se pasó la fecha',
      items: pendientes.filter((r) => r.fecha < hoy),
      tono: 'error',
    },
    {
      clave: 'hoy',
      titulo: 'Para hoy',
      items: pendientes.filter((r) => r.fecha === hoy),
    },
    {
      clave: 'manana',
      titulo: 'Para mañana',
      items: pendientes.filter((r) => r.fecha === manana),
    },
    {
      clave: 'despues',
      titulo: 'Más adelante',
      items: pendientes.filter((r) => r.fecha > manana),
    },
    {
      clave: 'hechos',
      titulo: 'Hechos',
      items: recordatorios.value.filter((r) => r.hecho),
    },
  ]
  return lista.filter((g) => g.items.length)
})

function nuevo() {
  editando.value = null
  formulario.value = { titulo: '', materia: '', fecha: hoy, secciones: [] }
  limpiar()
  abierto.value = true
}

function editar(r) {
  editando.value = r
  formulario.value = {
    titulo: r.titulo,
    materia: r.materia,
    fecha: r.fecha,
    secciones: [...r.secciones],
  }
  limpiar()
  abierto.value = true
}

async function guardar() {
  guardando.value = true
  limpiar()
  try {
    if (editando.value) {
      const { recordatorio } = await api.put(
        `/recordatorios/${editando.value.id}`,
        formulario.value
      )
      Object.assign(editando.value, recordatorio)
      avisos.exito('Guardamos el cambio.')
    } else {
      const { recordatorio } = await api.post(
        '/recordatorios',
        formulario.value
      )
      recordatorios.value.push(recordatorio)
      avisos.exito(
        recordatorio.secciones.length
          ? 'Recordatorio enviado a las secciones.'
          : 'Recordatorio guardado.'
      )
    }
    recordatorios.value.sort((a, b) => a.fecha.localeCompare(b.fecha))
    abierto.value = false
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    guardando.value = false
  }
}

async function alternar(r) {
  const anterior = r.hecho
  r.hecho = !r.hecho
  try {
    await api.patch(`/recordatorios/${r.id}/hecho`, { hecho: r.hecho })
  } catch (e) {
    r.hecho = anterior
    avisos.error(e.message)
  }
}

async function borrar(r) {
  const si = await confirmar.preguntar({
    titulo: '¿Borrar este recordatorio?',
    mensaje: r.secciones.length
      ? 'También desaparece para las secciones a las que se lo enviaste.'
      : `"${r.titulo}" se borra para siempre.`,
  })
  if (!si) return
  try {
    await api.delete(`/recordatorios/${r.id}`)
    recordatorios.value = recordatorios.value.filter((x) => x.id !== r.id)
    avisos.exito('Recordatorio borrado.')
  } catch (e) {
    avisos.error(e.message)
  }
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const [r, m] = await Promise.all([
      api.get('/recordatorios'),
      api.get('/clases').catch(() => ({ materias: [] })),
    ])
    recordatorios.value = r.recordatorios
    materias.value = m.materias.map((x) => x.nombre)
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
      titulo="Recordatorios"
      bajada="Tareas, pruebas y fechas que no se te pueden pasar."
      :volver="{ name: 'guia' }"
    >
      <template #acciones>
        <button
          type="button"
          class="boton boton--accion boton--pequeno"
          @click="nuevo"
        >
          <Plus :size="18" aria-hidden="true" /> Nuevo
        </button>
      </template>
    </EncabezadoPagina>

    <div v-if="cargando" class="grupos">
      <div v-for="n in 3" :key="n" class="esqueleto" style="height: 64px" />
    </div>

    <EstadoVacio
      v-else-if="error"
      titulo="No pudimos cargar tus recordatorios"
      :texto="error"
    >
      <button type="button" class="boton boton--accion" @click="cargar">
        Intentar de nuevo
      </button>
    </EstadoVacio>

    <EstadoVacio
      v-else-if="!recordatorios.length"
      :icono="ListChecks"
      titulo="No tenés recordatorios"
      texto="Anotá una tarea o una prueba con su fecha y la vas a tener a mano."
    >
      <button type="button" class="boton boton--accion" @click="nuevo">
        Crear el primero
      </button>
    </EstadoVacio>

    <div v-else class="grupos">
      <section
        v-for="g in grupos"
        :key="g.clave"
        :aria-labelledby="`g-${g.clave}`"
      >
        <h2
          :id="`g-${g.clave}`"
          class="grupo__titulo"
          :class="g.tono ? `tono-${g.tono}` : ''"
        >
          {{ g.titulo }} <span class="grupo__cuenta">{{ g.items.length }}</span>
        </h2>
        <TransitionGroup tag="ul" name="lista" class="lista">
          <li
            v-for="r in g.items"
            :key="r.id"
            class="recordatorio"
            :class="{ 'es-hecho': r.hecho }"
          >
            <button
              type="button"
              role="checkbox"
              class="marca"
              :aria-checked="r.hecho"
              :aria-label="`${r.hecho ? 'Desmarcar' : 'Marcar como hecho'}: ${r.titulo}`"
              @click="alternar(r)"
            >
              <Check v-if="r.hecho" :size="18" aria-hidden="true" />
            </button>
            <div class="recordatorio__cuerpo">
              <p class="recordatorio__titulo">{{ r.titulo }}</p>
              <p class="recordatorio__datos">
                <span v-if="r.materia" class="etiqueta etiqueta--info">{{
                  r.materia
                }}</span>
                <span>{{ fechaIsoLegible(r.fecha) }}</span>
                <span v-if="r.deProfesor && !r.esMio" class="de-profesor">
                  <Presentation :size="14" aria-hidden="true" /> Del profesor:
                  {{ r.autorNombre }}
                </span>
                <span v-if="r.deProfesor && r.esMio" class="de-profesor">
                  <Presentation :size="14" aria-hidden="true" /> Enviado a
                  {{ r.secciones.join(', ') }}
                </span>
              </p>
            </div>
            <div v-if="r.esMio" class="recordatorio__acciones">
              <button
                type="button"
                class="boton-icono"
                :aria-label="`Editar ${r.titulo}`"
                @click="editar(r)"
              >
                <Pencil :size="18" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="boton-icono"
                :aria-label="`Borrar ${r.titulo}`"
                @click="borrar(r)"
              >
                <Trash2 :size="18" aria-hidden="true" />
              </button>
            </div>
          </li>
        </TransitionGroup>
      </section>
    </div>

    <Dialogo
      :abierto="abierto"
      :titulo="editando ? 'Editar recordatorio' : 'Nuevo recordatorio'"
      @cerrar="abierto = false"
    >
      <form
        id="form-recordatorio"
        class="formulario"
        novalidate
        @submit.prevent="guardar"
      >
        <Campo
          id="rec-titulo"
          v-model="formulario.titulo"
          etiqueta="¿Qué tenés que recordar?"
          obligatorio
          :maximo="120"
          :error="errores.titulo"
        />
        <div class="campo">
          <label class="campo__etiqueta" for="rec-materia"
            >Materia (opcional)</label
          >
          <input
            id="rec-materia"
            v-model="formulario.materia"
            class="campo__control"
            list="lista-materias"
            maxlength="60"
            placeholder="General"
          />
          <datalist id="lista-materias">
            <option v-for="m in materias" :key="m" :value="m" />
          </datalist>
        </div>
        <Campo
          id="rec-fecha"
          v-model="formulario.fecha"
          etiqueta="Fecha"
          tipo="date"
          obligatorio
          :error="errores.fecha"
        />
        <fieldset v-if="puedeEnviarSecciones" class="secciones">
          <legend class="campo__etiqueta">Enviar a secciones (opcional)</legend>
          <p class="campo__ayuda">
            Si elegís secciones, a sus estudiantes les llega el recordatorio
            marcado como tuyo.
          </p>
          <div class="secciones__lista">
            <label v-for="s in SECCIONES" :key="s" class="casilla">
              <input
                v-model="formulario.secciones"
                type="checkbox"
                :value="s"
              />
              {{ s }}
            </label>
          </div>
        </fieldset>
      </form>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="abierto = false"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-recordatorio"
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
.grupos {
  display: flex;
  flex-direction: column;
  gap: var(--e-6);
  max-width: 44rem;
}

.grupo__titulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-md);
  margin-bottom: var(--e-2);
}

.tono-error {
  color: var(--error);
}

.grupo__cuenta {
  min-width: 24px;
  padding: 0 6px;
  border-radius: var(--radio-pildora);
  background: var(--superficie-3);
  color: var(--texto-suave);
  font-size: var(--txt-xs);
  text-align: center;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.recordatorio {
  display: flex;
  align-items: flex-start;
  gap: var(--e-3);
  padding: var(--e-3);
  border-radius: var(--radio-md);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.marca {
  display: grid;
  place-items: center;
  width: var(--objetivo-tactil);
  height: var(--objetivo-tactil);
  flex-shrink: 0;
  border-radius: var(--radio-md);
  position: relative;
}

.marca::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 2px solid var(--borde-fuerte);
  border-radius: 7px;
  transition:
    background-color var(--dur-rapida) var(--curva),
    border-color var(--dur-rapida) var(--curva);
}

.marca svg {
  position: relative;
  color: var(--sobre-principal);
}

.marca[aria-checked='true']::before {
  background: var(--principal-fuerte);
  border-color: var(--principal-fuerte);
}

.recordatorio__cuerpo {
  flex: 1;
  min-width: 0;
  padding-top: 10px;
}

.recordatorio__titulo {
  font-weight: var(--peso-semi);
}

.es-hecho .recordatorio__titulo {
  text-decoration: line-through;
  color: var(--texto-tenue);
}

.recordatorio__datos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-1) var(--e-3);
  margin-top: var(--e-1);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.de-profesor {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accion);
  font-weight: var(--peso-semi);
}

.recordatorio__acciones {
  display: flex;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.secciones {
  border: none;
  padding: 0;
}

.secciones__lista {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
  gap: var(--e-1);
  margin-top: var(--e-2);
}

.casilla {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  font-size: var(--txt-sm);
}

.casilla input {
  width: 18px;
  height: 18px;
  accent-color: var(--principal-fuerte);
}

.lista-enter-active,
.lista-leave-active {
  transition:
    opacity var(--dur-media) var(--curva),
    transform var(--dur-media) var(--curva);
}

.lista-enter-from,
.lista-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.lista-move {
  transition: transform var(--dur-media) var(--curva);
}
</style>
