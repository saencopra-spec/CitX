<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  ArrowUpRight,
  CalendarDays,
  ShoppingBag,
  HeartPulse,
  Search,
  Megaphone,
  MapPin,
  ChevronDown,
  GraduationCap,
  ListChecks,
  PackageSearch,
  Clock,
  BookOpen,
  UtensilsCrossed,
  Map as IconoMapa,
} from 'lucide-vue-next'
import MapaMiniatura from '@/components/mapa/MapaMiniatura.vue'
import FotoCompleta from '@/components/marca/FotoCompleta.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import { useAuth } from '@/stores/auth'
import { useLugares } from '@/stores/lugares'
import { api } from '@/lib/api'
import { entradaEscalonada } from '@/lib/movimiento'
import {
  saludoSegunHora,
  fechaRelativa,
  horaLegible,
  fechaLarga,
  horaDe,
} from '@compartido/hora.js'
import { estadoEnfermeria } from '@compartido/enfermeria.js'
import { NOMBRE_ESTADO } from '@compartido/pedidos.js'
import { claseDelMomento } from '@compartido/jornada.js'

const auth = useAuth()
const router = useRouter()
const raiz = ref(null)
const inicio = ref(null)
const busqueda = ref('')
const anuncios = ref([])
const horario = ref(null)
const lugares = useLugares()
const anunciosAbiertos = ref(false)

// El reloj de la portada se actualiza cada 20 segundos.
const ahora = ref(new Date())
let reloj = null

