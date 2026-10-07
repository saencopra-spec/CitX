<script setup>
import { computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  House,
  Map as IconoMapa,
  BookOpen,
  UtensilsCrossed,
  Bell,
  Settings,
  LayoutDashboard,
} from 'lucide-vue-next'
import LogoCitx from './LogoCitx.vue'
import BotonLeer from './BotonLeer.vue'
import { useAuth } from '@/stores/auth'
import { useCarrito } from '@/stores/carrito'
import { useNotificaciones } from '@/stores/notificaciones'
import { usarSondeo } from '@/lib/sondeo'
import { rebote } from '@/lib/movimiento'

const route = useRoute()
const auth = useAuth()
const carrito = useCarrito()
const notificaciones = useNotificaciones()

const secciones = [
  { nombre: 'menu', texto: 'Inicio', icono: House, prefijo: '/menu' },
  { nombre: 'mapa', texto: 'Mapa', icono: IconoMapa, prefijo: '/mapa' },
  { nombre: 'guia', texto: 'Guía', icono: BookOpen, prefijo: '/guia' },
  { nombre: 'soda', texto: 'Soda', icono: UtensilsCrossed, prefijo: '/soda' },
]

function activa(seccion) {
  return route.path.startsWith(seccion.prefijo)
}

const textoCampana = computed(() =>
  notificaciones.sinLeer
    ? `Notificaciones, ${notificaciones.sinLeer} sin leer`
    : 'Notificaciones'
)

// La campana se consulta cada 20 segundos mientras la pestana este visible.
usarSondeo(() => notificaciones.cargar(), 20000)

// El icono de la soda da un saltito cuando se agrega algo al carrito.
watch(
  () => carrito.pulso,
  () =>
    document.querySelectorAll('[data-icono-soda]').forEach((el) => rebote(el))
)
</script>

<template>
  <div class="armazon">
    <!-- Barra superior en celular -->
    <header class="superior">
      <RouterLink
        :to="{ name: 'menu' }"
        class="superior__marca"
        aria-label="CitX, ir al inicio"
      >
        <LogoCitx
          :tamano="30"
          con-nombre
          direccion="horizontal"
          alternativo=""
        />
      </RouterLink>
      <div class="superior__acciones">
        <RouterLink
          :to="{ name: 'notificaciones' }"
          class="boton-icono campana"
          :aria-label="textoCampana"
        >
          <Bell :size="22" aria-hidden="true" />
          <span
            v-if="notificaciones.sinLeer"
            class="contador"
            aria-hidden="true"
          >
            {{ notificaciones.sinLeer > 9 ? '9+' : notificaciones.sinLeer }}
          </span>
        </RouterLink>
        <RouterLink
          :to="{ name: 'configuracion' }"
          class="boton-icono"
          aria-label="Configuración"
        >
          <Settings :size="22" aria-hidden="true" />
        </RouterLink>
      </div>
    </header>

    <!-- Barra lateral en computadora -->
    <aside class="lateral" aria-label="Navegación principal">
      <RouterLink
        :to="{ name: 'menu' }"
        class="lateral__marca"
        aria-label="CitX, ir al inicio"
      >
        <LogoCitx
          :tamano="40"
          con-nombre
          direccion="horizontal"
          alternativo=""
        />
      </RouterLink>
      <nav>
        <ul class="lateral__lista">
          <li v-for="s in secciones" :key="s.nombre">
            <RouterLink
              :to="{ name: s.nombre }"
              class="lateral__enlace"
              :class="{ 'es-activa': activa(s) }"
              :aria-current="activa(s) ? 'page' : undefined"
            >
              <span
                :data-icono-soda="s.nombre === 'soda' ? '' : undefined"
                class="icono-envoltura"
              >
                <component :is="s.icono" :size="20" aria-hidden="true" />
              </span>
              {{ s.texto }}
              <span
                v-if="s.nombre === 'soda' && carrito.unidades"
                class="lateral__cuenta"
              >
                {{ carrito.unidades
                }}<span class="solo-lectores"> en el carrito</span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </nav>
      <ul class="lateral__lista lateral__lista--abajo">
        <li v-if="auth.puedeEntrarAlPanel">
          <RouterLink to="/admin" class="lateral__enlace">
            <LayoutDashboard :size="20" aria-hidden="true" />
            Panel
          </RouterLink>
        </li>
        <li>
          <RouterLink
            :to="{ name: 'notificaciones' }"
            class="lateral__enlace"
            :class="{ 'es-activa': route.name === 'notificaciones' }"
          >
            <Bell :size="20" aria-hidden="true" />
            Notificaciones
            <span
              v-if="notificaciones.sinLeer"
              class="lateral__cuenta lateral__cuenta--alerta"
            >
              {{ notificaciones.sinLeer
              }}<span class="solo-lectores"> sin leer</span>
            </span>
          </RouterLink>
        </li>
        <li>
          <RouterLink
            :to="{ name: 'configuracion' }"
            class="lateral__enlace"
            :class="{ 'es-activa': route.name === 'configuracion' }"
          >
            <Settings :size="20" aria-hidden="true" />
            Configuración
          </RouterLink>
        </li>
      </ul>
      <p class="lateral__usuario">
        <strong>{{ auth.usuario?.nombre }}</strong>
        <span
          >{{ auth.nombreRol
          }}<template v-if="auth.usuario?.seccion">
            · {{ auth.usuario.seccion }}</template
          ></span
        >
      </p>
    </aside>

    <main class="contenido">
      <slot />
    </main>

    <!-- Navegacion inferior en celular -->
    <nav class="inferior" aria-label="Navegación principal">
      <RouterLink
        v-for="s in secciones"
        :key="s.nombre"
        :to="{ name: s.nombre }"
        class="inferior__enlace"
        :class="{ 'es-activa': activa(s) }"
        :aria-current="activa(s) ? 'page' : undefined"
      >
        <span
          :data-icono-soda="s.nombre === 'soda' ? '' : undefined"
          class="icono-envoltura"
        >
          <component :is="s.icono" :size="22" aria-hidden="true" />
          <span
            v-if="s.nombre === 'soda' && carrito.unidades"
            class="contador"
            aria-hidden="true"
          >
            {{ carrito.unidades }}
          </span>
        </span>
        <span>{{ s.texto }}</span>
        <span
          v-if="s.nombre === 'soda' && carrito.unidades"
          class="solo-lectores"
        >
          , {{ carrito.unidades }} en el carrito
        </span>
      </RouterLink>
    </nav>

    <BotonLeer />
  </div>
