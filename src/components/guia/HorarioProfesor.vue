<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  Pencil,
  Save,
  Copy,
  X,
  Coffee,
  Utensils,
  CalendarClock,
  CalendarDays,
  LayoutList,
} from 'lucide-vue-next'
import EstadoVacio from '@/components/avisos/EstadoVacio.vue'
import { api } from '@/lib/api'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import {
  BLOQUES,
  LECCIONES,
  DIAS_LECTIVOS,
  NOMBRE_DIA,
  bloqueActual,
} from '@compartido/jornada.js'
import { SECCIONES, NOMBRE_NIVEL } from '@compartido/permisos.js'
import { horaLegible, partesCR } from '@compartido/hora.js'

/**
 * Horario propio de un profesor: que seccion, materia y aula tiene en cada
 * leccion. Se ve por dia o por semana, y el mismo profesor lo puede editar.
 */
const props = defineProps({
  /** Nombres de materias para sugerir al escribir. */
  materias: { type: Array, default: () => [] },
  /** De donde se lee y se guarda. El panel lo usa con el de otro profesor. */
  ruta: { type: String, default: '/horarios/profesor' },
  /** Nombre de quien es el horario, si no es el propio. */
  de: { type: String, default: '' },
})

const avisos = useAvisos()
const confirmar = useConfirmar()

const cargando = ref(true)
const dias = ref(null)
const existe = ref(false)
const editando = ref(false)
const guardando = ref(false)
const borrador = ref(null)
const vista = ref('dia')

const hoy = partesCR()
const diaHoy = DIAS_LECTIVOS[hoy.diaSemana - 1] ?? null
const dia = ref(diaHoy ?? 'lunes')

const actual = ref(bloqueActual())
let reloj = null

const gruposSeccion = Object.entries(
  SECCIONES.reduce((g, s) => {
    ;(g[s.split('-')[0]] ??= []).push(s)
    return g
  }, {})
).map(([nivel, lista]) => ({ nivel: NOMBRE_NIVEL[nivel], lista }))

function vacio() {
  return Object.fromEntries(
    DIAS_LECTIVOS.map((d) => [
      d,
      LECCIONES.map(() => ({ seccion: '', materia: '', aula: '' })),
    ])
  )
}

/** Lecciones y pausas del dia elegido. */
const filas = computed(() => {
  const celdas = dias.value?.[dia.value] ?? []
  return BLOQUES.map((b) => {
    const enCurso =
      dia.value === diaHoy && actual.value && actual.value.inicio === b.inicio
    if (b.tipo === 'pausa') return { ...b, enCurso }
    const celda = celdas[b.numero - 1] ?? {}
    return { ...b, ...celda, libre: !celda.materia, enCurso }
  })
})

const leccionesDeLaSemana = computed(() => {
  if (!dias.value) return 0
  return DIAS_LECTIVOS.reduce(
    (n, d) => n + (dias.value[d] ?? []).filter((c) => c.materia).length,
    0
  )
})

const seccionesQueAtiende = computed(() => {
  if (!dias.value) return []
  const todas = new Set()
  for (const d of DIAS_LECTIVOS)
    for (const c of dias.value[d] ?? []) if (c.seccion) todas.add(c.seccion)
  return [...todas].sort()
})