const saludo = computed(() => saludoSegunHora(ahora.value))
const enfermeria = computed(() => estadoEnfermeria(ahora.value))
const hoy = computed(() => {
  const texto = fechaLarga(ahora.value)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const nombre = computed(() => (auth.usuario ? auth.nombreCorto : ''))

/** Clase en curso o la siguiente: de la seccion o del horario de profesor. */
const clase = computed(() => {
  // Se recalcula con el reloj.
  const momento = claseDelMomento(horario.value?.dias, ahora.value)
  if (!momento) return null
  const { estado, leccion, celda } = momento
  const partes = [celda.materia]
  if (celda.seccion) partes.push(`sección ${celda.seccion}`)
  if (celda.aula) partes.push(`aula ${celda.aula}`)
  return {
    titulo:
      estado === 'ahora' ? 'Ahora' : `A las ${horaLegible(leccion.inicio)}`,
    texto: partes.join(' · '),
    ahora: estado === 'ahora',
  }
})

/** Lo mas util para mostrar arriba: el pedido activo y el proximo evento. */
const destacados = computed(() => {
  const lista = []
  const pedido = inicio.value?.pedidoActivo
  if (pedido) {
    const listo = pedido.estado === 'listo'
    lista.push({
      clave: 'pedido',
      icono: ShoppingBag,
      tono: listo ? 'exito' : 'info',
      titulo: listo
        ? `Tu pedido ${pedido.codigo} está listo`
        : `Pedido ${pedido.codigo}: ${NOMBRE_ESTADO[pedido.estado].toLowerCase()}`,
      texto: listo
        ? 'Pasá a la soda a retirarlo.'
        : `Retiro: ${pedido.franja.nombre.toLowerCase()}.`,
      enlace: { name: 'pedido', params: { codigo: pedido.codigo } },
      accion: 'Ver pedido',
      lugar: listo ? 'soda' : null,
    })
  }
  const evento = inicio.value?.proximoEvento
  if (evento) {
    lista.push({
      clave: 'evento',
      icono: CalendarDays,
      tono: 'evento',
      titulo: evento.titulo,
      texto: `Próximo evento: ${fechaRelativa(evento.inicio)}, ${horaLegible(evento.hora)}${evento.lugarClave && lugares.nombreDe(evento.lugarClave) ? `, en ${lugares.nombreDe(evento.lugarClave)}` : ''}.`,
      enlace: { name: 'eventos' },
      accion: 'Ver eventos',
      lugar: evento.lugarClave,
    })
  }
  return lista
})

const atajos = computed(() => {
  const lista = [
    {
      nombre: 'clases',
      texto: auth.esProfesor ? 'Mi horario' : 'Horario',
      icono: GraduationCap,
      query: auth.esProfesor ? { ver: 'mio' } : undefined,
    },
    { nombre: 'eventos', texto: 'Eventos', icono: CalendarDays },
    { nombre: 'recordatorios', texto: 'Recordatorios', icono: ListChecks },
    {
      nombre: 'objetos-perdidos',
      texto: 'Objetos perdidos',
      icono: PackageSearch,
    },
    { nombre: 'enfermeria', texto: 'Enfermería', icono: HeartPulse },
  ]
  // Sin cuenta solo se ofrece lo que se puede ver como invitado.
  return auth.usuario
    ? lista
    : lista.filter((a) =>
        ['clases', 'eventos', 'enfermeria'].includes(a.nombre)
      )
})

function buscar() {
  router.push({ name: 'mapa', query: { buscar: busqueda.value } })
}

onMounted(async () => {
  entradaEscalonada(raiz.value)
  reloj = setInterval(() => (ahora.value = new Date()), 20000)
  lugares.cargar()
  if (!auth.usuario) return
  const tareas = [api.get('/inicio'), api.get('/anuncios')]
  if (auth.esProfesor || auth.esAdmin)
    tareas.push(api.get('/horarios/profesor'))
  else if (auth.usuario.seccion)
    tareas.push(api.get(`/horarios/${auth.usuario.seccion}`))
  const [i, a, h] = await Promise.allSettled(tareas)
  inicio.value = i.status === 'fulfilled' ? i.value : null
  anuncios.value = a.status === 'fulfilled' ? a.value.anuncios.slice(0, 3) : []
  horario.value = h?.status === 'fulfilled' ? h.value.horario : null
})

onUnmounted(() => clearInterval(reloj))
</script>

<template>
  <div ref="raiz" class="pagina menu">
    <!-- Portada: saludo, fecha y lo que pasa ahora -->
    <header data-entra class="portada">
      <div class="portada__brillo" aria-hidden="true" />
      <div class="portada__fila">
        <EscudoCit :tamano="56" class="portada__escudo" />
        <div class="portada__textos">
          <p class="portada__fecha">
            <Clock :size="14" aria-hidden="true" />
            {{ hoy }} · {{ horaDe(ahora) }}
          </p>
          <h1 class="portada__hola titulo-manuscrito">
            {{ saludo }}<template v-if="nombre">, {{ nombre }}</template>
          </h1>
          <p v-if="auth.usuario" class="portada__rol">
            {{ auth.nombreRol
            }}<template v-if="auth.usuario?.seccion">
              · Sección {{ auth.usuario.seccion }}</template
            >
            · Complejo Educativo CIT
          </p>
          <p v-else class="portada__rol">
            Estás explorando CitX como invitado · Complejo Educativo CIT
          </p>
        </div>
      </div>

      <div class="portada__estado">
        <RouterLink
          v-if="clase"
          :to="{
            name: 'clases',
            query: auth.esProfesor || auth.esAdmin ? { ver: 'mio' } : undefined,
          }"
          class="estado"
          :class="{ 'estado--vivo': clase.ahora }"
        >
          <span class="estado__punto" aria-hidden="true" />
          <span
            ><strong>{{ clase.titulo }}:</strong> {{ clase.texto }}</span
          >
        </RouterLink>
        <RouterLink :to="{ name: 'enfermeria' }" class="estado">
          <HeartPulse :size="15" aria-hidden="true" />
          <span>
            <strong>Enfermería:</strong>
            {{ enfermeria.abierta ? 'abierta' : 'cerrada' }}
          </span>
        </RouterLink>
      </div>
    </header>

    <form
      data-entra
      class="buscador menu__buscar"
      role="search"
      @submit.prevent="buscar"
    >
      <Search :size="20" aria-hidden="true" />
      <label class="solo-lectores" for="buscar-campus"
        >Buscar un lugar del colegio</label
      >
      <input
        id="buscar-campus"
        v-model="busqueda"
        class="entrada"
        type="search"
        placeholder="Buscar en el CIT: soda, enfermería, secundaria..."
      />
      <Transition name="aparece">
        <button
          v-if="busqueda.trim()"
          type="submit"
          class="boton boton--principal boton--pequeno buscador__ir"
        >
          Buscar
        </button>
      </Transition>
    </form>

    <!-- Atajos -->
    <nav data-entra class="atajos" aria-label="Atajos">
      <RouterLink
        v-for="(a, i) in atajos"
        :key="a.nombre"
        :to="{ name: a.nombre, query: a.query }"
        class="atajo"
        :style="{ '--i': i }"
      >
        <span class="atajo__icono" aria-hidden="true">
          <component :is="a.icono" :size="20" />
        </span>
        {{ a.texto }}
      </RouterLink>
    </nav>

    <div v-if="destacados.length" class="destacados">
      <article
        v-for="d in destacados"
        :key="d.clave"
        data-entra
        class="destacado tocable"
        :class="`destacado--${d.tono}`"
      >
        <span class="destacado__icono" aria-hidden="true">
          <component :is="d.icono" :size="22" />
        </span>
        <span class="destacado__textos">
          <strong>{{ d.titulo }}</strong>
          <span>{{ d.texto }}</span>
        </span>
        <span class="destacado__acciones">
          <RouterLink
            :to="d.enlace"
            class="boton boton--texto boton--pequeno"
            >{{ d.accion }}</RouterLink
          >
          <RouterLink
            v-if="d.lugar"
            :to="{ name: 'mapa', query: { lugar: d.lugar } }"
            class="boton boton--texto boton--pequeno"
          >
            <MapPin :size="16" aria-hidden="true" /> Ver en el mapa
          </RouterLink>
        </span>
      </article>
    </div>

    <section
      v-if="anuncios.length"
      data-entra
      class="anuncios"
      aria-labelledby="t-anuncios"
    >
      <button
        id="t-anuncios"
        type="button"
        class="anuncios__cabecera"
        :aria-expanded="anunciosAbiertos"
        aria-controls="lista-anuncios"
        @click="anunciosAbiertos = !anunciosAbiertos"
      >
        <span class="anuncios__cabecera-izq">
          <span class="anuncios__icono" aria-hidden="true"
            ><Megaphone :size="16"
          /></span>
          <span class="anuncios__titulo">Avisos del colegio</span>
          <span class="anuncios__contador">{{ anuncios.length }}</span>
        </span>
        <ChevronDown
          :size="18"
          aria-hidden="true"
          class="anuncios__chevron"
          :class="{ 'es-abierto': anunciosAbiertos }"
        />
      </button>
      <div
        id="lista-anuncios"
        class="desplegable"
        :class="{ 'es-abierto': anunciosAbiertos }"
        :inert="!anunciosAbiertos"
      >
        <div>
          <ul class="anuncios__lista">
            <li
              v-for="a in anuncios"
              :key="a.id"
              class="anuncio"
              :class="{ 'es-importante': a.importante }"
            >
              <div class="anuncio__contenido">
                <p class="anuncio__titulo">
                  <span v-if="a.importante" class="etiqueta etiqueta--error"
                    >Importante</span
                  >
                  {{ a.titulo }}
                </p>
                <p class="anuncio__cuerpo">{{ a.cuerpo }}</p>
              </div>
              <RouterLink
                v-if="a.lugarClave"
                :to="{ name: 'mapa', query: { lugar: a.lugarClave } }"
                class="boton boton--contorno boton--pequeno"
              >
                <MapPin :size="16" aria-hidden="true" />
                {{ lugares.nombreDe(a.lugarClave) ?? 'Ver en el mapa' }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Las tres partes de la app -->
    <h2 data-entra class="menu__subtitulo">Explorá el CIT</h2>
    <div class="accesos">
      <RouterLink
        data-entra
        :to="{ name: 'mapa' }"
        class="acceso acceso--mapa tocable"
      >
        <div class="acceso__media acceso__media--mapa">
          <MapaMiniatura />
          <span class="acceso__sello">
            <IconoMapa :size="14" aria-hidden="true" /> 19 lugares
          </span>
        </div>
        <div class="acceso__texto">
          <h3 class="acceso__titulo titulo-manuscrito">Mapa interactivo</h3>
          <p>
            Encontrá aulas, la soda, la enfermería o las canchas, y guardá tus
            lugares favoritos.
          </p>
        </div>
        <span class="acceso__flecha" aria-hidden="true"
          ><ArrowUpRight :size="20"
        /></span>
      </RouterLink>

      <RouterLink data-entra :to="{ name: 'guia' }" class="acceso tocable">
        <div class="acceso__media acceso__media--guia">
          <FotoCompleta
            src="/fotos/portadas/guia.webp"
            ancho="1280"
            alto="855"
            class="acceso__foto"
          />
          <span class="acceso__sello">
            <BookOpen :size="14" aria-hidden="true" /> Guía
          </span>
        </div>
        <div class="acceso__texto">
          <h3 class="acceso__titulo titulo-manuscrito">Guía digital</h3>
          <p>
            Eventos, tu horario, recordatorios, objetos perdidos y enfermería.
          </p>
        </div>
        <span class="acceso__flecha" aria-hidden="true"
          ><ArrowUpRight :size="20"
        /></span>
      </RouterLink>

      <RouterLink data-entra :to="{ name: 'soda' }" class="acceso tocable">
        <div class="acceso__media acceso__media--soda">
          <FotoCompleta
            src="/fotos/portadas/soda.webp"
            ancho="900"
            alto="648"
            class="acceso__foto"
          />
          <span class="acceso__sello">
            <UtensilsCrossed :size="14" aria-hidden="true" /> Soda
          </span>
        </div>
        <div class="acceso__texto">
          <h3 class="acceso__titulo titulo-manuscrito">Soda Armonía</h3>
          <p>Pedí desde aquí y retirá en el recreo, sin hacer fila.</p>
        </div>
        <span class="acceso__flecha" aria-hidden="true"
          ><ArrowUpRight :size="20"
        /></span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
  padding-top: var(--e-5);
}

/* ---------- Portada ---------- */
.portada {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
  padding: var(--e-6) var(--e-5) var(--e-5);
  border-radius: var(--radio-xl);
  background: var(--marino-800);
  color: #ffffff;
  overflow: hidden;
  box-shadow: 0 18px 40px -18px rgba(21, 35, 74, 0.7);
  isolation: isolate;
}

.portada__brillo {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(
      24rem 16rem at 100% 0%,
      rgba(99, 209, 180, 0.32),
      transparent 70%
    ),
    radial-gradient(
      22rem 14rem at 0% 120%,
      rgba(67, 109, 221, 0.4),
      transparent 70%
    );
  animation: respira calc(8s * var(--mov)) ease-in-out infinite alternate;
}

@keyframes respira {
  to {
    transform: scale(1.12) translate(-2%, 2%);
  }
}

.portada__fila {
  display: flex;
  align-items: center;
  gap: var(--e-4);
}

.portada__escudo {
  flex-shrink: 0;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35));
}

