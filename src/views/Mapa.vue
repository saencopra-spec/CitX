<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Search,
  X,
  Star,
  Clock,
  Lock,
  MapPin,
  Info,
  ChevronRight,
} from 'lucide-vue-next'
import MapaCampus from '@/components/MapaCampus.vue'
import FotoComida from '@/components/FotoComida.vue'
import { ZONAS, CATEGORIAS } from '@/datos/campus'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { coincide } from '@compartido/texto.js'

const auth = useAuth()
const avisos = useAvisos()
const route = useRoute()
const router = useRouter()

const mapa = ref(null)
const lugares = ref({})
const cargando = ref(true)
const sinDatos = ref(false)
const busqueda = ref(
  typeof route.query.buscar === 'string' ? route.query.buscar : ''
)
const filtro = ref('todo')
const seleccionada = ref(null)
const mostrarResultados = ref(false)
const verLeyenda = ref(false)

/** Lista de lugares del mapa con su informacion de la base (o lo minimo si no hay). */
const lista = computed(() =>
  ZONAS.map((z) => ({
    clave: z.clave,
    nombre: lugares.value[z.clave]?.nombre ?? z.etiqueta,
    categoria: lugares.value[z.clave]?.categoria ?? 'otro',
    descripcion: lugares.value[z.clave]?.descripcion ?? '',
    horario: lugares.value[z.clave]?.horario ?? '',
    restringido: lugares.value[z.clave]?.restringido ?? false,
    notaAcceso: lugares.value[z.clave]?.notaAcceso ?? '',
    foto: lugares.value[z.clave]?.foto ?? null,
  })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
)

const filtrados = computed(() =>
  lista.value.filter((l) => {
    if (filtro.value === 'favoritos' && !auth.esFavorito(l.clave)) return false
    if (filtro.value === 'restringido' && !l.restringido) return false
    if (
      !['todo', 'favoritos', 'restringido'].includes(filtro.value) &&
      l.categoria !== filtro.value
    )
      return false
    return coincide(
      busqueda.value,
      l.nombre,
      l.descripcion,
      CATEGORIAS[l.categoria]?.nombre ?? ''
    )
  })
)

const resaltadas = computed(() => {
  if (!busqueda.value && filtro.value === 'todo') return null
  return new Set(filtrados.value.map((l) => l.clave))
})

const lugar = computed(
  () => lista.value.find((l) => l.clave === seleccionada.value) ?? null
)

const filtros = computed(() => [
  { valor: 'todo', texto: 'Todo' },
  { valor: 'favoritos', texto: 'Mis favoritos', icono: Star },
  ...Object.entries(CATEGORIAS).map(([valor, c]) => ({
    valor,
    texto: c.corto,
  })),
  { valor: 'restringido', texto: 'Restringidas', icono: Lock },
])

function elegir(clave, { desdeBusqueda = false } = {}) {
  seleccionada.value = clave
  mostrarResultados.value = false
  if (desdeBusqueda) busqueda.value = ''
  router.replace({ query: { ...route.query, lugar: clave, buscar: undefined } })
  nextTick(() => mapa.value?.enfocar(clave))
}

function cerrar() {
  seleccionada.value = null
  router.replace({ query: { ...route.query, lugar: undefined } })
}

async function alternarFavorito() {
  if (!lugar.value) return
  try {
    const ahora = await auth.alternarFavorito(lugar.value.clave)
    avisos.exito(
      ahora
        ? `${lugar.value.nombre} quedó en tus favoritos.`
        : `Quitaste ${lugar.value.nombre} de favoritos.`,
      {
        duracion: 2500,
      }
    )
  } catch (e) {
    avisos.error(e.message)
  }
}

function alEnviarBusqueda() {
  if (filtrados.value.length === 1)
    elegir(filtrados.value[0].clave, { desdeBusqueda: true })
}

watch(busqueda, (v) => {
  mostrarResultados.value = Boolean(v)
})

onMounted(async () => {
  try {
    const datos = await api.get('/lugares')
    lugares.value = Object.fromEntries(datos.lugares.map((l) => [l.clave, l]))
  } catch {
    sinDatos.value = true
  } finally {
    cargando.value = false
  }
  const inicial = route.query.lugar
  if (typeof inicial === 'string' && ZONAS.some((z) => z.clave === inicial)) {
    setTimeout(() => elegir(inicial), 250)
  }
})
</script>

<template>
  <div class="mapa-pagina">
    <section class="panel" aria-label="Buscar y filtrar lugares">
      <h1 class="panel__titulo titulo-manuscrito">Mapa interactivo</h1>

      <form
        class="buscador busqueda"
        role="search"
        @submit.prevent="alEnviarBusqueda"
      >
        <Search :size="20" aria-hidden="true" />
        <label for="buscar-lugar" class="solo-lectores">Buscar un lugar</label>
        <input
          id="buscar-lugar"
          v-model="busqueda"
          class="entrada"
          type="search"
          autocomplete="off"
          placeholder="Buscar en CitX..."
          aria-controls="resultados"
          :aria-expanded="mostrarResultados"
          @focus="mostrarResultados = Boolean(busqueda)"
        />
        <button
          v-if="busqueda"
          type="button"
          class="busqueda__limpiar"
          aria-label="Borrar búsqueda"
          @click="busqueda = ''"
        >
          <X :size="18" aria-hidden="true" />
        </button>

        <ul
          v-if="mostrarResultados"
          id="resultados"
          class="resultados"
          aria-label="Resultados"
        >
          <li v-for="l in filtrados.slice(0, 8)" :key="l.clave">
            <button
              type="button"
              class="resultado"
              @click="elegir(l.clave, { desdeBusqueda: true })"
            >
              <MapPin :size="18" aria-hidden="true" />
              <span>
                <strong>{{ l.nombre }}</strong>
                <span>{{ CATEGORIAS[l.categoria]?.nombre ?? 'Lugar' }}</span>
              </span>
            </button>
          </li>
          <li v-if="!filtrados.length" class="resultado resultado--vacio">
            No hay lugares con ese nombre.
          </li>
        </ul>
      </form>

      <div class="chips" role="group" aria-label="Filtrar por tipo de lugar">
        <button
          v-for="f in filtros"
          :key="f.valor"
          type="button"
          class="chip"
          :aria-pressed="filtro === f.valor"
          @click="filtro = f.valor"
        >
          <component
            :is="f.icono"
            v-if="f.icono"
            :size="16"
            aria-hidden="true"
          />
          {{ f.texto }}
        </button>
      </div>

      <p class="solo-lectores" aria-live="polite">
        {{ resaltadas ? `${filtrados.length} lugares encontrados` : '' }}
      </p>

      <!-- En pantallas grandes, lista completa de lugares -->
      <ul class="lista-lugares">
        <li v-for="l in filtrados" :key="l.clave">
          <button
            type="button"
            class="lista-lugares__item"
            :class="{ 'es-activo': seleccionada === l.clave }"
            :aria-current="seleccionada === l.clave ? 'true' : undefined"
            @click="elegir(l.clave)"
          >
            <span class="muestra" :data-cat="l.categoria" aria-hidden="true" />
            <span class="lista-lugares__nombre">{{ l.nombre }}</span>
            <Star
              v-if="auth.esFavorito(l.clave)"
              :size="16"
              class="icono-favorito"
              aria-label="Favorito"
            />
            <Lock v-if="l.restringido" :size="16" aria-label="Restringido" />
            <ChevronRight
              :size="18"
              aria-hidden="true"
              class="lista-lugares__flecha"
            />
          </button>
        </li>
        <li v-if="!filtrados.length" class="lista-lugares__vacio">
          {{
            filtro === 'favoritos'
              ? 'Todavía no tenés favoritos. Abrí un lugar y tocá la estrella.'
              : 'No hay lugares con ese filtro.'
          }}
        </li>
      </ul>
    </section>

    <div class="lienzo">
      <MapaCampus
        ref="mapa"
        :lugares="lugares"
        :seleccionada="seleccionada"
        :resaltadas="resaltadas"
        :favoritos="auth.usuario?.favoritos ?? []"
        @elegir="elegir"
      />

      <div class="leyenda" :class="{ 'es-abierta': verLeyenda }">
        <button
          type="button"
          class="leyenda__boton"
          :aria-expanded="verLeyenda"
          @click="verLeyenda = !verLeyenda"
        >
          <Info :size="16" aria-hidden="true" /> Leyenda
        </button>
        <ul v-if="verLeyenda" class="leyenda__lista">
          <li v-for="(c, clave) in CATEGORIAS" :key="clave">
            <span class="muestra" :data-cat="clave" aria-hidden="true" />
            {{ c.nombre }}
          </li>
          <li>
            <span class="muestra muestra--rayada" aria-hidden="true" /> Acceso
            restringido
          </li>
          <li>
            <span class="muestra muestra--favorito" aria-hidden="true" /> Tus
            favoritos
          </li>
        </ul>
      </div>

      <p class="aviso-ejemplo">Distribución de ejemplo</p>
      <p v-if="sinDatos" class="sin-datos" role="status">
        Sin conexión: se muestran solo los nombres de los lugares.
      </p>
    </div>

    <Transition name="hoja">
      <section
        v-if="lugar"
        class="hoja"
        :aria-label="`Información de ${lugar.nombre}`"
      >
        <span class="hoja__agarre" aria-hidden="true" />
        <div class="hoja__contenido">
          <FotoComida
            v-if="lugar.foto"
            :src="lugar.foto"
            alt=""
            class="hoja__foto"
          />
          <div class="hoja__encabezado">
            <div>
              <p class="hoja__categoria">
                <span
                  class="muestra"
                  :data-cat="lugar.categoria"
                  aria-hidden="true"
                />
                {{ CATEGORIAS[lugar.categoria]?.nombre ?? 'Lugar' }}
              </p>
              <h2 class="hoja__nombre">{{ lugar.nombre }}</h2>
            </div>
            <div class="hoja__acciones">
              <button
                type="button"
                class="boton-icono"
                :class="{ 'es-favorito': auth.esFavorito(lugar.clave) }"
                :aria-pressed="auth.esFavorito(lugar.clave)"
                :aria-label="
                  auth.esFavorito(lugar.clave)
                    ? 'Quitar de favoritos'
                    : 'Guardar en favoritos'
                "
                @click="alternarFavorito"
              >
                <Star :size="22" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="boton-icono"
                aria-label="Cerrar"
                @click="cerrar"
              >
                <X :size="22" aria-hidden="true" />
              </button>
            </div>
          </div>

          <p v-if="lugar.restringido" class="restringido">
            <Lock :size="18" aria-hidden="true" />
            <span>
              <strong>Acceso restringido.</strong>
              {{ lugar.notaAcceso || 'Solo con autorización.' }}
            </span>
          </p>
          <p v-if="lugar.descripcion" class="hoja__descripcion">
            {{ lugar.descripcion }}
          </p>
          <p v-if="lugar.horario" class="hoja__horario">
            <Clock :size="16" aria-hidden="true" />
            {{ lugar.horario }}
          </p>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.mapa-pagina {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(
    100dvh - 61px - var(--alto-barra-inferior) - env(safe-area-inset-bottom) -
      env(safe-area-inset-top)
  );
  min-height: 420px;
  margin-bottom: calc(
    (var(--alto-barra-inferior) + env(safe-area-inset-bottom) + var(--e-6)) * -1
  );
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding: var(--e-3) var(--margen-lateral) var(--e-2);
}

.panel__titulo {
  font-size: var(--txt-xl);
}

.busqueda {
  position: relative;
  z-index: var(--z-hoja);
}

.busqueda__limpiar {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--texto-tenue);
}

