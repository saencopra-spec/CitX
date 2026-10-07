<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import {
  Search,
  ScanLine,
  Volume2,
  VolumeX,
  ArrowRight,
  Undo2,
  Clock,
  Banknote,
  CircleCheck,
  X,
} from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import Dialogo from '@/components/Dialogo.vue'
import { api } from '@/lib/api'
import { usarSondeo } from '@/lib/sondeo'
import { sonarCampana } from '@/lib/avisosNavegador'
import { useAvisos } from '@/stores/avisos'
import { useConfiguracion } from '@/stores/configuracion'
import { colones } from '@compartido/dinero.js'
import {
  horaDe,
  horaLegible,
  fechaIsoLegible,
  partesCR,
} from '@compartido/hora.js'
import {
  ESTADOS_PEDIDO,
  NOMBRE_ESTADO,
  siguienteEstado,
  codigoDesdeQR,
  METODOS_PAGO,
} from '@compartido/pedidos.js'
import { inicioFranja } from '@compartido/jornada.js'

const avisos = useAvisos()
const configuracion = useConfiguracion()

const pedidos = ref([])
const hoy = ref('')
const cargado = ref(false)
const busqueda = ref('')
const columnaMovil = ref('recibido')
const cambiando = ref(new Set())
const resaltado = ref(null)
let conocidos = null

/** Entregado hoy segun la hora de Costa Rica (no la fecha de retiro). */
function entregadoHoy(p) {
  const paso = [...p.historial].reverse().find((h) => h.estado === 'entregado')
  return paso ? partesCR(paso.en).iso === hoy.value : false
}

const accionPara = {
  recibido: 'Empezar a preparar',
  preparacion: 'Marcar como listo',
  listo: 'Entregar',
}

const columnas = computed(() =>
  ESTADOS_PEDIDO.map((estado) => ({
    estado,
    titulo: estado === 'entregado' ? 'Entregados hoy' : NOMBRE_ESTADO[estado],
    pedidos: pedidos.value
      .filter((p) => p.estado === estado)
      .filter((p) => estado !== 'entregado' || entregadoHoy(p))
      .filter(
        (p) =>
          !busqueda.value ||
          p.codigo.includes(busqueda.value.trim().toUpperCase())
      )
      .sort((a, b) =>
        estado === 'entregado' ? b.creadoEn.localeCompare(a.creadoEn) : 0
      ),
  }))
)

async function cargar() {
  const datos = await api.get('/pedidos')
  hoy.value = datos.hoy
  const nuevos = datos.pedidos.filter(
    (p) => conocidos && !conocidos.has(p.codigo)
  )
  if (nuevos.length) {
    if (configuracion.ajustes.sonidoPedidos) sonarCampana()
    avisos.info(
      nuevos.length === 1
        ? `Entró el pedido ${nuevos[0].codigo}.`
        : `Entraron ${nuevos.length} pedidos nuevos.`
    )
  }
  conocidos = new Set(datos.pedidos.map((p) => p.codigo))
  pedidos.value = datos.pedidos
  cargado.value = true
}

const { refrescar } = usarSondeo(cargar, 5000)

async function mover(pedido, estado) {
  const s = new Set(cambiando.value)
  s.add(pedido.codigo)
  cambiando.value = s
  try {
    const { pedido: actualizado } = await api.patch(
      `/pedidos/${pedido.codigo}/estado`,
      { estado }
    )
    Object.assign(pedido, actualizado)
    avisos.exito(`${pedido.codigo}: ${NOMBRE_ESTADO[estado].toLowerCase()}.`, {
      duracion: 2000,
    })
  } catch (e) {
    avisos.error(e.message)
    refrescar()
  } finally {
    const t = new Set(cambiando.value)
    t.delete(pedido.codigo)
    cambiando.value = t
  }
}

function anterior(estado) {
  const i = ESTADOS_PEDIDO.indexOf(estado)
  return i > 0 ? ESTADOS_PEDIDO[i - 1] : null
}