.portada__textos {
  min-width: 0;
}

.portada__fecha {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
  color: var(--marino-100);
}

.portada__hola {
  margin-top: 2px;
  font-size: var(--txt-2xl);
  line-height: 1.15;
  color: #ffffff;
}

.portada__rol {
  margin-top: 2px;
  font-size: var(--txt-sm);
  color: var(--marino-100);
}

.portada__estado {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}

.estado {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  min-height: 36px;
  padding: 6px var(--e-3);
  border-radius: var(--radio-pildora);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: var(--txt-sm);
  text-decoration: none;
  transition:
    background-color var(--dur-rapida) ease,
    transform var(--dur-toque) var(--curva-salida);
}

.estado:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.estado:active {
  transform: scale(0.97);
}

.estado__punto {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--turquesa-200);
}

.estado--vivo .estado__punto {
  background: #63d1b4;
}

.estado--vivo .estado__punto::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #63d1b4;
  animation: late calc(1.8s * var(--mov)) var(--curva-salida) infinite;
}

@keyframes late {
  to {
    transform: scale(3);
    opacity: 0;
  }
}

/* ---------- Buscador ---------- */
.menu__buscar .entrada {
  min-height: 52px;
  background: var(--fondo-elevado);
  box-shadow: var(--sombra-1);
  padding-right: 6.5rem;
}

