<script setup>
import { ref, watch } from 'vue'
import { TriangleAlert, Ban, CircleSlash } from 'lucide-vue-next'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Paginacion from '@/components/formularios/Paginacion.vue'
import { useSanciones } from '@/stores/sanciones'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { fechaCorta, horaDe } from '@compartido/hora.js'
import { NOMBRE_ESTADO_SANCION, textoFin } from '@compartido/sanciones.js'

/**
 * Historial de todo lo que se decidio en la soda: alertas, sanciones y
 * pedidos no recogidos descartados, con quien lo hizo, a quien y cuando. La
 * API lo entrega de a una pagina.
 */
const props = defineProps({
  abierto: { type: Boolean, default: false },
})
const emit = defineEmits(['cerrar', 'cambio'])

const sanciones = useSanciones()
const avisos = useAvisos()
const confirmar = useConfirmar()

const FILTROS = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'alertas', texto: 'Alertas' },
  { valor: 'sanciones', texto: 'Sanciones' },
  { valor: 'descartados', texto: 'Descartados' },
  { valor: 'activas', texto: 'Sanciones activas' },
]

const TIPOS = {
  alerta: { texto: 'Alerta', icono: TriangleAlert },
  sancion: { texto: 'Sanción', icono: Ban },
  descarte: { texto: 'Descartado', icono: CircleSlash },
}

const tonos = {
  activa: 'error',
  cumplida: 'neutra',
  levantada: 'info',
  reemplazada: 'neutra',
}

const filtro = ref('todos')
const pagina = ref(1)
const registros = ref([])
const total = ref(0)
const porPagina = ref(20)
const cargando = ref(false)
const error = ref('')
const quitando = ref('')
let consulta = 0

async function cargar() {
  const mia = ++consulta
  cargando.value = true
  error.value = ''
  try {
    const datos = await sanciones.historialGeneral(filtro.value, pagina.value)
    if (mia !== consulta) return
    const ultima = Math.max(1, Math.ceil(datos.total / datos.porPagina))
    if (!datos.registros.length && pagina.value > ultima) {
      pagina.value = ultima
      return cargar()
    }
    registros.value = datos.registros
    total.value = datos.total
    porPagina.value = datos.porPagina
  } catch (e) {
    if (mia === consulta) error.value = e.message
  } finally {
    if (mia === consulta) cargando.value = false
  }
}

watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return
    filtro.value = 'todos'
    pagina.value = 1
    cargar()
  }
)

function elegirFiltro(valor) {
  if (filtro.value === valor) return
  filtro.value = valor
  pagina.value = 1
  cargar()
}

function irAPagina(n) {
  pagina.value = n
  cargar()
}

function cuando(fecha) {
  return `${fechaCorta(fecha)}, ${horaDe(fecha)}`
}

async function quitarSancion(r) {
  const si = await confirmar.preguntar({
    titulo: `¿Quitar la sanción de ${r.usuarioNombre}?`,
    mensaje:
      'Va a poder volver a pedir en la soda de inmediato y le llega un aviso. La sanción queda en el historial como levantada.',
    aceptar: 'Quitar sanción',
    peligro: false,
  })
  if (!si) return
  quitando.value = r.id
  try {
    await sanciones.levantar(r.id)
    avisos.exito('Sanción quitada.')
    emit('cambio')
    await cargar()
  } catch (e) {
    avisos.error(e.message)
  } finally {
    quitando.value = ''
  }
}
</script>

