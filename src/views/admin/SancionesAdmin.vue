<script setup>
import { onMounted, ref, watch } from 'vue'
import { Search, Ban, History, RefreshCw, TriangleAlert } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/estructura/EncabezadoPanel.vue'
import ListaNoRecogidos from '@/components/sanciones/ListaNoRecogidos.vue'
import FormularioSancion from '@/components/sanciones/FormularioSancion.vue'
import FormularioAlerta from '@/components/sanciones/FormularioAlerta.vue'
import HistorialGeneral from '@/components/sanciones/HistorialGeneral.vue'
import Paginacion from '@/components/formularios/Paginacion.vue'
import { useSanciones } from '@/stores/sanciones'
import { useAuth } from '@/stores/auth'
import { NOMBRE_ROL } from '@compartido/permisos.js'
import { textoFin } from '@compartido/sanciones.js'

/**
 * Panel de alertas y sanciones: los pedidos no recogidos que esperan una
 * decision (alertar, sancionar o descartar), un buscador con todas las
 * cuentas para alertar o sancionar a cualquiera, y el historial general.
 */
const sanciones = useSanciones()
const auth = useAuth()

const lista = ref(null)
const busqueda = ref('')
const usuarios = ref([])
const total = ref(0)
const pagina = ref(1)
const porPagina = ref(20)
const buscando = ref(false)
const errorBusqueda = ref('')

const sancionando = ref(null)
const alertando = ref(null)
const viendoHistorial = ref(false)

let espera = null
let consulta = 0

async function buscar() {
  const mia = ++consulta
  buscando.value = true
  errorBusqueda.value = ''
  try {
    const datos = await sanciones.buscarUsuarios(
      busqueda.value.trim(),
      pagina.value
    )
    if (mia !== consulta) return
    usuarios.value = datos.usuarios
    total.value = datos.total
    porPagina.value = datos.porPagina
  } catch (e) {
    if (mia === consulta) errorBusqueda.value = e.message
  } finally {
    if (mia === consulta) buscando.value = false
  }
}

watch(busqueda, () => {
  clearTimeout(espera)
  espera = setTimeout(() => {
    pagina.value = 1
    buscar()
  }, 300)
})

onMounted(buscar)

function irAPagina(n) {
  pagina.value = n
  buscar()
}

function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`
}

/** La API no deja alertar ni sancionar a uno mismo ni a la cuenta de la soda. */
function motivoSinAcciones(u) {
  if (u.id === auth.usuario?.id) return 'Es tu cuenta.'
  if (u.rol === 'soda') return 'La cuenta de la soda no hace pedidos.'
  return ''
}

async function actualizar() {
  await Promise.all([lista.value?.cargar(), buscar()])
}

async function alSancionar() {
  sancionando.value = null
  await buscar()
}

async function alAlertar() {
  alertando.value = null
  await buscar()
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
        <div class="seccion__botones">
          <button
            type="button"
            class="boton boton--contorno boton--pequeno"
            @click="actualizar"
          >
            <RefreshCw :size="16" aria-hidden="true" /> Actualizar
          </button>
          <button
            type="button"
            class="boton boton--contorno boton--pequeno"
            @click="viendoHistorial = true"
          >
            <History :size="16" aria-hidden="true" /> Historial
          </button>
        </div>
      </div>
      <ListaNoRecogidos ref="lista" @cambio="buscar" />
    </section>

    <section class="seccion" aria-labelledby="t-personas">
      <h2 id="t-personas" class="seccion__titulo">Buscar una persona</h2>
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
      <p v-if="errorBusqueda" class="nota nota--aviso">{{ errorBusqueda }}</p>
      <p
        v-else-if="!buscando && !usuarios.length"
        class="texto-suave seccion__explica"
      >
        {{
          busqueda.trim()
            ? 'No encontramos a nadie con esa búsqueda.'
            : 'Todavía no hay cuentas.'
        }}
      </p>
      <template v-else>
        <p class="texto-suave seccion__explica" aria-live="polite">
          {{ buscando ? 'Buscando...' : plural(total, 'cuenta', 'cuentas') }}
        </p>
        <ul class="personas">
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
            <p v-if="motivoSinAcciones(u)" class="texto-suave persona__sin">
              {{ motivoSinAcciones(u) }}
            </p>
            <div v-else class="persona__acciones">
              <button
                type="button"
                class="boton boton--contorno boton--pequeno"
                @click="alertando = u"
              >
                <TriangleAlert :size="16" aria-hidden="true" /> Alertar<span
                  class="solo-lectores"
                >
                  a {{ u.nombre }}</span
                >
              </button>
              <button
                type="button"
                class="boton boton--peligro boton--pequeno"
                @click="sancionando = u"
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
        <Paginacion
          :pagina="pagina"
          :total="total"
          :por-pagina="porPagina"
          etiqueta="Páginas de cuentas"
          @cambiar="irAPagina"
        />
      </template>
    </section>

    <HistorialGeneral
      :abierto="viendoHistorial"
      @cerrar="viendoHistorial = false"
      @cambio="buscar"
    />

    <FormularioAlerta
      :abierto="Boolean(alertando)"
      :usuario="alertando"
      @cerrar="alertando = null"
      @alertado="alAlertar"
    />

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

.seccion__botones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
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

.persona__sin {
  margin: 0;
  font-size: var(--txt-sm);
}

.persona__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}
</style>