async function cargar() {
  cargando.value = true
  try {
    const { horario } = await api.get(props.ruta)
    existe.value = Boolean(horario)
    dias.value = horario?.dias ?? null
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
}

function empezarEdicion() {
  borrador.value = JSON.parse(JSON.stringify(dias.value ?? vacio()))
  editando.value = true
  vista.value = 'dia'
}

async function cancelar() {
  const cambio =
    JSON.stringify(borrador.value) !== JSON.stringify(dias.value ?? vacio())
  if (cambio) {
    const si = await confirmar.preguntar({
      titulo: '¿Descartar los cambios?',
      mensaje: 'Lo que cambiaste en el horario no se va a guardar.',
      aceptar: 'Descartar',
    })
    if (!si) return
  }
  editando.value = false
  borrador.value = null
}

function copiarATodaLaSemana() {
  const base = borrador.value[dia.value]
  for (const d of DIAS_LECTIVOS) {
    if (d !== dia.value) borrador.value[d] = base.map((c) => ({ ...c }))
  }
  avisos.info(
    `Copiamos el ${NOMBRE_DIA[dia.value].toLowerCase()} a toda la semana. Revisá y guardá.`
  )
}

async function guardar() {
  guardando.value = true
  try {
    const { horario } = await api.put(props.ruta, {
      dias: borrador.value,
    })
    dias.value = horario.dias
    existe.value = true
    editando.value = false
    avisos.exito(
      props.de
        ? `Guardamos el horario de ${props.de}.`
        : 'Guardamos tu horario.'
    )
  } catch (e) {
    avisos.error(e.message)
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargar()
  reloj = setInterval(() => (actual.value = bloqueActual()), 30000)
})
onUnmounted(() => clearInterval(reloj))
</script>

<template>
  <div class="mio">
    <!-- Resumen -->
    <div v-if="existe && !editando" class="resumen">
      <div class="resumen__dato">
        <strong>{{ leccionesDeLaSemana }}</strong>
        <span>lecciones por semana</span>
      </div>
      <div class="resumen__dato">
        <strong>{{ seccionesQueAtiende.length }}</strong>
        <span>secciones</span>
      </div>
      <ul class="resumen__secciones" aria-label="Secciones que atendés">
        <li
          v-for="s in seccionesQueAtiende"
          :key="s"
          class="etiqueta etiqueta--principal"
        >
          {{ s }}
        </li>
      </ul>
    </div>

    <div class="controles">
      <div class="segmentos dias" role="group" aria-label="Día">
        <button
          v-for="d in DIAS_LECTIVOS"
          :key="d"
          type="button"
          :aria-pressed="dia === d"
          :disabled="vista === 'semana' && !editando"
          @click="dia = d"
        >
          {{ NOMBRE_DIA[d].slice(0, 3)
          }}<span class="solo-lectores">{{ NOMBRE_DIA[d].slice(3) }}</span>
          <span v-if="d === diaHoy" class="hoy" aria-label="hoy">hoy</span>
        </button>
      </div>

      <div class="controles__acciones">
        <div
          v-if="existe && !editando"
          class="segmentos"
          role="group"
          aria-label="Forma de ver"
        >
          <button
            type="button"
            :aria-pressed="vista === 'dia'"
            aria-label="Ver por día"
            @click="vista = 'dia'"
          >
            <LayoutList :size="16" aria-hidden="true" />
          </button>
          <button
            type="button"
            :aria-pressed="vista === 'semana'"
            aria-label="Ver la semana"
            @click="vista = 'semana'"
          >
            <CalendarDays :size="16" aria-hidden="true" />
          </button>
        </div>
        <button
          v-if="!editando && !cargando"
          type="button"
          class="boton boton--contorno boton--pequeno"
          @click="empezarEdicion"
        >
          <Pencil :size="16" aria-hidden="true" />
          {{ existe ? 'Editar' : 'Crear mi horario' }}
        </button>
      </div>
    </div>

    <div v-if="cargando" class="esqueleto" style="height: 360px" />

    <!-- Edicion -->
    <form v-else-if="editando" class="editor" @submit.prevent="guardar">
      <p class="nota">
        Elegí la sección, escribí la materia y el aula de cada lección del
        {{ NOMBRE_DIA[dia].toLowerCase() }}. Dejá la materia vacía si esa
        lección la tenés libre.
      </p>
      <datalist id="materias-sugeridas">
        <option v-for="m in props.materias" :key="m" :value="m" />
      </datalist>
      <TransitionGroup tag="ol" name="lista" class="editor__lista">
        <li
          v-for="(l, i) in LECCIONES"
          :key="`${dia}-${l.numero}`"
          class="editor__fila"
          :style="{ '--i': i }"
        >
          <span class="editor__hora">
            <strong>{{ l.numero }}</strong>
            {{ horaLegible(l.inicio) }}
          </span>
          <label class="editor__campo">
            <span class="solo-lectores"
              >Sección de la lección {{ l.numero }}</span
            >
            <select v-model="borrador[dia][i].seccion" class="campo__control">
              <option value="">Sin sección</option>
              <optgroup
                v-for="g in gruposSeccion"
                :key="g.nivel"
                :label="g.nivel"
              >
                <option v-for="s in g.lista" :key="s" :value="s">
                  {{ s }}
                </option>
              </optgroup>
            </select>
          </label>
          <label class="editor__campo editor__campo--materia">
            <span class="solo-lectores"
              >Materia de la lección {{ l.numero }}</span
            >
            <input
              v-model="borrador[dia][i].materia"
              class="campo__control"
              list="materias-sugeridas"
              maxlength="50"
              placeholder="Materia"
            />
          </label>
          <label class="editor__campo">
            <span class="solo-lectores">Aula de la lección {{ l.numero }}</span>
            <input
              v-model="borrador[dia][i].aula"
              class="campo__control"
              maxlength="30"
              placeholder="Aula"
            />
          </label>
        </li>
      </TransitionGroup>
      <div class="editor__acciones">
        <button
          type="button"
          class="boton boton--texto boton--pequeno"
          @click="copiarATodaLaSemana"
        >
          <Copy :size="16" aria-hidden="true" />
          Copiar este día a toda la semana
        </button>
        <span class="editor__espacio" />
        <button
          type="button"
          class="boton boton--contorno"
          :disabled="guardando"
          @click="cancelar"
        >
          <X :size="18" aria-hidden="true" /> Cancelar
        </button>
        <button
          type="submit"
          class="boton boton--principal"
          :disabled="guardando"
        >
          <Save :size="18" aria-hidden="true" />
          {{ guardando ? 'Guardando...' : 'Guardar horario' }}
        </button>
      </div>
    </form>

    <EstadoVacio
      v-else-if="!existe"
      :icono="CalendarClock"
      :titulo="
        de
          ? `${de} todavía no tiene horario cargado`
          : 'Todavía no tenés tu horario cargado'
      "
      texto="Se carga una vez y CitX muestra cada día qué sección toca, la materia y el aula."
    />

    <!-- Semana completa -->
    <div v-else-if="vista === 'semana'" class="semana-envoltura">
      <table class="semana">
        <caption class="solo-lectores">
          Tu horario de la semana
        </caption>
        <thead>
          <tr>
            <th scope="col">Lección</th>
            <th
              v-for="d in DIAS_LECTIVOS"
              :key="d"
              scope="col"
              :class="{ 'es-hoy': d === diaHoy }"
            >
              {{ NOMBRE_DIA[d] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in LECCIONES" :key="l.numero">
            <th scope="row">
              <strong>{{ l.numero }}</strong>
              <span>{{ horaLegible(l.inicio) }}</span>
            </th>
            <td
              v-for="d in DIAS_LECTIVOS"
              :key="d"
              :class="{
                'es-hoy': d === diaHoy,
                'es-libre': !dias[d]?.[l.numero - 1]?.materia,
              }"
            >
              <template v-if="dias[d]?.[l.numero - 1]?.materia">
                <span class="semana__seccion">{{
                  dias[d][l.numero - 1].seccion || 'Sin sección'
                }}</span>
                <span class="semana__materia">{{
                  dias[d][l.numero - 1].materia
                }}</span>
                <span v-if="dias[d][l.numero - 1].aula" class="semana__aula">{{
                  dias[d][l.numero - 1].aula
                }}</span>
              </template>
              <span v-else class="solo-lectores">Libre</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Un dia -->
    <Transition v-else name="dia" mode="out-in">
      <ol
        :key="dia"
        class="horario"
        :aria-label="`Tu horario del ${NOMBRE_DIA[dia].toLowerCase()}`"
      >
        <li
          v-for="(f, i) in filas"
          :key="f.inicio"
          class="bloque"
          :class="{
            'bloque--pausa': f.tipo === 'pausa',
            'bloque--libre': f.tipo === 'leccion' && f.libre,
            'es-ahora': f.enCurso,
          }"
          :style="{ '--i': i }"
          :aria-current="f.enCurso ? 'time' : undefined"
        >
          <span class="bloque__hora">{{ horaLegible(f.inicio) }}</span>
          <span class="bloque__contenido">
            <span v-if="f.tipo === 'pausa'" class="bloque__pausa">
              <component
                :is="f.clave === 'almuerzo' ? Utensils : Coffee"
                :size="14"
                aria-hidden="true"
              />
              {{ f.nombre }}
            </span>
            <template v-else-if="f.libre">
              <span class="bloque__libre">Lección libre</span>
            </template>
            <template v-else>
              <span class="bloque__linea">
                <span v-if="f.seccion" class="bloque__seccion">{{
                  f.seccion
                }}</span>
                <strong class="bloque__materia">{{ f.materia }}</strong>
              </span>
              <span v-if="f.aula" class="bloque__aula">Aula {{ f.aula }}</span>
            </template>
          </span>
          <span v-if="f.enCurso" class="bloque__ahora">En curso</span>
        </li>
      </ol>
    </Transition>
  </div>
</template>

<style scoped>
.mio {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.resumen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-3) var(--e-6);
  padding: var(--e-4) var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--marino-800);
  color: var(--marino-100);
  animation: entra calc(500ms * var(--mov)) var(--curva-salida) backwards;
}

