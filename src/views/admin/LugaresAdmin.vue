<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Pencil,
  Lock,
  Move,
  Plus,
  Trash2,
  X,
  MapPin,
  Search,
} from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import Dialogo from '@/components/Dialogo.vue'
import Campo from '@/components/Campo.vue'
import SubirFoto from '@/components/SubirFoto.vue'
import MapaCampus from '@/components/MapaCampus.vue'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { useLugares } from '@/stores/lugares'
import { CATEGORIAS, LIENZO } from '@compartido/campus.js'
import { coincide } from '@compartido/texto.js'

const avisos = useAvisos()
const confirmar = useConfirmar()
const lugares = useLugares()
const { errores, limpiar, mostrar } = usarErrores()

const seleccionada = ref(null)
const busqueda = ref('')
/** Lugar al que se le esta eligiendo posicion en el mapa (existente o nuevo). */
const colocando = ref(null)

const lista = computed(() =>
  [...lugares.lista]
    .sort(
      (a, b) =>
        (a.numero ?? 99) - (b.numero ?? 99) ||
        a.nombre.localeCompare(b.nombre, 'es')
    )
    .filter((l) => coincide(busqueda.value, l.nombre, String(l.numero ?? '')))
)

const opcionesCategoria = Object.entries(CATEGORIAS).map(([valor, c]) => ({
  valor,
  texto: c.nombre,
}))

// --- Editar informacion ---
const editando = ref(null)
const formulario = ref({})
const guardando = ref(false)

function cuerpoDe(f) {
  return {
    nombre: f.nombre,
    categoria: f.categoria,
    descripcion: f.descripcion,
    horario: f.horario ?? '',
    restringido: Boolean(f.restringido),
    notaAcceso: f.notaAcceso ?? '',
    numero:
      f.numero === '' || f.numero === null || f.numero === undefined
        ? null
        : Number(f.numero),
    x: Number(f.x),
    y: Number(f.y),
    foto: f.foto ?? null,
  }
}

function editar(l) {
  editando.value = l
  formulario.value = {
    notaAcceso: '',
    horario: '',
    ...l,
    numero: l.numero ?? '',
  }
  limpiar()
}

function nuevo() {
  editando.value = { nuevo: true }
  formulario.value = {
    nombre: '',
    categoria: 'servicios',
    descripcion: '',
    horario: '',
    restringido: false,
    notaAcceso: '',
    numero: '',
    x: Math.round(LIENZO.ancho / 2),
    y: Math.round(LIENZO.alto / 2),
    foto: null,
  }
  limpiar()
}

async function guardar() {
  guardando.value = true
  limpiar()
  try {
    const cuerpo = cuerpoDe(formulario.value)
    if (editando.value.nuevo) {
      const { lugar } = await api.post('/lugares', cuerpo)
      lugares.reemplazar(lugar)
      editando.value = null
      seleccionada.value = lugar.clave
      colocando.value = lugar
      avisos.info(
        `${lugar.nombre} se agregó. Ahora tocá en el mapa dónde va.`,
        { duracion: 6000 }
      )
    } else {
      const { lugar } = await api.put(
        `/lugares/${editando.value.clave}`,
        cuerpo
      )
      lugares.reemplazar(lugar)
      editando.value = null
      avisos.exito(`Guardamos ${lugar.nombre}. Ya se ve así en el mapa.`)
    }
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    guardando.value = false
  }
}

// --- Mover el pin ---
function moverPin(l) {
  seleccionada.value = l.clave
  colocando.value = l
}

async function alColocar(posicion) {
  const l = colocando.value
  if (!l) return
  const anterior = { x: l.x, y: l.y }
  try {
    const { lugar } = await api.put(
      `/lugares/${l.clave}`,
      cuerpoDe({ ...l, ...posicion })
    )
    lugares.reemplazar(lugar)
    colocando.value = null
    avisos.exito(`Movimos el pin de ${lugar.nombre}.`, {
      accion: {
        texto: 'Deshacer',
        alPulsar: async () => {
          const r = await api.put(
            `/lugares/${lugar.clave}`,
            cuerpoDe({ ...lugar, ...anterior })
          )
          lugares.reemplazar(r.lugar)
        },
      },
      duracion: 7000,
    })
  } catch (e) {
    avisos.error(e.message)
  }
}

async function borrar(l) {
  const si = await confirmar.preguntar({
    titulo: `¿Borrar "${l.nombre}" del mapa?`,
    mensaje:
      'Desaparece del mapa y de los favoritos de todas las personas. Los eventos que lo usaban quedan sin lugar.',
  })
  if (!si) return
  try {
    await api.delete(`/lugares/${l.clave}`)
    lugares.quitar(l.clave)
    if (seleccionada.value === l.clave) seleccionada.value = null
    avisos.exito('Lugar borrado.')
  } catch (e) {
    avisos.error(e.message)
  }
}