.buscador__ir {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
}

.buscador__ir:active:not(:disabled) {
  transform: translateY(-50%) scale(0.97);
}

.aparece-enter-active,
.aparece-leave-active {
  transition:
    opacity calc(200ms * var(--mov)) ease,
    translate calc(260ms * var(--mov)) var(--curva-salida);
}

.aparece-enter-from,
.aparece-leave-to {
  opacity: 0;
  translate: 8px 0;
}

/* ---------- Atajos ---------- */
.atajos {
  display: flex;
  gap: var(--e-2);
  overflow-x: auto;
  margin-inline: calc(var(--margen-lateral) * -1);
  padding: 2px var(--margen-lateral) var(--e-1);
  scrollbar-width: none;
}

.atajos::-webkit-scrollbar {
  display: none;
}

.atajo {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  min-height: 46px;
  padding: 0 var(--e-4) 0 6px;
  border-radius: var(--radio-pildora);
  background: var(--superficie);
  border: 1px solid var(--borde);
  color: var(--texto);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  text-decoration: none;
  box-shadow: var(--sombra-1);
  -webkit-tap-highlight-color: transparent;
  transition:
    transform var(--dur-toque) var(--curva-salida),
    border-color var(--dur-rapida) ease,
    box-shadow var(--dur-media) var(--curva-salida);
}