<template>
  <Dialogo
    :abierto="abierto"
    titulo="Historial"
    descripcion="Alertas, sanciones y pedidos descartados, del más reciente al más antiguo."
    ancho="44rem"
    @cerrar="emit('cerrar')"
  >
    <div class="chips filtros" role="group" aria-label="Qué mostrar">
      <button
        v-for="f in FILTROS"
        :key="f.valor"
        type="button"
        class="chip"
        :aria-pressed="filtro === f.valor"
        @click="elegirFiltro(f.valor)"
      >
        {{ f.texto }}
      </button>
    </div>

    <p v-if="error" class="nota nota--aviso">{{ error }}</p>
    <p v-else-if="cargando && !registros.length" class="texto-suave">
      Cargando...
    </p>
    <p v-else-if="!registros.length" class="texto-suave">
      No hay nada para mostrar con este filtro.
    </p>
    <template v-else>
      <p class="texto-suave cuenta" aria-live="polite">
        {{ total }} {{ total === 1 ? 'registro' : 'registros' }}
      </p>
      <ol class="historial" :aria-busy="cargando">
        <li
          v-for="r in registros"
          :key="r.id"
          class="registro"
          :class="`registro--${r.tipo}`"
        >
          <span class="registro__icono" aria-hidden="true">
            <component :is="TIPOS[r.tipo].icono" :size="18" />
          </span>
          <div class="registro__cuerpo">
            <p class="registro__titulo">
              <strong>{{ TIPOS[r.tipo].texto }}</strong>
              <span
                v-if="r.tipo === 'sancion'"
                :class="`etiqueta etiqueta--${tonos[r.estado]}`"
                >{{ NOMBRE_ESTADO_SANCION[r.estado] }}</span
              >
              <span class="registro__fecha">{{ cuando(r.creadaEn) }}</span>
            </p>
            <p>
              A <strong>{{ r.usuarioNombre }}</strong>
              <template v-if="r.creadaPor">
                · por {{ r.creadaPor.nombre }}</template
              >
            </p>
            <p class="registro__detalle">
              Motivo: {{ r.razon
              }}<template v-if="r.pedidoCodigo">
                · Pedido {{ r.pedidoCodigo }}</template
              >
            </p>
            <p v-if="r.mensaje" class="registro__detalle">
              Mensaje: «{{ r.mensaje }}»
            </p>
            <p v-if="r.tipo === 'sancion'" class="registro__detalle">
              <template v-if="r.permanente">Permanente</template>
              <template v-else>Hasta {{ textoFin(r.hasta) }}</template>
              <template v-if="r.levantadaEn">
                ·
                {{ r.estado === 'reemplazada' ? 'reemplazada' : 'levantada' }}
                el {{ cuando(r.levantadaEn)
                }}<template
                  v-if="r.levantada?.por && r.levantada.motivo === 'admin'"
                >
                  por {{ r.levantada.por.nombre }}</template
                ></template
              >
            </p>
          </div>
          <button
            v-if="r.tipo === 'sancion' && r.estado === 'activa'"
            type="button"
            class="boton boton--contorno boton--pequeno"
            :disabled="quitando === r.id"
            @click="quitarSancion(r)"
          >
            {{ quitando === r.id ? 'Quitando...' : 'Quitar sanción' }}
          </button>
        </li>
      </ol>
      <Paginacion
        :pagina="pagina"
        :total="total"
        :por-pagina="porPagina"
        etiqueta="Páginas del historial"
        @cambiar="irAPagina"
      />
    </template>

    <template #pie>
      <button
        type="button"
        class="boton boton--contorno"
        @click="emit('cerrar')"
      >
        Cerrar
      </button>
    </template>
  </Dialogo>
</template>

<style scoped>
.filtros {
  flex-wrap: wrap;
  margin-bottom: var(--e-4);
}

.cuenta {
  margin: 0 0 var(--e-2);
  font-size: var(--txt-sm);
}

.historial {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.registro {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--e-3);
  padding: var(--e-3);
  border: 1px solid var(--borde);
  border-radius: var(--radio-md);
  background: var(--superficie);
  font-size: var(--txt-sm);
}

.registro__icono {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radio-pildora);
}

.registro--alerta .registro__icono {
  background: var(--aviso-fondo);
  color: var(--aviso);
}

.registro--sancion .registro__icono {
  background: var(--error-fondo);
  color: var(--error);
}

.registro--descarte .registro__icono {
  background: var(--superficie-3);
  color: var(--texto-suave);
}

.registro__cuerpo {
  display: flex;
  flex: 1 1 16rem;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.registro__cuerpo p {
  margin: 0;
  overflow-wrap: anywhere;
}

.registro__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
}

.registro__fecha,
.registro__detalle {
  color: var(--texto-suave);
}

.registro__fecha {
  margin-left: auto;
  font-size: var(--txt-xs);
}
</style>
