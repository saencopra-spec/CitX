<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowUpRight,
  CalendarDays,
  ShoppingBag,
  HeartPulse,
  Search,
} from 'lucide-vue-next'
import MapaMiniatura from '@/components/MapaMiniatura.vue'
import { useAuth } from '@/stores/auth'
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

const saludo = saludoSegunHora()
const enfermeria = estadoEnfermeria()

/** Lo mas util para mostrar arriba, segun lo que este pasando. */
const destacado = computed(() => {
  const pedido = inicio.value?.pedidoActivo
  if (pedido) {
    const listo = pedido.estado === 'listo'
    return {
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
    }
  }
  const evento = inicio.value?.proximoEvento
  if (evento) {
    return {
      icono: CalendarDays,
      tono: 'info',
      titulo: evento.titulo,
      texto: `Próximo evento: ${fechaRelativa(evento.inicio)}, ${horaLegible(evento.hora)}.`,
      enlace: { name: 'eventos' },
      accion: 'Ver eventos',
    }
  }
  return null
})

onMounted(async () => {
  entradaEscalonada(raiz.value)
  try {
    inicio.value = await api.get('/inicio')
  } catch {
    inicio.value = null
  }
})
</script>

<template>
  <div ref="raiz" class="pagina menu">
    <header class="saludo">
      <p data-entra class="saludo__hola titulo-manuscrito">
        {{ saludo }}, {{ auth.nombreCorto }}
      </p>
      <p data-entra class="saludo__rol">
        {{ auth.nombreRol
        }}<template v-if="auth.usuario?.seccion">
          · Sección {{ auth.usuario.seccion }}</template
        >
      </p>
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
        placeholder="Buscar en CitX: soda, enfermería, canchas..."
      />
    </form>

    <RouterLink
      v-if="destacado"
      data-entra
      :to="destacado.enlace"
      class="destacado"
      :class="`destacado--${destacado.tono}`"
    >
      <component
        :is="destacado.icono"
        :size="22"
        aria-hidden="true"
        class="destacado__icono"
      />
      <span class="destacado__textos">
        <strong>{{ destacado.titulo }}</strong>
        <span>{{ destacado.texto }}</span>
      </span>
      <span class="destacado__accion">{{ destacado.accion }}</span>
    </RouterLink>

    <div class="accesos">
      <RouterLink data-entra :to="{ name: 'mapa' }" class="acceso acceso--mapa">
        <div class="acceso__media acceso__media--mapa">
          <MapaMiniatura />
          <span class="pin" aria-hidden="true" />
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
            src="/fotos/portada-guia.webp"
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
            src="/fotos/portada-soda.webp"
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

.saludo__hola {
  font-size: var(--txt-2xl);
}

.saludo__rol {
  color: var(--texto-suave);
  margin-top: var(--e-1);
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

.destacado:hover {
  box-shadow: var(--sombra-3);
  color: var(--texto);
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

.destacado__accion {
  grid-column: 2;
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--accion);
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

.pin {
  position: absolute;
  left: 53.5%;
  top: 70%;
  width: 18px;
  height: 18px;
  border-radius: 50% 50% 50% 0;
  transform: translate(-50%, -100%) rotate(-45deg);
  background: var(--accion);
  border: 3px solid #ffffff;
  box-shadow: var(--sombra-2);
  animation: pin-salto calc(2400ms * var(--mov)) var(--curva) infinite;
}

@keyframes pin-salto {
  0%,
  70%,
  100% {
    transform: translate(-50%, -100%) rotate(-45deg);
  }
  80% {
    transform: translate(-50%, -150%) rotate(-45deg);
  }
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

  .saludo__hola {
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
  .menu__buscar {
    max-width: 34rem;
  }
}
</style>
