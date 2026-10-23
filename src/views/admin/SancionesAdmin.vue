<script setup>
import { onMounted, ref, watch } from 'vue'
import { Search, Ban, History, RefreshCw } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/estructura/EncabezadoPanel.vue'
import Dialogo from '@/components/avisos/Dialogo.vue'
import ListaNoRecogidos from '@/components/sanciones/ListaNoRecogidos.vue'
import FormularioSancion from '@/components/sanciones/FormularioSancion.vue'
import HistorialSanciones from '@/components/sanciones/HistorialSanciones.vue'
import { useSanciones } from '@/stores/sanciones'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { NOMBRE_ROL } from '@compartido/permisos.js'
import { textoFin } from '@compartido/sanciones.js'

/**
 * Panel de alertas y sanciones: los pedidos no recogidos que esperan una
 * decision y un buscador para sancionar a cualquier persona, ver su
 * historial o levantar una sancion antes de tiempo.
 */
const sanciones = useSanciones()
const avisos = useAvisos()
const confirmar = useConfirmar()

const lista = ref(null)
const busqueda = ref('')
const usuarios = ref([])
const buscando = ref(false)
const errorBusqueda = ref('')

const viendo = ref(null)
const historial = ref([])
const cargandoHistorial = ref(false)
const levantando = ref('')

const sancionando = ref(null)

let espera = null
let consulta = 0

async function buscar() {
  const mia = ++consulta
  buscando.value = true
  errorBusqueda.value = ''
  try {
    const encontrados = await sanciones.buscarUsuarios(busqueda.value.trim())
    if (mia === consulta) usuarios.value = encontrados
  } catch (e) {
    if (mia === consulta) errorBusqueda.value = e.message
  } finally {
    if (mia === consulta) buscando.value = false
  }
}

watch(busqueda, () => {
  clearTimeout(espera)
  espera = setTimeout(buscar, 300)
})

onMounted(buscar)

