<script setup>
import { computed, ref, watch } from 'vue'
import Dialogo from './Dialogo.vue'
import Campo from './Campo.vue'
import SubirFoto from './SubirFoto.vue'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { useAvisos } from '@/stores/avisos'
import { useLugares } from '@/stores/lugares'
import { SECCIONES, NIVELES, NOMBRE_NIVEL } from '@compartido/permisos.js'
import { partesCR } from '@compartido/hora.js'

/** Crear o editar un evento. Lo usan profesores (guia) y administracion (panel). */
const props = defineProps({
  abierto: { type: Boolean, default: false },
  /** Evento a editar, o null para uno nuevo. */
  evento: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'guardado'])

const avisos = useAvisos()
const { errores, limpiar, mostrar } = usarErrores()
const guardando = ref(false)

function vacio() {
  return {
    titulo: '',
    descripcion: '',
    fecha: partesCR().iso,
    hora: '10:00',
    lugarClave: '',
    lugarTexto: '',
    todos: true,
    secciones: [],
    imagen: null,
  }
}

const datos = ref(vacio())

watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return
    limpiar()
    datos.value = props.evento
      ? {
          ...vacio(),
          ...props.evento,
          lugarClave: props.evento.lugarClave ?? '',
          secciones: [...(props.evento.secciones ?? [])],
        }
      : vacio()
  }
)

const lugaresStore = useLugares()
lugaresStore.cargar()
const lugares = computed(() =>
  lugaresStore.lista
    .map((l) => ({
      valor: l.clave,
      texto: l.numero ? `${l.numero}. ${l.nombre}` : l.nombre,
    }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { numeric: true }))
)

const porNivel = computed(() =>
  NIVELES.map((n) => ({
    nivel: n,
    nombre: NOMBRE_NIVEL[n],
    secciones: SECCIONES.filter((s) => s.startsWith(`${n}-`)),
  }))
)

function alternarNivel(nivel) {
  const del = SECCIONES.filter((s) => s.startsWith(`${nivel}-`))
  const todas = del.every((s) => datos.value.secciones.includes(s))
  datos.value.secciones = todas
    ? datos.value.secciones.filter((s) => !del.includes(s))
    : [...new Set([...datos.value.secciones, ...del])]
}

async function guardar() {
  guardando.value = true
  limpiar()
  try {
    const cuerpo = {
      ...datos.value,
      lugarClave: datos.value.lugarClave || null,
    }
    const r = props.evento
      ? await api.put(`/eventos/${props.evento.id}`, cuerpo)
      : await api.post('/eventos', cuerpo)
    avisos.exito(
      props.evento
        ? 'Guardamos los cambios del evento.'
        : 'Evento publicado. Ya les llegó el aviso.'
    )
    emit('guardado', r.evento)
    emit('cerrar')
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Dialogo
    :abierto="abierto"
    :titulo="evento ? 'Editar evento' : 'Publicar un evento'"
    descripcion="Lo ven las personas a las que va dirigido y les llega una notificación."
    ancho="36rem"
    @cerrar="emit('cerrar')"
  >
    <form
      id="form-evento"
      class="formulario"
      novalidate
      @submit.prevent="guardar"
    >
      <Campo
        id="ev-titulo"
        v-model="datos.titulo"
        etiqueta="Título"
        obligatorio
        :maximo="90"
        :error="errores.titulo"
      />
      <Campo
        id="ev-descripcion"
        v-model="datos.descripcion"
        etiqueta="De qué se trata"
        tipo="textarea"
        obligatorio
        :maximo="800"
        :error="errores.descripcion"
      />
      <div class="dos">
        <Campo
          id="ev-fecha"
          v-model="datos.fecha"
          etiqueta="Fecha"
          tipo="date"
          obligatorio
          :error="errores.fecha"
        />
        <Campo
          id="ev-hora"
          v-model="datos.hora"
          etiqueta="Hora"
          tipo="time"
          obligatorio
          :error="errores.hora"
        />
      </div>
      <Campo
        id="ev-lugar"
        v-model="datos.lugarClave"
        etiqueta="Lugar en el mapa"
        tipo="select"
        :opciones="[
          { valor: '', texto: 'Ninguno o fuera del colegio' },
          ...lugares,
        ]"
        ayuda="Así la gente puede tocar el lugar y verlo en el mapa."
      />
      <Campo
        v-if="!datos.lugarClave"
        id="ev-lugar-texto"
        v-model="datos.lugarTexto"
        etiqueta="Dónde es (si no está en el mapa)"
        placeholder="Por ejemplo: Teatro Nacional"
        :maximo="80"
      />

      <fieldset class="destino">
        <legend class="campo__etiqueta">¿Para quién es?</legend>
        <div class="segmentos" role="group" aria-label="Destinatarios">
          <button
            type="button"
            :aria-pressed="datos.todos"
            @click="datos.todos = true"
          >
            Todo el colegio
          </button>
          <button
            type="button"
            :aria-pressed="!datos.todos"
            @click="datos.todos = false"
          >
            Algunas secciones
          </button>
        </div>
        <div v-if="!datos.todos" class="secciones">
          <div v-for="n in porNivel" :key="n.nivel" class="nivel">
            <button
              type="button"
              class="nivel__nombre"
              @click="alternarNivel(n.nivel)"
            >
              {{ n.nombre }}
            </button>
            <label v-for="s in n.secciones" :key="s" class="casilla">
              <input v-model="datos.secciones" type="checkbox" :value="s" />
              {{ s }}
            </label>
          </div>
          <p v-if="errores.secciones" class="campo__error">
            {{ errores.secciones }}
          </p>
        </div>
      </fieldset>

      <SubirFoto
        id="ev-imagen"
        v-model="datos.imagen"
        etiqueta="Imagen (opcional)"
        :error="errores.imagen"
      />
    </form>
    <template #pie>
      <button
        type="button"
        class="boton boton--contorno"
        @click="emit('cerrar')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="form-evento"
        class="boton boton--accion"
        :disabled="guardando"
      >
        {{
          guardando
            ? 'Guardando...'
            : evento
              ? 'Guardar cambios'
              : 'Publicar evento'
        }}
      </button>
    </template>
  </Dialogo>
</template>

<style scoped>
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

.destino {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  border: none;
  padding: 0;
}

.secciones {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.nivel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-1) var(--e-3);
}

.nivel__nombre {
  width: 6.5rem;
  min-height: 36px;
  text-align: left;
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--accion);
}

.casilla {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  font-size: var(--txt-sm);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.casilla input {
  width: 18px;
  height: 18px;
  accent-color: var(--principal-fuerte);
}
</style>
