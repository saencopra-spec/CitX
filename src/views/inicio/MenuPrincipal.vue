<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowUpRight,
  CalendarDays,
  ShoppingBag,
  HeartPulse,
  Search,
  Megaphone,
  MapPin,
} from 'lucide-vue-next'
import MapaMiniatura from '@/components/mapa/MapaMiniatura.vue'
import { useAuth } from '@/stores/auth'
import { useLugares } from '@/stores/lugares'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import { api } from '@/lib/api'
import { entradaEscalonada } from '@/lib/movimiento'
import {
  saludoSegunHora,
  fechaRelativa,
  horaLegible,
} from '@compartido/hora.js'
import { estadoEnfermeria } from '@compartido/enfermeria.js'
import { NOMBRE_ESTADO } from '@compartido/pedidos.js'

const auth = useAuth()
const raiz = ref(null)
const inicio = ref(null)
const busqueda = ref('')
const anuncios = ref([])
const lugares = useLugares()

const saludo = saludoSegunHora()
const enfermeria = estadoEnfermeria()

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

onMounted(async () => {
  entradaEscalonada(raiz.value)
  lugares.cargar()
  const [i, a] = await Promise.allSettled([
    api.get('/inicio'),
    api.get('/anuncios'),
  ])
  inicio.value = i.status === 'fulfilled' ? i.value : null
  anuncios.value = a.status === 'fulfilled' ? a.value.anuncios.slice(0, 3) : []
})
</script>

<template>
  <div ref="raiz" class="pagina menu">
    <header data-entra class="portada">
      <img
        src="/fotos/carrusel/estudiantes-1280.webp"
        srcset="
          /fotos/carrusel/estudiantes-1280.webp 1280w,
          /fotos/carrusel/estudiantes-1920.webp 1920w
        "
        sizes="(min-width: 1024px) 70vw, 100vw"
        alt=""
        class="portada__foto"
        width="1280"
        height="853"
      />
      <div class="portada__contenido">
        <EscudoCit :tamano="64" />
        <div>
          <p class="portada__hola titulo-manuscrito">
            {{ saludo }}, {{ auth.nombreCorto }}
          </p>
          <p class="portada__rol">
            {{ auth.nombreRol
            }}<template v-if="auth.usuario?.seccion">
              · Sección {{ auth.usuario.seccion }}</template
            >
            <span class="portada__colegio"> · Complejo Educativo CIT</span>
          </p>
        </div>
      </div>
    </header>

    <form
      data-entra
      class="buscador menu__buscar"
      role="search"
      @submit.prevent="
        $router.push({ name: 'mapa', query: { buscar: busqueda } })
      "
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
    </form>

    <div v-if="destacados.length" class="destacados">
      <article
        v-for="d in destacados"
        :key="d.clave"
        data-entra
        class="destacado"
        :class="`destacado--${d.tono}`"
      >
        <component
          :is="d.icono"
          :size="22"
          aria-hidden="true"
          class="destacado__icono"
        />
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
      <h2 id="t-anuncios" class="anuncios__titulo">
        <Megaphone :size="18" aria-hidden="true" /> Avisos del colegio
      </h2>
      <ul>
        <li
          v-for="a in anuncios"
          :key="a.id"
          class="anuncio"
          :class="{ 'es-importante': a.importante }"
        >
          <div>
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
    </section>

    <div class="accesos">
      <RouterLink data-entra :to="{ name: 'mapa' }" class="acceso acceso--mapa">
        <div class="acceso__media acceso__media--mapa">
          <MapaMiniatura />
        </div>
        <div class="acceso__texto">
          <h2 class="acceso__titulo titulo-manuscrito">Mapa interactivo</h2>
          <p>
            Encontrá aulas, la soda, la enfermería o las canchas, y guardá tus
            lugares favoritos.
          </p>
        </div>
        <ArrowUpRight :size="22" class="acceso__flecha" aria-hidden="true" />
      </RouterLink>

      <RouterLink
        data-entra
        :to="{ name: 'guia' }"
        class="acceso acceso--horizontal"
      >
        <div class="acceso__media">
          <img
            src="/fotos/portadas/guia.webp"
            alt=""
            loading="lazy"
            width="900"
            height="648"
          />
        </div>
        <div class="acceso__texto">
          <h2 class="acceso__titulo titulo-manuscrito">Guía digital</h2>
          <p>
            Eventos, tu horario, recordatorios, objetos perdidos y enfermería.
          </p>
        </div>
        <ArrowUpRight :size="22" class="acceso__flecha" aria-hidden="true" />
      </RouterLink>

      <RouterLink
        data-entra
        :to="{ name: 'soda' }"
        class="acceso acceso--horizontal acceso--soda"
      >
        <div class="acceso__media">
          <img
            src="/fotos/portadas/soda.webp"
            alt=""
            loading="lazy"
            width="900"
            height="648"
          />
        </div>
        <div class="acceso__texto">
          <h2 class="acceso__titulo titulo-manuscrito">Soda Armonía</h2>
          <p>Pedí desde aquí y retirá en el recreo, sin hacer fila.</p>
        </div>
        <ArrowUpRight :size="22" class="acceso__flecha" aria-hidden="true" />
      </RouterLink>
    </div>

    <RouterLink
      data-entra
      :to="{ name: 'enfermeria' }"
      class="enfermeria-linea"
    >
      <HeartPulse :size="18" aria-hidden="true" />
      <span>Enfermería:</span>
      <span
        class="estado-punto"
        :class="enfermeria.abierta ? 'es-abierta' : 'es-cerrada'"
        >{{ enfermeria.mensaje }}</span
      >
    </RouterLink>
  </div>