.resumen__dato {
  display: flex;
  align-items: baseline;
  gap: var(--e-2);
  font-size: var(--txt-sm);
}

.resumen__dato strong {
  font-size: var(--txt-2xl);
  color: #ffffff;
  font-variant-numeric: tabular-nums;
}

.resumen__secciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-1);
}

.resumen__secciones .etiqueta {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

@keyframes entra {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.controles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
}

.controles__acciones {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}

.dias button {
  position: relative;
  min-width: 52px;
}

.dias button:disabled {
  opacity: 0.45;
  cursor: default;
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

/* ---------- Un dia ---------- */
.horario {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--borde);
  border-radius: var(--radio-xl);
  overflow: hidden;
  background: var(--superficie);
  box-shadow: var(--sombra-1);
}

.bloque {
  position: relative;
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--e-3);
  min-height: 62px;
  padding: var(--e-3) var(--e-4);
  border-bottom: 1px solid var(--borde-sutil);
  animation: fila calc(420ms * var(--mov)) var(--curva-salida) backwards;
  animation-delay: calc(var(--i) * 22ms * var(--mov));
}

@keyframes fila {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
}

.bloque:last-child {
  border-bottom: none;
}

.bloque__hora {
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
  font-variant-numeric: tabular-nums;
}

.bloque__contenido {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bloque__linea {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
}

.bloque__seccion {
  padding: 2px 8px;
  border-radius: var(--radio-sm);
  background: var(--marca);
  color: #ffffff;
  font-size: var(--txt-xs);
  font-weight: var(--peso-fuerte);
}

:root[data-tema='oscuro'] .bloque__seccion {
  color: var(--gris-950);
}

.bloque__materia {
  font-weight: var(--peso-semi);
}

.bloque__aula,
.bloque__libre {
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
}

.bloque--libre .bloque__libre {
  font-style: italic;
}

.bloque--pausa {
  min-height: 44px;
  background: var(--superficie-2);
}

.bloque__pausa {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-suave);
}