.busqueda .entrada {
  padding-right: 48px;
}

.resultados {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 50dvh;
  overflow-y: auto;
  padding: var(--e-2);
  background: var(--fondo-elevado);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-4);
}

.resultado {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--e-3);
  min-height: var(--objetivo-tactil);
  padding: var(--e-2) var(--e-3);
  border-radius: var(--radio-sm);
  text-align: left;
}

.resultado > svg {
  color: var(--accion);
  flex-shrink: 0;
}

.resultado span {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.resultado span span {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.resultado:hover {
  background: var(--superficie-hover);
}

.resultado--vacio {
  color: var(--texto-suave);
}

.lista-lugares {
  display: none;
}

.lienzo {
  position: relative;
  flex: 1;
  min-height: 0;
}

.leyenda {
  position: absolute;
  left: var(--e-3);
  bottom: var(--e-3);
  max-width: calc(100% - 80px);
  background: var(--fondo-elevado);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-3);
  font-size: var(--txt-sm);
}

.leyenda__boton {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  min-height: var(--objetivo-tactil);
  padding: 0 var(--e-3);
  font-weight: var(--peso-semi);
}

.leyenda__lista {
  display: grid;
  gap: var(--e-2);
  padding: 0 var(--e-3) var(--e-3);
}

.leyenda__lista li {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}

.muestra {
  display: inline-block;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 4px;
  background: var(--mapa-otro);
  border: 1px solid var(--borde-fuerte);
}

.muestra[data-cat='naturaleza'] {
  background: var(--mapa-naturaleza);
}
.muestra[data-cat='academico'] {
  background: var(--mapa-academico);
}
.muestra[data-cat='servicios'] {
  background: var(--mapa-servicios);
}
.muestra[data-cat='alimentacion'] {
  background: var(--mapa-alimentacion);
}
.muestra[data-cat='deporte'] {
  background: var(--mapa-deporte);
}
.muestra[data-cat='administracion'] {
  background: var(--mapa-administracion);
}
.muestra[data-cat='acceso'] {
  background: var(--mapa-acceso);
}

.muestra--rayada {
  background: repeating-linear-gradient(
    45deg,
    var(--mapa-rayado) 0 2px,
    transparent 2px 6px
  );
}

.muestra--favorito {
  border-radius: 50%;
  background: var(--aviso);
}

.aviso-ejemplo {
  position: absolute;
  top: var(--e-2);
  left: var(--e-3);
  padding: 2px var(--e-2);
  border-radius: var(--radio-xs);
  background: color-mix(in srgb, var(--fondo-elevado) 85%, transparent);
  font-size: var(--txt-xs);
  color: var(--texto-suave);
  pointer-events: none;
}

.sin-datos {
  position: absolute;
  top: var(--e-8);
  left: var(--e-3);
  right: var(--e-3);
  padding: var(--e-2) var(--e-3);
  border-radius: var(--radio-sm);
  background: var(--aviso-fondo);
  color: var(--texto);
  font-size: var(--txt-sm);
}

.hoja {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-hoja);
  max-height: 62%;
  overflow-y: auto;
  background: var(--fondo-elevado);
  border-radius: var(--radio-xl) var(--radio-xl) 0 0;
  box-shadow: 0 -8px 30px rgba(13, 17, 23, 0.18);
}

