<script setup>
import { computed, onMounted, ref } from 'vue'
import { Plus, Pencil, Trash2, Check, X, PackageCheck } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/estructura/EncabezadoPanel.vue'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Campo from '@/components/formularios/Campo.vue'
import SubirFoto from '@/components/formularios/SubirFoto.vue'
import FotoComida from '@/components/soda/FotoComida.vue'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import {
  fechaIsoLegible,
  fechaRelativa,
  horaDe,
  partesCR,
} from '@compartido/hora.js'

const avisos = useAvisos()
const confirmar = useConfirmar()
const { errores, limpiar, mostrar } = usarErrores()

const pestana = ref('solicitudes')
const objetos = ref([])
const solicitudes = ref([])
const cargando = ref(true)

const pendientes = computed(() =>
  solicitudes.value.filter((s) => s.estado === 'pendiente')
)
const resueltas = computed(() =>
  solicitudes.value.filter((s) => s.estado !== 'pendiente')
)

const abierto = ref(false)
const editando = ref(null)
const formulario = ref({})
const guardando = ref(false)

async function cargar() {
  cargando.value = true
  try {
    const [o, s] = await Promise.all([
      api.get('/objetos?todos=1'),
      api.get('/objetos/solicitudes'),
    ])
    objetos.value = o.objetos
    solicitudes.value = s.solicitudes
    if (
      !s.solicitudes.some((x) => x.estado === 'pendiente') &&
      pestana.value === 'solicitudes'
    )
      pestana.value = 'objetos'
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
}

function nuevo() {
  editando.value = null
  formulario.value = {
    titulo: '',
    descripcion: '',
    lugar: '',
    encontradoEl: partesCR().iso,
    estado: 'disponible',
    foto: null,
  }
  limpiar()
  abierto.value = true
}

function editar(o) {
  editando.value = o
  formulario.value = { ...o }
  limpiar()
  abierto.value = true
}

async function guardar() {
  guardando.value = true
  limpiar()
  try {
    const { titulo, descripcion, lugar, encontradoEl, estado, foto } =
      formulario.value
    const cuerpo = { titulo, descripcion, lugar, encontradoEl, estado, foto }
    if (editando.value) {
      const { objeto } = await api.put(`/objetos/${editando.value.id}`, cuerpo)
      Object.assign(editando.value, objeto)
      avisos.exito('Guardamos los cambios.')
    } else {
      const { objeto } = await api.post('/objetos', cuerpo)
      objetos.value.unshift(objeto)
      avisos.exito('Objeto publicado. Ya lo pueden ver en la guía.')
    }
    abierto.value = false
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    guardando.value = false
  }
}

async function entregar(o) {
  const si = await confirmar.preguntar({
    titulo: `¿Marcar "${o.titulo}" como entregado?`,
    mensaje: 'Deja de aparecer en la lista pública de objetos perdidos.',
    aceptar: 'Marcar entregado',
    peligro: false,
  })
  if (!si) return
  try {
    const { objeto } = await api.put(`/objetos/${o.id}`, {
      ...o,
      estado: 'entregado',
    })
    Object.assign(o, objeto)
    avisos.exito('Marcado como entregado.')
  } catch (e) {
    avisos.error(e.message)
  }
}

async function borrar(o) {
  const si = await confirmar.preguntar({
    titulo: `¿Borrar "${o.titulo}"?`,
    mensaje:
      'También se borran las solicitudes que tenga. Esto no se puede deshacer.',
  })
  if (!si) return
  try {
    await api.delete(`/objetos/${o.id}`)
    objetos.value = objetos.value.filter((x) => x.id !== o.id)
    solicitudes.value = solicitudes.value.filter((s) => s.objetoId !== o.id)
    avisos.exito('Objeto borrado.')
  } catch (e) {
    avisos.error(e.message)
  }
}

async function resolver(s, estado) {
  if (estado === 'aprobada') {
    const si = await confirmar.preguntar({
      titulo: `¿Entregar "${s.objetoTitulo}" a ${s.usuarioNombre}?`,
      mensaje:
        'El objeto queda como entregado y las otras solicitudes por el mismo objeto se rechazan.',
      aceptar: 'Sí, entregar',
      peligro: false,
    })
    if (!si) return
  }
  try {
    await api.patch(`/objetos/solicitudes/${s.id}`, { estado })
    avisos.exito(
      estado === 'aprobada'
        ? 'Aprobada. Le avisamos a la persona.'
        : 'Solicitud rechazada. Le avisamos a la persona.'
    )
    await cargar()
    pestana.value = 'solicitudes'
  } catch (e) {
    avisos.error(e.message)
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Objetos perdidos"
      ayuda="Publicá lo que se encuentre en el colegio. Cuando alguien toca «Es mío», su solicitud aparece aquí para que la revisés antes de entregarlo."
    >
      <template #acciones>
        <button type="button" class="boton boton--accion" @click="nuevo">
          <Plus :size="18" aria-hidden="true" /> Publicar objeto
        </button>
      </template>
    </EncabezadoPanel>

    <div class="segmentos pestanas" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="pestana === 'solicitudes'"
        :aria-pressed="pestana === 'solicitudes'"
        @click="pestana = 'solicitudes'"
      >
        Solicitudes
        <span v-if="pendientes.length" class="cuenta">{{
          pendientes.length
        }}</span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="pestana === 'objetos'"
        :aria-pressed="pestana === 'objetos'"
        @click="pestana = 'objetos'"
      >
        Objetos publicados
      </button>
    </div>

    <div v-if="cargando" class="esqueleto" style="height: 300px" />

    <section v-else-if="pestana === 'solicitudes'" role="tabpanel">
      <p v-if="!pendientes.length" class="nota nota--exito">
        <Check :size="18" aria-hidden="true" /><span
          >No hay solicitudes por revisar.</span
        >
      </p>
      <ul class="solicitudes">
        <li v-for="s in pendientes" :key="s.id" class="solicitud">
          <div>
            <p class="solicitud__titulo">
              <strong>{{ s.usuarioNombre }}</strong
              ><template v-if="s.usuarioSeccion">
                ({{ s.usuarioSeccion }})</template
              >
              dice que es suyo: <strong>{{ s.objetoTitulo }}</strong>
            </p>
            <blockquote class="solicitud__mensaje">{{ s.mensaje }}</blockquote>
            <p class="solicitud__meta">
              {{ s.usuarioCorreo }} · {{ fechaRelativa(s.creadoEn) }},
              {{ horaDe(s.creadoEn) }}
            </p>
          </div>
          <div class="solicitud__acciones">
            <button
              type="button"
              class="boton boton--accion boton--pequeno"
              @click="resolver(s, 'aprobada')"
            >
              <Check :size="16" aria-hidden="true" /> Aprobar y entregar
            </button>
            <button
              type="button"
              class="boton boton--contorno boton--pequeno"
              @click="resolver(s, 'rechazada')"
            >
              <X :size="16" aria-hidden="true" /> Rechazar
            </button>
          </div>
        </li>
      </ul>
      <details v-if="resueltas.length" class="historial">
        <summary>Solicitudes ya resueltas ({{ resueltas.length }})</summary>
        <ul>
          <li v-for="s in resueltas" :key="s.id">
            {{ s.usuarioNombre }}: {{ s.objetoTitulo }}
            <span
              class="etiqueta"
              :class="
                s.estado === 'aprobada' ? 'etiqueta--exito' : 'etiqueta--neutra'
              "
              >{{ s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada' }}</span
            >
          </li>
        </ul>
      </details>
    </section>

    <section v-else role="tabpanel">
      <ul class="objetos">
        <li
          v-for="o in objetos"
          :key="o.id"
          class="objeto"
          :class="{ 'es-entregado': o.estado === 'entregado' }"
        >
          <FotoComida :src="o.foto" alt="" class="objeto__foto" />
          <div class="objeto__info">
            <p class="objeto__titulo">
              {{ o.titulo }}
              <span
                v-if="o.estado === 'entregado'"
                class="etiqueta etiqueta--neutra"
                >Entregado</span
              >
            </p>
            <p class="objeto__meta">
              {{ o.lugar }} · {{ fechaIsoLegible(o.encontradoEl) }}
            </p>
          </div>
          <div class="objeto__acciones">
            <button
              v-if="o.estado !== 'entregado'"
              type="button"
              class="boton boton--texto boton--pequeno"
              @click="entregar(o)"
            >
              <PackageCheck :size="16" aria-hidden="true" /> Entregado
            </button>
            <button
              type="button"
              class="boton-icono"
              :aria-label="`Editar ${o.titulo}`"
              @click="editar(o)"
            >
              <Pencil :size="18" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="boton-icono peligro"
              :aria-label="`Borrar ${o.titulo}`"
              @click="borrar(o)"
            >
              <Trash2 :size="18" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ul>
    </section>

    <Dialogo
      :abierto="abierto"
      :titulo="editando ? 'Editar objeto' : 'Publicar objeto encontrado'"
      ancho="34rem"
      @cerrar="abierto = false"
    >
      <form
        id="form-objeto"
        class="formulario"
        novalidate
        @submit.prevent="guardar"
      >
        <Campo
          id="ob-titulo"
          v-model="formulario.titulo"
          etiqueta="Qué es"
          placeholder="Botella verde de metal"
          obligatorio
          :maximo="60"
          :error="errores.titulo"
        />
        <Campo
          id="ob-descripcion"
          v-model="formulario.descripcion"
          etiqueta="Descripción"
          tipo="textarea"
          ayuda="Color, marca o algo que lo distinga. No pongás detalles que solo el dueño debería saber."
          :maximo="400"
          :error="errores.descripcion"
        />
        <div class="dos">
          <Campo
            id="ob-lugar"
            v-model="formulario.lugar"
            etiqueta="Dónde se encontró"
            :maximo="80"
            :error="errores.lugar"
          />
          <Campo
            id="ob-fecha"
            v-model="formulario.encontradoEl"
            etiqueta="Cuándo"
            tipo="date"
            :error="errores.encontradoEl"
          />
        </div>
        <SubirFoto
          id="ob-foto"
          v-model="formulario.foto"
          etiqueta="Foto"
          :error="errores.foto"
        />
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
          form="form-objeto"
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
.pestanas {
  margin-bottom: var(--e-4);
}

.pestanas button {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
}

.cuenta {
  min-width: 22px;
  padding: 0 6px;
  border-radius: var(--radio-pildora);
  background: var(--error);
  color: #ffffff;
  font-size: var(--txt-xs);
}

.solicitudes {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.solicitud {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding: var(--e-4);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-left: 4px solid var(--aviso);
}

.solicitud__mensaje {
  margin: var(--e-2) 0;
  padding: var(--e-3);
  border-radius: var(--radio-sm);
  background: var(--superficie-2);
  font-style: italic;
}

.solicitud__meta {
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
  overflow-wrap: anywhere;
}

.solicitud__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}

.historial {
  margin-top: var(--e-5);
}

.historial summary {
  min-height: var(--objetivo-tactil);
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: var(--peso-semi);
}

.historial ul {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  font-size: var(--txt-sm);
}

.objetos {
  display: flex;
  flex-direction: column;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  overflow: hidden;
}

.objeto {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-3) var(--e-4);
  padding: var(--e-3) var(--e-4);
  border-bottom: 1px solid var(--borde-sutil);
}

.objeto:last-child {
  border-bottom: none;
}

.es-entregado .objeto__info,
.es-entregado .objeto__foto {
  opacity: 0.55;
}

.objeto__foto {
  width: 56px;
  height: 56px;
  border-radius: var(--radio-sm);
}

.objeto__info {
  flex: 1;
  min-width: 10rem;
}

.objeto__titulo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
  align-items: center;
  font-weight: var(--peso-semi);
}

.objeto__meta {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.objeto__acciones {
  display: flex;
  align-items: center;
}

.peligro {
  color: var(--error);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.dos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--e-4);
}

@media (min-width: 900px) {
  .solicitud {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }

  .solicitud__acciones {
    flex-direction: column;
    flex-shrink: 0;
  }
}
</style>