.atajo:hover {
  color: var(--texto);
  border-color: var(--principal-borde);
  box-shadow: var(--sombra-2);
}

.atajo:active {
  transform: scale(0.95);
}

.atajo__icono {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--principal-suave);
  color: var(--principal-fuerte);
  transition: transform var(--dur-media) var(--curva-rebote);
}

@media (hover: hover) and (pointer: fine) {
  .atajo:hover .atajo__icono {
    transform: rotate(-8deg) scale(1.08);
  }
}

/* ---------- Destacados ---------- */
.destacados {
  display: grid;
  gap: var(--e-3);
}

.destacado {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--e-1) var(--e-3);
  align-items: center;
  padding: var(--e-4);
  border-radius: var(--radio-lg);
  border: 1px solid var(--borde);
  background: var(--superficie);
  color: var(--texto);
  box-shadow: var(--sombra-1);
}

.destacado__icono {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radio-md);
  background: var(--info-fondo);
  color: var(--info);
}

.destacado--exito {
  border-color: color-mix(in srgb, var(--exito) 35%, transparent);
  background: var(--exito-fondo);
}

.destacado--exito .destacado__icono {
  background: var(--fondo-elevado);
  color: var(--exito);
  animation: alegre calc(1.6s * var(--mov)) var(--curva-rebote) infinite;
}

@keyframes alegre {
  0%,
  60%,
  100% {
    transform: none;
  }
  70% {
    transform: rotate(-10deg) scale(1.08);
  }
  85% {
    transform: rotate(8deg) scale(1.04);
  }
}

.destacado--evento .destacado__icono {
  background: var(--accion-suave);
  color: var(--accion);
}

.destacado__textos {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.destacado__textos span {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.destacado__acciones {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-1) var(--e-2);
  margin-left: calc(var(--e-3) * -1);
}

/* ---------- Anuncios ---------- */
.anuncios {
  border-radius: var(--radio-lg);
  border: 1px solid var(--borde);
  background: var(--superficie);
  overflow: hidden;
  box-shadow: var(--sombra-1);
}

.anuncios__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 56px;
  padding: var(--e-2) var(--e-4);
  gap: var(--e-3);
  color: var(--texto);
  text-align: left;
  transition: background-color var(--dur-rapida) ease;
}

.anuncios__cabecera:hover {
  background: var(--superficie-hover);
}