.es-ahora {
  background: var(--principal-suave);
}

.es-ahora::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--principal);
}

.bloque__ahora {
  padding: 3px 10px;
  border-radius: var(--radio-pildora);
  background: var(--principal);
  color: var(--sobre-principal);
  font-size: 0.6875rem;
  font-weight: var(--peso-fuerte);
  white-space: nowrap;
}

.dia-enter-active {
  transition: opacity calc(200ms * var(--mov)) ease;
}

.dia-leave-active {
  transition: opacity calc(120ms * var(--mov)) ease;
}

.dia-enter-from,
.dia-leave-to {
  opacity: 0;
}

/* ---------- Semana ---------- */
.semana-envoltura {
  overflow-x: auto;
  border: 1px solid var(--borde);
  border-radius: var(--radio-xl);
  background: var(--superficie);
  box-shadow: var(--sombra-1);
  animation: entra calc(400ms * var(--mov)) var(--curva-salida) backwards;
}

.semana {
  width: 100%;
  min-width: 44rem;
  border-collapse: collapse;
  font-size: var(--txt-xs);
}

.semana th,
.semana td {
  padding: var(--e-2);
  border-bottom: 1px solid var(--borde-sutil);
  border-right: 1px solid var(--borde-sutil);
  text-align: left;
  vertical-align: top;
}