function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`
}

async function verHistorial(u) {
  viendo.value = u
  historial.value = []
  cargandoHistorial.value = true
  try {
    const datos = await sanciones.historialDe(u.id)
    historial.value = datos.historial
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargandoHistorial.value = false
  }
}

function abrirSancion(u) {
  sancionando.value = u
}

function sancionarDesdeHistorial() {
  const u = viendo.value
  viendo.value = null
  abrirSancion(u)
}

async function refrescar() {
  await buscar()
  if (viendo.value) {
    const actual = usuarios.value.find((u) => u.id === viendo.value.id)
    await verHistorial(actual ?? viendo.value)
  }
}

async function alSancionar() {
  sancionando.value = null
  await refrescar()
}

async function levantar(s) {
  const si = await confirmar.preguntar({
    titulo: '¿Levantar esta sanción?',
    mensaje: `${viendo.value?.nombre ?? 'La persona'} va a poder volver a pedir en la soda de inmediato y le llega un aviso.`,
    aceptar: 'Levantar sanción',
    peligro: false,
  })
  if (!si) return
  levantando.value = s.id
  try {
    await sanciones.levantar(s.id)
    avisos.exito('Sanción levantada.')
    await refrescar()
  } catch (e) {
    avisos.error(e.message)
  } finally {
    levantando.value = ''
  }
}
</script>

<template>
  <div class="sanciones">
    <EncabezadoPanel
      titulo="Alertas y sanciones"
      ayuda="Un pedido listo que no se retira a tiempo pasa solo a «No recogido». Vos decidís si alertar, sancionar o descartar el caso."
    />

    <section class="seccion" aria-labelledby="t-no-recogidos">
      <div class="seccion__encabezado">
        <h2 id="t-no-recogidos" class="seccion__titulo">
          Pedidos no recogidos
        </h2>
        <button
          type="button"
          class="boton boton--contorno boton--pequeno"
          @click="lista?.cargar()"
        >
          <RefreshCw :size="16" aria-hidden="true" /> Actualizar
        </button>
      </div>
      <ListaNoRecogidos ref="lista" @cambio="buscar" />
    </section>

    <section class="seccion" aria-labelledby="t-personas">
      <h2 id="t-personas" class="seccion__titulo">Sancionar a una persona</h2>
      <div class="buscador">
        <Search :size="18" aria-hidden="true" />
        <input
          v-model="busqueda"
          type="search"
          class="entrada"
          placeholder="Buscar por nombre, correo o sección"
          aria-label="Buscar persona"
        />
      </div>
      <p class="texto-suave seccion__explica">
        <template v-if="!busqueda.trim()"
          >Sin búsqueda se ven las personas sancionadas ahora mismo.</template
        >
        <template v-else-if="buscando">Buscando...</template>
      </p>
      <p v-if="errorBusqueda" class="nota nota--aviso">{{ errorBusqueda }}</p>
      <p
        v-else-if="!buscando && !usuarios.length"
        class="texto-suave seccion__explica"
      >
        {{
          busqueda.trim()
            ? 'No encontramos a nadie con esa búsqueda.'
            : 'Nadie tiene una sanción activa.'
        }}
      </p>
      <ul v-else class="personas">
        <li v-for="u in usuarios" :key="u.id" class="persona">
          <div class="persona__datos">
            <p class="persona__nombre">
              <strong>{{ u.nombre }}</strong>
              <span v-if="u.sancionActiva" class="etiqueta etiqueta--error"
                >Sanción activa</span
              >
            </p>
            <p class="texto-suave">
              {{ NOMBRE_ROL[u.rol] ?? u.rol
              }}<template v-if="u.seccion"> · {{ u.seccion }}</template> ·
              {{ u.correo }}
            </p>
            <p v-if="u.sancionActiva" class="texto-suave">
              {{
                u.sancionActiva.permanente
                  ? 'Sanción permanente'
                  : `Hasta ${textoFin(u.sancionActiva.hasta)}`
              }}
              · {{ u.sancionActiva.razon }}
            </p>
            <p class="persona__previos">
              {{ plural(u.alertas, 'alerta', 'alertas') }} ·
              {{ plural(u.sanciones, 'sanción', 'sanciones') }}
            </p>
          </div>
          <div class="persona__acciones">
            <button
              type="button"
              class="boton boton--contorno boton--pequeno"
              @click="verHistorial(u)"
            >
              <History :size="16" aria-hidden="true" /> Historial<span
                class="solo-lectores"
              >
                de {{ u.nombre }}</span
              >
            </button>
            <button
              type="button"
              class="boton boton--peligro boton--pequeno"
              @click="abrirSancion(u)"
            >
              <Ban :size="16" aria-hidden="true" /> Sancionar<span
                class="solo-lectores"
              >
                a {{ u.nombre }}</span
              >
            </button>
          </div>
        </li>
      </ul>
    </section>

    <Dialogo
      :abierto="Boolean(viendo)"
      :titulo="`Historial de ${viendo?.nombre ?? ''}`"
      ancho="36rem"
      @cerrar="viendo = null"
    >
      <p v-if="cargandoHistorial" class="texto-suave">Cargando...</p>
      <HistorialSanciones
        v-else
        :items="historial"
        admin
        :levantando="levantando"
        @levantar="levantar"
      />
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="viendo = null"
        >
          Cerrar
        </button>
        <button
          type="button"
          class="boton boton--peligro"
          @click="sancionarDesdeHistorial"
        >
          <Ban :size="16" aria-hidden="true" /> Sancionar
        </button>
      </template>
    </Dialogo>

    <FormularioSancion
      :abierto="Boolean(sancionando)"
      :usuario="sancionando"
      @cerrar="sancionando = null"
      @sancionado="alSancionar"
    />
  </div>
</template>

<style scoped>
.sanciones {
  display: flex;
  flex-direction: column;
  gap: var(--e-6);
  padding-bottom: var(--e-10);
}

.seccion {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.seccion__encabezado {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
}

.seccion__titulo {
  margin: 0;
  font-size: var(--txt-lg);
}

.seccion__explica {
  margin: 0;
  font-size: var(--txt-sm);
}

.personas {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.persona {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
  padding: var(--e-4);
  border: 1px solid var(--borde);
  border-radius: var(--radio-md);
  background: var(--superficie);
  font-size: var(--txt-sm);
}

.persona__datos {
  display: flex;
  flex: 1 1 18rem;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.persona__datos p {
  margin: 0;
  overflow-wrap: anywhere;
}

.persona__nombre {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
}

.persona__previos {
  font-weight: 600;
}

.persona__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}
</style>