.anuncios__cabecera-izq {
  display: flex;
  align-items: center;
  gap: var(--e-3);
}

.anuncios__icono {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radio-sm);
  background: var(--aviso-fondo);
  color: var(--aviso);
}

.anuncios__titulo {
  font-weight: var(--peso-semi);
}

.anuncios__contador {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: var(--radio-pildora);
  background: var(--aviso);
  color: #ffffff;
  font-size: var(--txt-xs);
  font-weight: var(--peso-fuerte);
  line-height: 1;
}

.anuncios__chevron {
  color: var(--texto-tenue);
  transition: transform calc(360ms * var(--mov)) var(--curva);
  flex-shrink: 0;
}

.anuncios__chevron.es-abierto {
  transform: rotate(180deg);
}

.anuncios__lista {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--borde);
}

.anuncio {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-2) var(--e-4);
  padding: var(--e-3) var(--e-4);
  border-bottom: 1px solid var(--borde-sutil);
}

.anuncio:last-child {
  border-bottom: none;
}

.anuncio.es-importante {
  border-left: 3px solid var(--error);
  padding-left: calc(var(--e-4) - 3px);
}

.anuncio__contenido {
  flex: 1;
  min-width: 0;
}

.anuncio__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
}

.anuncio__cuerpo {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  margin-top: 2px;
}

/* ---------- Accesos ---------- */
.menu__subtitulo {
  margin-top: var(--e-2);
  font-family: var(--fuente-titulo);
  font-size: var(--txt-xl);
  color: var(--texto-titulo);
}

.accesos {
  display: grid;
  gap: var(--e-4);
}

.acceso {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radio-xl);
  background: var(--superficie);
  border: 1px solid var(--borde);
  color: var(--texto);
  text-decoration: none;
  box-shadow: var(--sombra-2);
}

.acceso:hover {
  color: var(--texto);
}

.acceso__media {
  position: relative;
  overflow: hidden;
  background: var(--superficie-3);
}

/* Cada caja tiene la proporcion de su foto: nada se corta. */
.acceso__media--mapa {
  aspect-ratio: 1452 / 1426;
  background: #ffffff;
}

.acceso__media--guia {
  aspect-ratio: 1280 / 855;
}

.acceso__media--soda {
  aspect-ratio: 900 / 648;
}

.acceso__foto {
  width: 100%;
  height: 100%;
}

.acceso__media > :first-child {
  transition: transform calc(800ms * var(--mov)) var(--curva-salida);
}

@media (hover: hover) and (pointer: fine) {
  .acceso:hover .acceso__media > :first-child {
    transform: scale(1.03);
  }
}

.acceso__sello {
  position: absolute;
  left: var(--e-3);
  top: var(--e-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px var(--e-3);
  border-radius: var(--radio-pildora);
  background: var(--fondo-elevado);
  color: var(--texto);
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
  box-shadow: var(--sombra-2);
}

.acceso__texto {
  padding: var(--e-4) var(--e-12) var(--e-5) var(--e-5);
}

.acceso__titulo {
  font-size: var(--txt-xl);
  margin-bottom: var(--e-1);
}

.acceso__texto p {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.acceso__flecha {
  position: absolute;
  right: var(--e-4);
  bottom: var(--e-5);
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--superficie-3);
  color: var(--texto-suave);
  transition:
    transform var(--dur-media) var(--curva-salida),
    background-color var(--dur-media) ease,
    color var(--dur-media) ease;
}

.acceso:hover .acceso__flecha {
  transform: rotate(45deg);
  background: var(--principal);
  color: var(--sobre-principal);
}

@media (min-width: 768px) {
  .menu {
    padding-top: var(--e-8);
  }

  .portada {
    padding: var(--e-8);
  }

  .portada__hola {
    font-size: var(--txt-3xl);
  }

  .accesos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .acceso--mapa {
    grid-row: span 2;
  }
}

@media (min-width: 1024px) {
  .destacados {
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  }

  .menu__buscar {
    max-width: 36rem;
  }
}
</style>