async function irAPedido(codigo) {
  const pedido = pedidos.value.find((p) => p.codigo === codigo)
  if (!pedido) {
    avisos.aviso(`No hay ningún pedido activo con el código ${codigo}.`)
    return
  }
  busqueda.value = ''
  columnaMovil.value = pedido.estado
  resaltado.value = codigo
  await nextTick()
  document
    .getElementById(`pedido-${codigo}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => (resaltado.value = null), 3000)
}

// --- Escanear el QR con la camara ---
const escaneando = ref(false)
const video = ref(null)
const problemaCamara = ref('')
let flujo = null
let ciclo = null

async function abrirEscaner() {
  problemaCamara.value = ''
  escaneando.value = true
  if (!('BarcodeDetector' in window)) {
    problemaCamara.value =
      'Este navegador no puede leer códigos QR. Escribí el código en el buscador.'
    return
  }
  try {
    flujo = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    await nextTick()
    video.value.srcObject = flujo
    await video.value.play()
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    ciclo = setInterval(async () => {
      try {
        const [r] = await detector.detect(video.value)
        const codigo = r && codigoDesdeQR(r.rawValue)
        if (codigo) {
          cerrarEscaner()
          irAPedido(codigo)
        }
      } catch {
        // Cuadro sin QR: se sigue intentando.
      }
    }, 300)
  } catch {
    problemaCamara.value =
      'No pudimos usar la cámara. Revisá que el navegador tenga permiso o escribí el código.'
  }
}

function cerrarEscaner() {
  escaneando.value = false
  clearInterval(ciclo)
  flujo?.getTracks().forEach((t) => t.stop())
  flujo = null
}

onUnmounted(cerrarEscaner)

function alternarSonido() {
  configuracion.cambiar('sonidoPedidos', !configuracion.ajustes.sonidoPedidos)
  if (configuracion.ajustes.sonidoPedidos) sonarCampana()
}

function buscarCodigo() {
  const codigo = codigoDesdeQR(busqueda.value)
  if (codigo) irAPedido(codigo)
}
</script>

<template>
  <div class="tablero">
    <EncabezadoPanel
      titulo="Pedidos"
      ayuda="Tocá el botón de cada pedido para pasarlo al siguiente paso. A quien pidió le llega un aviso cuando está listo."
    >
      <template #acciones>
        <button
          type="button"
          class="boton boton--contorno boton--pequeno"
          :aria-pressed="configuracion.ajustes.sonidoPedidos"
          @click="alternarSonido"
        >
          <component
            :is="configuracion.ajustes.sonidoPedidos ? Volume2 : VolumeX"
            :size="18"
            aria-hidden="true"
          />
          {{
            configuracion.ajustes.sonidoPedidos
              ? 'Sonido activado'
              : 'Sonido apagado'
          }}
        </button>
        <button
          type="button"
          class="boton boton--accion boton--pequeno"
          @click="abrirEscaner"
        >
          <ScanLine :size="18" aria-hidden="true" /> Escanear QR
        </button>
      </template>
    </EncabezadoPanel>

    <form
      class="buscador busqueda"
      role="search"
      @submit.prevent="buscarCodigo"
    >
      <Search :size="20" aria-hidden="true" />
      <label for="buscar-codigo" class="solo-lectores"
        >Buscar pedido por código</label
      >
      <input
        id="buscar-codigo"
        v-model="busqueda"
        class="entrada"
        type="search"
        autocomplete="off"
        autocapitalize="characters"
        maxlength="20"
        placeholder="Código del pedido, por ejemplo K7M2Q"
      />
    </form>

    <div
      class="segmentos columnas-movil"
      role="group"
      aria-label="Columna visible"
    >
      <button
        v-for="c in columnas"
        :key="c.estado"
        type="button"
        :aria-pressed="columnaMovil === c.estado"
        @click="columnaMovil = c.estado"
      >
        {{ c.titulo }} <span class="cuenta">{{ c.pedidos.length }}</span>
      </button>
    </div>

    <div v-if="!cargado" class="columnas">
      <div
        v-for="n in 4"
        :key="n"
        class="esqueleto"
        style="height: 280px; border-radius: var(--radio-lg)"
      />
    </div>

    <div v-else class="columnas">
      <section
        v-for="c in columnas"
        :key="c.estado"
        class="columna"
        :class="[
          `columna--${c.estado}`,
          { 'es-visible': columnaMovil === c.estado },
        ]"
        :aria-labelledby="`col-${c.estado}`"
      >
        <h2 :id="`col-${c.estado}`" class="columna__titulo">
          {{ c.titulo }} <span class="cuenta">{{ c.pedidos.length }}</span>
        </h2>
        <p v-if="!c.pedidos.length" class="columna__vacia">Nada por aquí.</p>
        <TransitionGroup tag="ul" name="tarjeta" class="columna__lista">
          <li
            v-for="p in c.pedidos"
            :id="`pedido-${p.codigo}`"
            :key="p.codigo"
            class="pedido"
            :class="{ 'es-resaltado': resaltado === p.codigo }"
          >
            <div class="pedido__encabezado">
              <span class="pedido__codigo">{{ p.codigo }}</span>
              <span class="pedido__hora">{{ horaDe(p.creadoEn) }}</span>
            </div>
            <p class="pedido__cliente">
              {{ p.usuarioNombre
              }}<template v-if="p.usuarioSeccion">
                · {{ p.usuarioSeccion }}</template
              >
            </p>
            <ul class="pedido__items">
              <li v-for="i in p.items" :key="i.productoId">
                <strong>{{ i.cantidad }}×</strong> {{ i.nombre }}
                <span v-if="i.nota" class="pedido__nota">{{ i.nota }}</span>
              </li>
            </ul>
            <p class="pedido__meta">
              <span
                ><Clock :size="14" aria-hidden="true" /> {{ p.franja.nombre }}
                {{
                  horaLegible(p.franja.inicio ?? inicioFranja(p.franja.clave))
                }}</span
              >
              <span
                v-if="p.franja.fecha !== hoy"
                class="etiqueta etiqueta--aviso"
                >{{ fechaIsoLegible(p.franja.fecha) }}</span
              >
            </p>
            <p class="pedido__meta">
              <span
                v-if="p.pago.estado === 'pendiente'"
                class="etiqueta etiqueta--aviso"
              >
                <Banknote :size="14" aria-hidden="true" /> Cobrar
                {{ colones(p.total) }} en efectivo
              </span>
              <span v-else class="etiqueta etiqueta--exito">
                <CircleCheck :size="14" aria-hidden="true" /> Pagado ·
                {{ METODOS_PAGO[p.pago.metodo] }}
              </span>
            </p>
            <div class="pedido__acciones">
              <button
                v-if="siguienteEstado(p.estado)"
                type="button"
                class="boton boton--accion boton--ancho"
                :disabled="cambiando.has(p.codigo)"
                @click="mover(p, siguienteEstado(p.estado))"
              >
                {{ accionPara[p.estado] }}
                <ArrowRight :size="18" aria-hidden="true" />
              </button>
              <button
                v-if="anterior(p.estado)"
                type="button"
                class="boton boton--texto boton--pequeno"
                :disabled="cambiando.has(p.codigo)"
                :aria-label="`Devolver ${p.codigo} a ${NOMBRE_ESTADO[anterior(p.estado)]}`"
                @click="mover(p, anterior(p.estado))"
              >
                <Undo2 :size="16" aria-hidden="true" /> Devolver
              </button>
            </div>
          </li>
        </TransitionGroup>
      </section>
    </div>

    <Dialogo
      :abierto="escaneando"
      titulo="Escanear el código QR"
      descripcion="Apuntá la cámara al QR que muestra la persona."
      @cerrar="cerrarEscaner"
    >
      <p v-if="problemaCamara" class="nota nota--aviso">
        <X :size="18" aria-hidden="true" /><span>{{ problemaCamara }}</span>
      </p>
      <div v-else class="camara">
        <video ref="video" playsinline muted />
        <span class="camara__marco" aria-hidden="true" />
      </div>
    </Dialogo>
  </div>
</template>

<style scoped>
.busqueda {
  max-width: 26rem;
  margin-bottom: var(--e-4);
}

.cuenta {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: var(--radio-pildora);
  background: var(--superficie-3);
  color: var(--texto-suave);
  font-size: var(--txt-xs);
  font-weight: var(--peso-fuerte);
}

.columnas-movil {
  display: flex;
  overflow-x: auto;
  flex-wrap: nowrap;
  max-width: 100%;
  margin-bottom: var(--e-4);
}

.columnas-movil button {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
}

.columnas {
  display: grid;
  gap: var(--e-4);
  align-items: start;
}

.columna {
  display: none;
  flex-direction: column;
  gap: var(--e-3);
  padding: var(--e-3);
  border-radius: var(--radio-lg);
  background: var(--superficie-3);
  min-width: 0;
}

.columna.es-visible {
  display: flex;
}

.columna__titulo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-2);
  padding: var(--e-1) var(--e-2);
  font-size: var(--txt-md);
}

.columna--listo .columna__titulo {
  color: var(--exito);
}

.columna__vacia {
  padding: var(--e-4) var(--e-2);
  color: var(--texto-tenue);
  font-size: var(--txt-sm);
}

.columna__lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.pedido {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  padding: var(--e-4);
  border-radius: var(--radio-md);
  background: var(--superficie);
  border: 1px solid var(--borde);
  box-shadow: var(--sombra-1);
  transition:
    box-shadow var(--dur-media) var(--curva),
    border-color var(--dur-media) var(--curva);
}

.columna--listo .pedido {
  border-left: 4px solid var(--exito);
}

.es-resaltado {
  border-color: var(--accion);
  box-shadow: 0 0 0 4px var(--foco-halo);
}

.pedido__encabezado {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.pedido__codigo {
  font-family: var(--fuente-mono);
  font-size: var(--txt-xl);
  font-weight: var(--peso-extra);
  letter-spacing: 0.08em;
}

.pedido__hora {
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

.pedido__cliente {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.pedido__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--e-2) 0;
  border-block: 1px dashed var(--borde);
}

.pedido__nota {
  display: block;
  margin-left: var(--e-5);
  font-size: var(--txt-sm);
  color: var(--aviso);
  font-weight: var(--peso-semi);
}

.pedido__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.pedido__meta > span:first-child:not(.etiqueta) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pedido__acciones {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--e-1);
  margin-top: var(--e-1);
}

.camara {
  position: relative;
  border-radius: var(--radio-md);
  overflow: hidden;
  background: #000000;
  aspect-ratio: 1;
}

.camara video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camara__marco {
  position: absolute;
  inset: 18%;
  border: 3px solid #ffffff;
  border-radius: var(--radio-lg);
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.35);
}

.tarjeta-enter-active,
.tarjeta-leave-active {
  transition:
    opacity var(--dur-media) var(--curva),
    transform var(--dur-media) var(--curva);
}

.tarjeta-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.tarjeta-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.tarjeta-move {
  transition: transform var(--dur-media) var(--curva);
}

@media (min-width: 1024px) {
  .columnas-movil {
    display: none;
  }

  .columnas {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .columna {
    display: flex;
  }
}
</style>