</template>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
  padding-top: var(--e-5);
}

.portada {
  position: relative;
  display: flex;
  align-items: flex-end;
  min-height: 170px;
  border-radius: var(--radio-xl);
  overflow: hidden;
  color: #ffffff;
  box-shadow: var(--sombra-2);
}

.portada__foto {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.portada::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(21, 35, 74, 0.05) 0%,
    rgba(21, 35, 74, 0.82) 72%
  );
}

.portada__contenido {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--e-4);
  padding: var(--e-4) var(--e-5);
}

.portada__hola {
  font-size: var(--txt-2xl);
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.portada__rol {
  font-size: var(--txt-sm);
  color: rgba(255, 255, 255, 0.92);
}

.portada__colegio {
  display: none;
}

.destacados {
  display: grid;
  gap: var(--e-3);
}

.destacado__acciones {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-1) var(--e-2);
  margin-left: calc(var(--e-3) * -1);
}

.destacado--evento {
  border-left-color: var(--accion);
}

.anuncios {
  padding: var(--e-4);
  border-radius: var(--radio-lg);
  background: var(--aviso-fondo);
  border: 1px solid color-mix(in srgb, var(--aviso) 30%, transparent);
}

.anuncios__titulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-md);
  margin-bottom: var(--e-3);
  color: var(--aviso);
}

.anuncios ul {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.anuncio {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-2) var(--e-4);
  padding: var(--e-3);
  border-radius: var(--radio-md);
  background: var(--superficie);
}

.anuncio.es-importante {
  border-left: 4px solid var(--error);
}

.anuncio__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  font-weight: var(--peso-semi);
}

.anuncio__cuerpo {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.destacado {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--e-1) var(--e-3);
  align-items: center;
  padding: var(--e-4);
  border-radius: var(--radio-lg);
  border: 1px solid var(--borde);
  border-left: 5px solid var(--info);
  background: var(--superficie);
  color: var(--texto);
  text-decoration: none;
  box-shadow: var(--sombra-1);
  transition: box-shadow var(--dur-media) var(--curva);
}

.destacado--exito {
  border-left-color: var(--exito);
  background: var(--exito-fondo);
}

.destacado__icono {
  color: var(--info);
}

.destacado--exito .destacado__icono {
  color: var(--exito);
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
  transition:
    transform var(--dur-media) var(--curva),
    box-shadow var(--dur-media) var(--curva);
}

.acceso:hover {
  color: var(--texto);
  box-shadow: var(--sombra-4);
  transform: translateY(-3px);
}

.acceso:active {
  transform: scale(0.99);
}

.acceso__media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--superficie-3);
}

.acceso__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform calc(700ms * var(--mov)) var(--curva);
}

.acceso:hover .acceso__media img {
  transform: scale(1.04);
}

.acceso__media--mapa {
  aspect-ratio: 1000 / 600;
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
  color: var(--texto-tenue);
  transition:
    transform var(--dur-media) var(--curva),
    color var(--dur-media) var(--curva);
}

.acceso:hover .acceso__flecha {
  transform: translate(2px, -2px);
  color: var(--accion);
}

.acceso--horizontal {
  flex-direction: row;
  align-items: stretch;
}

.acceso--horizontal .acceso__media {
  width: 38%;
  flex-shrink: 0;
  aspect-ratio: auto;
  min-height: 132px;
}

.acceso--horizontal .acceso__texto {
  align-self: center;
}

.enfermeria-linea {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  min-height: var(--objetivo-tactil);
  color: var(--texto-suave);
  font-size: var(--txt-sm);
  text-decoration: none;
}

.estado-punto {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: var(--peso-semi);
}

.estado-punto::before {
  content: '';
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.es-abierta {
  color: var(--exito);
}

.es-abierta::before {
  background: var(--exito);
}

.es-cerrada {
  color: var(--texto-suave);
}

.es-cerrada::before {
  background: transparent;
  border: 2px solid var(--texto-tenue);
}

@media (min-width: 768px) {
  .menu {
    padding-top: var(--e-8);
  }

  .portada {
    min-height: 210px;
  }

  .portada__hola {
    font-size: var(--txt-3xl);
  }

  .accesos {
    grid-template-columns: 1.25fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .acceso--mapa {
    grid-row: span 2;
  }

  .acceso--mapa .acceso__media {
    flex: 1;
    aspect-ratio: auto;
    min-height: 260px;
  }

  .acceso--horizontal {
    flex-direction: column;
  }

  .acceso--horizontal .acceso__media {
    width: 100%;
    min-height: 0;
    aspect-ratio: 16 / 7;
  }

  .acceso--horizontal .acceso__texto {
    align-self: stretch;
  }
}

@media (min-width: 1024px) {
  .portada__colegio {
    display: inline;
  }

  .destacados {
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  }

  .menu__buscar {
    max-width: 34rem;
  }
}
</style>
