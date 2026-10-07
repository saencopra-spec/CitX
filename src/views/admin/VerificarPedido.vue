<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ScanLine,
  ArrowRight,
  Banknote,
  CircleCheck,
  CircleAlert,
  Clock,
  PackageCheck,
  User,
} from 'lucide-vue-next'
import EncabezadoPanel from '@/components/estructura/EncabezadoPanel.vue'
import EscanerQR from '@/components/soda/EscanerQR.vue'
import { api } from '@/lib/api'
import { useAvisos } from '@/stores/avisos'
import { colones } from '@compartido/dinero.js'
import { horaDe, horaLegible, fechaIsoLegible, partesCR } from '@compartido/hora.js'
import {
  NOMBRE_ESTADO,
  METODOS_PAGO,
  siguienteEstado,
  codigoDesdeQR,
} from '@compartido/pedidos.js'
import { inicioFranja } from '@compartido/jornada.js'

/**
 * Pagina que abre el QR de un pedido. La soda ve quien lo pidio, que lleva,
 * cuanto cobrar y lo entrega con un solo boton.
 */
const props = defineProps({ codigo: { type: String, default: '' } })
const router = useRouter()
const avisos = useAvisos()

const pedido = ref(null)
const cargando = ref(false)
const error = ref('')
const moviendo = ref(false)
const escaneando = ref(false)
const manual = ref('')

const accionPara = {
  recibido: 'Empezar a preparar',
  preparacion: 'Marcar como listo',
  listo: 'Entregar pedido',
}

const hoy = computed(() => partesCR().iso)
const otroDia = computed(() => pedido.value && pedido.value.franja.fecha !== hoy.value)
const entregadoEn = computed(() => {
  const paso = [...(pedido.value?.historial ?? [])].reverse().find((h) => h.estado === 'entregado')
  return paso ? paso.en : null
})

async function cargar(codigo) {
  pedido.value = null
  error.value = ''
  if (!codigo) return
  cargando.value = true
  try {
    const datos = await api.get(`/pedidos/${codigo}`)
    pedido.value = datos.pedido
  } catch (e) {
    error.value = e.estado === 404 ? `No existe ningún pedido con el código ${codigo}.` : e.message
  } finally {
    cargando.value = false
  }
}

watch(
  () => props.codigo,
  (codigo) => cargar(codigo?.toUpperCase()),
  { immediate: true }
)

function abrir(codigo) {
  escaneando.value = false
  manual.value = ''
  if (codigo === props.codigo?.toUpperCase()) cargar(codigo)
  else router.push({ name: 'admin-verificar', params: { codigo } })
}

function buscar() {
  const codigo = codigoDesdeQR(manual.value)
  if (!codigo) {
    avisos.aviso('El código son 5 letras o números, por ejemplo K7M2Q.')
    return
  }
  abrir(codigo)
}

async function avanzar() {
  const estado = siguienteEstado(pedido.value.estado)
  if (!estado) return
  moviendo.value = true
  try {
    const datos = await api.patch(`/pedidos/${pedido.value.codigo}/estado`, { estado })
    pedido.value = datos.pedido
    avisos.exito(
      estado === 'entregado'
        ? `Pedido ${pedido.value.codigo} entregado.`
        : `${pedido.value.codigo}: ${NOMBRE_ESTADO[estado].toLowerCase()}.`
    )
  } catch (e) {
    avisos.error(e.message)
    cargar(pedido.value.codigo)
  } finally {
    moviendo.value = false
  }
}
</script>