.semana thead th {
  background: var(--superficie-2);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.semana tbody th {
  white-space: nowrap;
  color: var(--texto-tenue);
  font-weight: var(--peso-normal);
}

.semana tbody th strong {
  display: block;
  color: var(--texto);
}

.semana .es-hoy {
  background: color-mix(in srgb, var(--principal-suave) 70%, transparent);
}

.semana td.es-libre {
  background-image: repeating-linear-gradient(
    45deg,
    transparent 0 6px,
    color-mix(in srgb, var(--borde) 45%, transparent) 6px 7px
  );
}

.semana__seccion {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radio-xs);
  background: var(--marca);
  color: #ffffff;
  font-weight: var(--peso-fuerte);
}

:root[data-tema='oscuro'] .semana__seccion {
  color: var(--gris-950);
}

.semana__materia {
  display: block;
  margin-top: 2px;
  font-weight: var(--peso-semi);
  color: var(--texto);
}

.semana__aula {
  color: var(--texto-tenue);
}

/* ---------- Editor ---------- */
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.editor__lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.editor__fila {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas:
    'hora seccion aula'
    'hora materia materia';
  gap: var(--e-2);
  align-items: center;
  padding: var(--e-3);
  border-radius: var(--radio-md);
  border: 1px solid var(--borde);
  background: var(--superficie);
  animation: fila calc(380ms * var(--mov)) var(--curva-salida) backwards;
  animation-delay: calc(var(--i) * 25ms * var(--mov));
}

.editor__hora {
  grid-area: hora;
  display: flex;
  flex-direction: column;
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
}

.editor__hora strong {
  font-size: var(--txt-lg);
  color: var(--texto);
}

.editor__campo .campo__control {
  min-height: 40px;
  padding-block: var(--e-2);
  font-size: var(--txt-sm);
}

.editor__campo--materia {
  grid-area: materia;
}

.editor__acciones {
  position: sticky;
  bottom: calc(
    var(--alto-barra-inferior) + var(--e-3) + env(safe-area-inset-bottom) +
      var(--e-5)
  );
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  padding: var(--e-3);
  border-radius: var(--radio-lg);
  background: var(--fondo-elevado);
  box-shadow: var(--sombra-flotante);
}

.editor__espacio {
  flex: 1;
}

@media (min-width: 768px) {
  .editor__fila {
    grid-template-columns: 4.5rem 9rem minmax(0, 1fr) 8rem;
    grid-template-areas: 'hora seccion materia aula';
  }
}

@media (min-width: 1024px) {
  .editor__acciones {
    bottom: var(--e-4);
  }
}
</style>