</template>

<style scoped>
.armazon {
  min-height: 100dvh;
}

.superior {
  position: sticky;
  top: 0;
  z-index: var(--z-barra);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
  padding: var(--e-2) var(--e-2) var(--e-2) var(--margen-lateral);
  padding-top: calc(var(--e-2) + env(safe-area-inset-top));
  background: color-mix(in srgb, var(--fondo) 92%, transparent);
  backdrop-filter: saturate(1.4) blur(8px);
  border-bottom: 1px solid var(--borde-sutil);
}

.superior__marca {
  display: inline-flex;
  min-height: var(--objetivo-tactil);
  align-items: center;
  text-decoration: none;
}

.superior__acciones {
  display: flex;
  gap: var(--e-1);
}

.campana,
.icono-envoltura {
  position: relative;
}

.icono-envoltura {
  display: inline-flex;
}

.contador {
  position: absolute;
  top: 4px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: var(--radio-pildora);
  background: var(--error);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: var(--peso-fuerte);
  line-height: 1;
  border: 2px solid var(--fondo);
}

.icono-envoltura .contador {
  top: -7px;
  right: -12px;
  background: var(--principal-fuerte);
  color: var(--sobre-principal);
}

.contenido {
  padding-bottom: calc(
    var(--alto-barra-inferior) + env(safe-area-inset-bottom) + var(--e-6)
  );
}

.inferior {
  position: fixed;
  inset: auto 0 0 0;
  z-index: var(--z-barra);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  min-height: calc(var(--alto-barra-inferior) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--fondo-elevado);
  border-top: 1px solid var(--borde);
}

.inferior__enlace {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: var(--alto-barra-inferior);
  color: var(--texto-tenue);
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
  text-decoration: none;
  position: relative;
  transition: color var(--dur-rapida) var(--curva-suave);
}

.inferior__enlace::before {
  content: '';
  position: absolute;
  top: 0;
  left: 30%;
  right: 30%;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: var(--principal);
  transform: scaleX(0);
  transition: transform var(--dur-media) var(--curva);
}

.inferior__enlace.es-activa {
  color: var(--principal-fuerte);
}

.inferior__enlace.es-activa::before {
  transform: scaleX(1);
}

.lateral {
  display: none;
}

@media (min-width: 1024px) {
  .superior,
  .inferior {
    display: none;
  }

  .armazon {
    display: grid;
    grid-template-columns: var(--ancho-lateral) minmax(0, 1fr);
  }

  .lateral {
    position: sticky;
    top: 0;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: var(--e-6);
    padding: var(--e-6) var(--e-4);
    background: var(--fondo-elevado);
    border-right: 1px solid var(--borde);
    overflow-y: auto;
  }

  .lateral__marca {
    padding: var(--e-1) var(--e-3);
    text-decoration: none;
  }

  .lateral__lista {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lateral__lista--abajo {
    margin-top: auto;
  }

  .lateral__enlace {
    display: flex;
    align-items: center;
    gap: var(--e-3);
    min-height: var(--objetivo-tactil);
    padding: 0 var(--e-3);
    border-radius: var(--radio-md);
    color: var(--texto-suave);
    font-weight: var(--peso-semi);
    text-decoration: none;
    transition:
      background-color var(--dur-rapida) var(--curva-suave),
      color var(--dur-rapida) var(--curva-suave);
  }

  .lateral__enlace:hover {
    background: var(--superficie-hover);
    color: var(--texto);
  }

  .lateral__enlace.es-activa {
    background: var(--principal-suave);
    color: var(--principal-fuerte);
  }

  .lateral__cuenta {
    margin-left: auto;
    min-width: 24px;
    padding: 1px 7px;
    border-radius: var(--radio-pildora);
    background: var(--principal);
    color: var(--sobre-principal);
    font-size: var(--txt-xs);
    text-align: center;
  }

  .lateral__cuenta--alerta {
    background: var(--error);
    color: #ffffff;
  }

  .lateral__usuario {
    display: flex;
    flex-direction: column;
    padding: var(--e-3);
    border-top: 1px solid var(--borde);
    font-size: var(--txt-sm);
    line-height: 1.35;
  }

  .lateral__usuario span {
    color: var(--texto-tenue);
  }

  .contenido {
    padding-bottom: var(--e-12);
    min-width: 0;
  }
}
</style>