<template>
  <div class="verificar">
    <EncabezadoPanel
      titulo="Verificar pedido"
      ayuda="Escaneá el QR que muestra la persona (o escribí el código) para ver su pedido y entregarlo."
    >
      <template #acciones>
        <button type="button" class="boton boton--accion boton--pequeno" @click="escaneando = true">
          <ScanLine :size="18" aria-hidden="true" /> Escanear QR
        </button>
      </template>
    </EncabezadoPanel>

    <form class="buscador busqueda" role="search" @submit.prevent="buscar">
      <label for="verificar-codigo" class="solo-lectores">Código del pedido</label>
      <input
        id="verificar-codigo"
        v-model="manual"
        class="entrada"
        type="search"
        autocomplete="off"
        autocapitalize="characters"
        maxlength="60"
        placeholder="Código del pedido, por ejemplo K7M2Q"
      />
      <button type="submit" class="boton boton--contorno boton--pequeno">Buscar</button>
    </form>

    <div v-if="cargando" class="esqueleto" style="height: 360px; border-radius: var(--radio-lg)" />

    <p v-else-if="error" class="nota nota--aviso" role="alert">
      <CircleAlert :size="18" aria-hidden="true" /><span>{{ error }}</span>
    </p>

    <section v-else-if="!pedido" class="tarjeta inicio">
      <ScanLine :size="48" aria-hidden="true" class="inicio__icono" />
      <h2>Listo para escanear</h2>
      <p class="texto-suave">
        También podés escanear el QR con la cámara normal del celular: se abre esta misma página con el
        pedido.
      </p>
      <button type="button" class="boton boton--accion boton--grande" @click="escaneando = true">
        <ScanLine :size="20" aria-hidden="true" /> Escanear QR
      </button>
    </section>

    <article v-else class="tarjeta pedido" :class="`pedido--${pedido.estado}`">
      <header class="pedido__encabezado">
        <div>
          <p class="pedido__etiqueta">Pedido</p>
          <p class="pedido__codigo">{{ pedido.codigo }}</p>
        </div>
        <span
          class="etiqueta"
          :class="{
            'etiqueta--exito': pedido.estado === 'listo',
            'etiqueta--neutra': pedido.estado === 'entregado',
            'etiqueta--info': pedido.estado === 'recibido' || pedido.estado === 'preparacion',
          }"
          >{{ NOMBRE_ESTADO[pedido.estado] }}</span
        >
      </header>

      <p v-if="entregadoEn" class="nota nota--aviso" role="status">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>Este pedido ya se entregó a las {{ horaDe(entregadoEn) }}. No lo entregués de nuevo.</span>
      </p>
      <p v-else-if="otroDia" class="nota nota--aviso">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>Ojo: este pedido es para el {{ fechaIsoLegible(pedido.franja.fecha) }}, no para hoy.</span>
      </p>

      <dl class="datos">
        <div>
          <dt><User :size="16" aria-hidden="true" /> Quién lo pidió</dt>
          <dd>
            {{ pedido.usuarioNombre }}<template v-if="pedido.usuarioSeccion"> · {{ pedido.usuarioSeccion }}</template>
          </dd>
        </div>
        <div>
          <dt><Clock :size="16" aria-hidden="true" /> Retiro</dt>
          <dd>
            {{ pedido.franja.nombre }},
            {{ horaLegible(pedido.franja.inicio ?? inicioFranja(pedido.franja.clave)) }}
          </dd>
        </div>
      </dl>

      <ul class="items">
        <li v-for="i in pedido.items" :key="i.productoId">
          <span class="items__cantidad">{{ i.cantidad }}×</span>
          <span>
            {{ i.nombre }}
            <span v-if="i.nota" class="items__nota">{{ i.nota }}</span>
          </span>
          <span class="items__precio">{{ colones(i.precio * i.cantidad) }}</span>
        </li>
      </ul>

      <div class="cobro" :class="{ 'cobro--pendiente': pedido.pago.estado === 'pendiente' }">
        <template v-if="pedido.pago.estado === 'pendiente'">
          <Banknote :size="22" aria-hidden="true" />
          <span>Cobrar <strong>{{ colones(pedido.total) }}</strong> en efectivo</span>
        </template>
        <template v-else>
          <CircleCheck :size="22" aria-hidden="true" />
          <span>Pagado con {{ METODOS_PAGO[pedido.pago.metodo] }} · {{ colones(pedido.total) }}</span>
        </template>
      </div>

      <button
        v-if="siguienteEstado(pedido.estado)"
        type="button"
        class="boton boton--accion boton--ancho boton--grande"
        :disabled="moviendo"
        @click="avanzar"
      >
        {{ accionPara[pedido.estado] }}
        <ArrowRight :size="20" aria-hidden="true" />
      </button>
      <p v-else class="entregado">
        <PackageCheck :size="22" aria-hidden="true" /> Entregado
      </p>
    </article>

    <EscanerQR :abierto="escaneando" @cerrar="escaneando = false" @leido="abrir" />
  </div>
</template>

<style scoped>
.verificar {
  max-width: 36rem;
}

.busqueda {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  margin-bottom: var(--e-5);
}

.busqueda .entrada {
  flex: 1;
}

.inicio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-3);
  padding: var(--e-7) var(--e-5);
  text-align: center;
}

.inicio__icono {
  color: var(--accion);
}

.pedido {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.pedido--listo {
  border-top: 6px solid var(--exito);
}

.pedido__encabezado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--e-3);
}

.pedido__etiqueta {
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

.pedido__codigo {
  font-family: var(--fuente-mono);
  font-size: var(--txt-3xl);
  font-weight: var(--peso-extra);
  letter-spacing: 0.1em;
  line-height: 1.1;
}

.datos {
  display: grid;
  gap: var(--e-3);
}

.datos dt {
  display: inline-flex;
  align-items: center;
  gap: var(--e-1);
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

.datos dd {
  font-weight: var(--peso-semi);
}

.items {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  padding-block: var(--e-3);
  border-block: 1px dashed var(--borde);
}

.items li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--e-2);
}

.items__cantidad {
  font-weight: var(--peso-fuerte);
}

.items__nota {
  display: block;
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--aviso);
}

.items__precio {
  color: var(--texto-suave);
  font-variant-numeric: tabular-nums;
}

.cobro {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  padding: var(--e-3) var(--e-4);
  border-radius: var(--radio-md);
  background: var(--superficie-3);
  color: var(--exito);
  font-weight: var(--peso-semi);
}

.cobro--pendiente {
  color: var(--aviso);
  font-size: var(--txt-lg);
}

.entregado {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--e-2);
  padding: var(--e-3);
  color: var(--texto-suave);
  font-weight: var(--peso-semi);
}

@media (min-width: 640px) {
  .datos {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