onMounted(() => lugares.cargar({ forzar: true }))
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Lugares del mapa"
      ayuda="Elegí un lugar para verlo en el mapa. Con «Mover pin» tocás el punto exacto donde va. Los números son los del mapa oficial del colegio."
    >
      <template #acciones>
        <button type="button" class="boton boton--accion" @click="nuevo">
          <Plus :size="18" aria-hidden="true" /> Agregar lugar
        </button>
      </template>
    </EncabezadoPanel>

    <div class="distribucion">
      <div class="mapa-caja">
        <div v-if="colocando" class="colocando" role="status">
          <Move :size="18" aria-hidden="true" />
          <span
            >Tocá en el mapa dónde va <strong>{{ colocando.nombre }}</strong
            >. Podés acercar con los botones.</span
          >
          <button
            type="button"
            class="boton boton--texto boton--pequeno"
            @click="colocando = null"
          >
            <X :size="16" aria-hidden="true" /> Cancelar
          </button>
        </div>
        <MapaCampus
          :lugares="lugares.lista"
          :seleccionada="seleccionada"
          :colocar="Boolean(colocando)"
          con-nombres
          @elegir="(c) => (seleccionada = c)"
          @colocar="alColocar"
        />
      </div>

      <section class="lista-caja" aria-label="Lugares">
        <div class="buscador">
          <Search :size="20" aria-hidden="true" />
          <label for="buscar-lugar-admin" class="solo-lectores"
            >Buscar lugar</label
          >
          <input
            id="buscar-lugar-admin"
            v-model="busqueda"
            type="search"
            class="entrada"
            placeholder="Buscar lugar"
          />
        </div>
        <ul class="lista">
          <li
            v-for="l in lista"
            :key="l.clave"
            class="lugar"
            :class="{ 'es-elegido': seleccionada === l.clave }"
          >
            <button
              type="button"
              class="lugar__principal"
              @click="seleccionada = l.clave"
            >
              <span
                class="numero"
                :style="{ background: CATEGORIAS[l.categoria]?.color }"
                aria-hidden="true"
                >{{ l.numero ?? '+' }}</span
              >
              <span class="lugar__textos">
                <strong>{{ l.nombre }}</strong>
                <span>
                  {{ CATEGORIAS[l.categoria]?.corto }}
                  <template v-if="l.restringido">
                    ·
                    <Lock :size="12" aria-hidden="true" /> restringido</template
                  >
                  <template v-if="l.ubicacionAproximada">
                    · ubicación aproximada</template
                  >
                </span>
              </span>
            </button>
            <div class="lugar__acciones">
              <button
                type="button"
                class="boton-icono"
                :aria-label="`Mover pin de ${l.nombre}`"
                title="Mover pin"
                @click="moverPin(l)"
              >
                <MapPin :size="18" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="boton-icono"
                :aria-label="`Editar ${l.nombre}`"
                title="Editar"
                @click="editar(l)"
              >
                <Pencil :size="18" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="boton-icono peligro"
                :aria-label="`Borrar ${l.nombre}`"
                title="Borrar"
                @click="borrar(l)"
              >
                <Trash2 :size="18" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <Dialogo
      :abierto="Boolean(editando)"
      :titulo="
        editando?.nuevo ? 'Agregar lugar' : `Editar ${editando?.nombre ?? ''}`
      "
      :descripcion="
        editando?.nuevo
          ? 'Después de guardar vas a tocar el mapa para ubicarlo.'
          : ''
      "
      ancho="36rem"
      @cerrar="editando = null"
    >
      <form
        id="form-lugar"
        class="formulario"
        novalidate
        @submit.prevent="guardar"
      >
        <div class="dos">
          <Campo
            id="lu-nombre"
            v-model="formulario.nombre"
            etiqueta="Nombre"
            obligatorio
            :maximo="60"
            :error="errores.nombre"
          />
          <Campo
            id="lu-numero"
            v-model="formulario.numero"
            etiqueta="Número en el mapa"
            tipo="number"
            :min="1"
            :max="99"
            ayuda="Dejalo vacío si no tiene número."
            :error="errores.numero"
          />
        </div>
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
        <SubirFoto
          id="lu-foto"
          v-model="formulario.foto"
          etiqueta="Foto (opcional)"
          :error="errores.foto"
        />
        <div class="interruptor-fila">
          <button
            id="lu-restringido"
            type="button"
            role="switch"
            class="interruptor"
            :aria-checked="Boolean(formulario.restringido)"
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
          {{
            guardando
              ? 'Guardando...'
              : editando?.nuevo
                ? 'Guardar y ubicar en el mapa'
                : 'Guardar'
          }}
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.distribucion {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--e-4);
}

.mapa-caja {
  position: relative;
  height: min(70dvh, 620px);
  min-height: 360px;
  border-radius: var(--radio-lg);
  border: 1px solid var(--borde);
  overflow: hidden;
}

.colocando {
  position: absolute;
  top: var(--e-3);
  left: var(--e-3);
  right: var(--e-3);
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  padding: var(--e-3);
  border-radius: var(--radio-md);
  background: var(--marca);
  color: #ffffff;
  font-size: var(--txt-sm);
  box-shadow: var(--sombra-3);
}

.colocando span {
  flex: 1 1 12rem;
}

.colocando .boton--texto {
  color: #ffffff;
}

.lista-caja {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  min-width: 0;
}

.lista {
  display: flex;
  flex-direction: column;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  overflow: hidden;
}

.lugar {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--borde-sutil);
}

.lugar.es-elegido {
  background: var(--principal-suave);
}

.lugar__principal {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--e-3);
  min-height: 52px;
  padding: var(--e-2) var(--e-3);
  text-align: left;
}

.lugar__textos {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.lugar__textos span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
  font-size: var(--txt-xs);
  color: var(--texto-suave);
}

.lugar__acciones {
  display: flex;
  flex-shrink: 0;
}

.numero {
  display: inline-grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #ffffff;
  font-size: var(--txt-xs);
  font-weight: var(--peso-extra);
  flex-shrink: 0;
}

.peligro {
  color: var(--error);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.dos {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--e-4);
}

.interruptor-fila {
  display: flex;
  align-items: center;
  gap: var(--e-3);
}

@media (min-width: 1100px) {
  .distribucion {
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    align-items: start;
  }

  .mapa-caja {
    position: sticky;
    top: var(--e-4);
    height: calc(100dvh - 9rem);
  }

  .lista {
    max-height: calc(100dvh - 13rem);
    overflow-y: auto;
  }
}
</style>