.hoja__agarre {
  display: block;
  width: 44px;
  height: 5px;
  margin: var(--e-2) auto 0;
  border-radius: var(--radio-pildora);
  background: var(--borde-fuerte);
}

.hoja__contenido {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding: var(--e-3) var(--margen-lateral) var(--e-5);
}

.hoja__foto {
  height: 120px;
  border-radius: var(--radio-md);
}

.hoja__encabezado {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--e-3);
}

.hoja__categoria {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.hoja__nombre {
  font-size: var(--txt-xl);
}

.hoja__acciones {
  display: flex;
  margin-right: calc(var(--e-2) * -1);
}

.es-favorito {
  color: var(--aviso);
}

.es-favorito svg {
  fill: currentColor;
}

.restringido {
  display: flex;
  gap: var(--e-3);
  padding: var(--e-3);
  border-radius: var(--radio-md);
  background: var(--error-fondo);
  font-size: var(--txt-sm);
}

.restringido svg {
  flex-shrink: 0;
  color: var(--error);
  margin-top: 1px;
}

.hoja__descripcion {
  color: var(--texto-suave);
  line-height: var(--alto-amplio);
}

.hoja__horario {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
}

.hoja-enter-active,
.hoja-leave-active {
  transition: transform var(--dur-lenta) var(--curva);
}

.hoja-enter-from,
.hoja-leave-to {
  transform: translateY(105%);
}

@media (min-width: 768px) {
  .hoja {
    left: auto;
    right: var(--e-4);
    bottom: var(--e-4);
    width: 23rem;
    max-height: calc(100% - var(--e-8));
    border-radius: var(--radio-xl);
    box-shadow: var(--sombra-4);
  }

  .hoja__agarre {
    display: none;
  }

  .hoja-enter-from,
  .hoja-leave-to {
    transform: translateX(110%);
  }
}

@media (min-width: 1024px) {
  .mapa-pagina {
    flex-direction: row;
    height: 100dvh;
    margin-bottom: calc(var(--e-12) * -1);
  }

  .panel {
    width: 20rem;
    flex-shrink: 0;
    padding: var(--e-6) var(--e-4);
    border-right: 1px solid var(--borde);
    overflow-y: auto;
  }

  .panel__titulo {
    font-size: var(--txt-2xl);
  }

  .panel .chips {
    flex-wrap: wrap;
    overflow: visible;
    margin: 0;
    padding: 0;
  }

  .lista-lugares {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: var(--e-2);
  }

  .lista-lugares__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--e-3);
    min-height: var(--objetivo-tactil);
    padding: 0 var(--e-3);
    border-radius: var(--radio-sm);
    text-align: left;
    color: var(--texto-suave);
  }

  .lista-lugares__item:hover {
    background: var(--superficie-hover);
    color: var(--texto);
  }

  .lista-lugares__item.es-activo {
    background: var(--principal-suave);
    color: var(--texto);
    font-weight: var(--peso-semi);
  }

  .lista-lugares__nombre {
    flex: 1;
  }

  .lista-lugares__flecha {
    color: var(--texto-tenue);
  }

  .icono-favorito {
    color: var(--aviso);
    fill: currentColor;
  }

  .lista-lugares__vacio {
    padding: var(--e-3);
    color: var(--texto-suave);
    font-size: var(--txt-sm);
  }

  .resultados {
    display: none;
  }
}
</style>
