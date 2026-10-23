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
  KeyRound,
  UserPlus,
  CalendarDays,
} from 'lucide-vue-next'
import LogoCitx from '@/components/marca/LogoCitx.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import BotonLeer from '@/components/accesibilidad/BotonLeer.vue'
import CampanaAvisos from '@/components/avisos/CampanaAvisos.vue'
import MenuUsuario from '@/components/estructura/MenuUsuario.vue'
import RecorridoGuiado from '@/components/estructura/RecorridoGuiado.vue'
import { useAuth } from '@/stores/auth'
import { useCarrito } from '@/stores/carrito'
import { useNotificaciones } from '@/stores/notificaciones'
import { usarSondeo } from '@/lib/sondeo'
import { rebote } from '@/lib/movimiento'

const route = useRoute()
const auth = useAuth()
const carrito = useCarrito()
const notificaciones = useNotificaciones()

const todas = [
  { nombre: 'menu', texto: 'Inicio', icono: House, prefijo: '/menu' },
  { nombre: 'mapa', texto: 'Mapa', icono: IconoMapa, prefijo: '/mapa' },
  { nombre: 'guia', texto: 'Guía', icono: BookOpen, prefijo: '/guia' },
  { nombre: 'soda', texto: 'Soda', icono: UtensilsCrossed, prefijo: '/soda' },
]

/** Quien entra como invitado solo ve el mapa y los eventos. */
const deInvitado = [
  { nombre: 'mapa', texto: 'Mapa', icono: IconoMapa, prefijo: '/mapa' },
  {
    nombre: 'eventos',
    texto: 'Eventos',
    icono: CalendarDays,
    prefijo: '/guia/eventos',
  },
]

const secciones = computed(() => (auth.haySesion ? todas : deInvitado))

function activa(seccion) {
  return route.path.startsWith(seccion.prefijo)
}

/** Posicion de la pastilla que marca la seccion activa (se desliza). */
const indiceActivo = computed(() => secciones.value.findIndex((s) => activa(s)))

// La campana se consulta cada 20 segundos mientras la pestana este visible.
usarSondeo(() => (auth.haySesion ? notificaciones.cargar() : null), 20000)

// El icono de la soda da un saltito cuando se agrega algo al carrito.
watch(
  () => carrito.pulso,
  () =>
    document.querySelectorAll('[data-icono-soda]').forEach((el) => rebote(el))
)

// Cada vez que se cambia de seccion, su icono hace un pequeno rebote.
watch(indiceActivo, (i) => {
  if (i < 0) return
  document
    .querySelectorAll(`[data-icono-seccion="${secciones.value[i].nombre}"]`)
    .forEach((el) => rebote(el))
})
</script>

<template>
  <div
    class="armazon"
    :class="{ 'con-franja': auth.invitado && !auth.haySesion }"
  >
    <!-- Barra lateral en computadora -->
    <aside class="lateral" aria-label="Navegación principal">
      <RouterLink
        :to="auth.inicioDe()"
        class="lateral__marca"
        aria-label="CitX, ir al inicio"
      >
        <EscudoCit :tamano="44" alternativo="" />
        <span class="lateral__marca-textos">
          <LogoCitx
            :tamano="28"
            con-nombre
            direccion="horizontal"
            alternativo=""
          />
          <span class="lateral__colegio">Complejo Educativo CIT</span>
        </span>
      </RouterLink>

      <nav>
        <p class="lateral__grupo">Explorar</p>
        <ul
          class="lateral__lista lateral__lista--secciones"
          :style="{ '--indice': Math.max(0, indiceActivo) }"
        >
          <span
            class="lateral__pastilla"
            :class="{ 'es-oculta': indiceActivo < 0 }"
            aria-hidden="true"
          />
          <li v-for="s in secciones" :key="s.nombre">
            <RouterLink
              :to="{ name: s.nombre }"
              class="lateral__enlace"
              :class="{ 'es-activa': activa(s) }"
              :aria-current="activa(s) ? 'page' : undefined"
              :data-recorrido="s.nombre === 'menu' ? 'inicio' : s.nombre"
            >
              <span
                :data-icono-soda="s.nombre === 'soda' ? '' : undefined"
                :data-icono-seccion="s.nombre"
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
          <RouterLink
            to="/admin"
            class="lateral__enlace lateral__enlace--panel"
            data-recorrido="panel"
          >
            <LayoutDashboard :size="20" aria-hidden="true" />
            Panel de administración
          </RouterLink>
        </li>
        <li v-if="auth.haySesion">
          <RouterLink
            :to="{ name: 'notificaciones' }"
            class="lateral__enlace"
            :class="{ 'es-activa': route.name === 'notificaciones' }"
          >
            <Bell :size="20" aria-hidden="true" />
            Avisos
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
      <div class="lateral__usuario">
        <MenuUsuario hacia="arriba" con-nombre />
      </div>
    </aside>

    <div class="columna">
      <!-- Barra superior: en celular lleva la marca; en computadora, la campanita y la cuenta -->
      <header class="superior">
        <RouterLink
          :to="auth.inicioDe()"
          class="superior__marca"
          aria-label="CitX, ir al inicio"
        >
          <EscudoCit :tamano="32" alternativo="" />
          <LogoCitx
            :tamano="26"
            con-nombre
            direccion="horizontal"
            alternativo=""
          />
        </RouterLink>
        <p class="superior__colegio">
          <span class="superior__punto" aria-hidden="true" />
          Complejo Educativo CIT
          <span class="superior__separador" aria-hidden="true">/</span>
          <Transition name="titulo" mode="out-in">
            <strong :key="route.meta.titulo">{{ route.meta.titulo }}</strong>
          </Transition>
        </p>
        <div class="superior__acciones">
          <RouterLink
            v-if="auth.puedeEntrarAlPanel"
            to="/admin"
            class="boton-icono superior__panel"
            aria-label="Panel de administración"
            data-recorrido="panel"
          >
            <LayoutDashboard :size="22" aria-hidden="true" />
          </RouterLink>
          <span v-if="auth.haySesion" data-recorrido="avisos">
            <CampanaAvisos />
          </span>
          <MenuUsuario class="superior__cuenta" />
        </div>
      </header>

      <RouterLink
        v-if="auth.usuario?.debeCambiarContrasena"
        :to="{ name: 'configuracion' }"
        class="aviso-franja"
      >
        <KeyRound :size="18" aria-hidden="true" />
        Estás usando una contraseña temporal. Tocá aquí para cambiarla.
      </RouterLink>

      <div
        v-if="auth.invitado && !auth.haySesion"
        class="aviso-franja aviso-franja--invitado"
      >
        <span>
          Estás como <strong>invitado</strong>.<span class="franja__extra">
            Con una cuenta podés pedir en la soda, guardar favoritos y recibir
            avisos.</span
          >
        </span>
        <RouterLink
          :to="{ name: 'registro' }"
          class="boton boton--principal boton--pequeno franja__boton"
        >
          <UserPlus :size="16" aria-hidden="true" /> Crear cuenta
        </RouterLink>
      </div>

      <main class="contenido">
        <slot />
      </main>
    </div>

    <!-- Navegacion inferior en celular -->
    <nav
      class="inferior"
      aria-label="Navegación principal"
      :style="{
        '--indice': Math.max(0, indiceActivo),
        '--columnas': secciones.length,
      }"
    >
      <span
        class="inferior__pastilla"
        :class="{ 'es-oculta': indiceActivo < 0 }"
        aria-hidden="true"
      />
      <RouterLink
        v-for="s in secciones"
        :key="s.nombre"
        :to="{ name: s.nombre }"
        class="inferior__enlace"
        :class="{ 'es-activa': activa(s) }"
        :aria-current="activa(s) ? 'page' : undefined"
        :data-recorrido="s.nombre === 'menu' ? 'inicio' : s.nombre"
      >
        <span
          :data-icono-soda="s.nombre === 'soda' ? '' : undefined"
          :data-icono-seccion="s.nombre"
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
        <span class="inferior__texto">{{ s.texto }}</span>
        <span
          v-if="s.nombre === 'soda' && carrito.unidades"
          class="solo-lectores"
        >
          , {{ carrito.unidades }} en el carrito
        </span>
      </RouterLink>
    </nav>

    <BotonLeer />
    <RecorridoGuiado />
  </div>
</template>

<style scoped>
.armazon {
  min-height: 100dvh;
  /* Alto de la franja de invitado: el mapa lo descuenta para caber justo. */
  --alto-franja: 0px;
}

.armazon.con-franja {
  --alto-franja: 51px;
}

.columna {
  min-width: 0;
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
  background: color-mix(in srgb, var(--fondo) 94%, transparent);
  border-bottom: 1px solid var(--borde-sutil);
}

.superior__marca {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  min-height: var(--objetivo-tactil);
  text-decoration: none;
  transition: transform var(--dur-toque) var(--curva-salida);
}

.superior__marca:active {
  transform: scale(0.97);
}

.superior__colegio {
  display: none;
}

.superior__acciones {
  display: flex;
  align-items: center;
  gap: var(--e-1);
}

.superior__cuenta {
  margin-left: var(--e-1);
}

.aviso-franja {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-2) var(--e-4);
  padding: var(--e-3) var(--margen-lateral);
  background: var(--aviso-fondo);
  color: var(--texto);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  text-decoration: none;
  animation: franja-baja calc(500ms * var(--mov)) var(--curva-salida) backwards;
}

.aviso-franja--invitado {
  flex-wrap: nowrap;
  padding-block: var(--e-2);
  background: var(--principal-suave);
  font-weight: var(--peso-normal);
}

.franja__extra {
  display: none;
}

.franja__boton {
  flex-shrink: 0;
  min-height: 34px;
}

@media (min-width: 768px) {
  .franja__extra {
    display: inline;
  }
}

@keyframes franja-baja {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.icono-envoltura {
  position: relative;
  display: inline-flex;
}

.contador {
  position: absolute;
  top: -7px;
  right: -12px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: var(--radio-pildora);
  background: var(--principal-fuerte);
  color: var(--sobre-principal);
  font-size: 0.6875rem;
  font-weight: var(--peso-fuerte);
  line-height: 1;
  border: 2px solid var(--fondo-elevado);
  animation: contador-entra calc(400ms * var(--mov)) var(--curva-rebote);
}

@keyframes contador-entra {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}

.contenido {
  padding-bottom: calc(
    var(--alto-barra-inferior) + env(safe-area-inset-bottom) + var(--e-10)
  );
}

/* ---------- Barra inferior flotante (celular) ---------- */
.inferior {
  position: fixed;
  left: var(--e-3);
  right: var(--e-3);
  bottom: calc(var(--e-3) + env(safe-area-inset-bottom));
  z-index: var(--z-barra);
  display: grid;
  grid-template-columns: repeat(var(--columnas, 4), 1fr);
  padding: 6px;
  border-radius: var(--radio-xl);
  background: var(--fondo-elevado);
  box-shadow: var(--sombra-flotante);
}

.inferior__pastilla {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 6px;
  width: calc((100% - 12px) / var(--columnas, 4));
  border-radius: calc(var(--radio-xl) - 6px);
  background: var(--principal-suave);
  transform: translateX(calc(var(--indice) * 100%));
  transition:
    transform calc(420ms * var(--mov)) var(--curva),
    opacity var(--dur-media) ease;
}

.inferior__pastilla.es-oculta,
.lateral__pastilla.es-oculta {
  opacity: 0;
}

.inferior__enlace {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: calc(var(--alto-barra-inferior) - 12px);
  color: var(--texto-tenue);
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    color var(--dur-media) ease,
    transform var(--dur-toque) var(--curva-salida);
}

.inferior__enlace:active {
  transform: scale(0.92);
}

.inferior__enlace.es-activa {
  color: var(--principal-fuerte);
}

.inferior__texto {
  transition: transform var(--dur-media) var(--curva-salida);
}

.lateral {
  display: none;
}

@media (max-width: 380px) {
  .superior__panel {
    display: none;
  }
}

/* ---------- Computadora: barra lateral ---------- */
@media (min-width: 1024px) {
  .inferior {
    display: none;
  }

  .armazon {
    display: grid;
    grid-template-columns: var(--ancho-lateral) minmax(0, 1fr);
  }

  .superior {
    padding: var(--e-3) var(--e-8);
  }

  .superior__marca,
  .superior__panel,
  .superior__cuenta {
    display: none;
  }

  .superior__colegio {
    display: inline-flex;
    align-items: center;
    gap: var(--e-2);
    font-size: var(--txt-sm);
    font-weight: var(--peso-semi);
    color: var(--texto-tenue);
  }

  .superior__colegio strong {
    color: var(--texto);
  }

  .superior__punto {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--degradado-marca);
  }

  .superior__separador {
    color: var(--borde-fuerte);
  }

  .titulo-enter-active,
  .titulo-leave-active {
    transition:
      opacity calc(200ms * var(--mov)) ease,
      transform calc(260ms * var(--mov)) var(--curva-salida);
  }

  .titulo-enter-from {
    opacity: 0;
    transform: translateY(6px);
  }

  .titulo-leave-to {
    opacity: 0;
    transform: translateY(-6px);
  }

  .aviso-franja {
    padding-inline: var(--e-8);
  }

  .lateral {
    position: sticky;
    top: 0;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: var(--e-4);
    padding: var(--e-5) var(--e-4) var(--e-4);
    background: var(--fondo-elevado);
    border-right: 1px solid var(--borde);
    overflow-y: auto;
  }

  .lateral__marca {
    display: flex;
    align-items: center;
    gap: var(--e-3);
    padding: var(--e-1) var(--e-2) var(--e-4);
    border-bottom: 1px solid var(--borde-sutil);
    text-decoration: none;
  }

  .lateral__marca-textos {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lateral__colegio {
    font-size: var(--txt-xs);
    color: var(--texto-tenue);
    font-weight: var(--peso-semi);
  }

  .lateral__grupo {
    padding: 0 var(--e-3) var(--e-2);
    font-size: var(--txt-xs);
    font-weight: var(--peso-semi);
    color: var(--texto-tenue);
  }

  .lateral__lista {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lateral__lista--secciones {
    --alto-enlace: var(--objetivo-tactil);
  }

  .lateral__pastilla {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: var(--alto-enlace);
    border-radius: var(--radio-md);
    background: var(--principal-suave);
    transform: translateY(calc(var(--indice) * (var(--alto-enlace) + 4px)));
    transition:
      transform calc(420ms * var(--mov)) var(--curva),
      opacity var(--dur-media) ease;
  }

  .lateral__pastilla::before {
    content: '';
    position: absolute;
    left: 0;
    top: 22%;
    bottom: 22%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--principal);
  }

  .lateral__lista--abajo {
    margin-top: auto;
  }

  .lateral__enlace {
    position: relative;
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
      background-color var(--dur-rapida) ease,
      color var(--dur-media) ease,
      transform var(--dur-toque) var(--curva-salida);
  }

  .lateral__lista--secciones .lateral__enlace {
    height: var(--alto-enlace);
  }

  .lateral__enlace:active {
    transform: scale(0.98);
  }

  .lateral__enlace:hover {
    color: var(--texto);
  }

  .lateral__lista--abajo .lateral__enlace:hover {
    background: var(--superficie-hover);
  }

  .lateral__lista--secciones .lateral__enlace svg {
    transition: transform var(--dur-media) var(--curva-salida);
  }

  .lateral__lista--secciones .lateral__enlace:hover svg {
    transform: translateX(2px);
  }

  .lateral__enlace.es-activa {
    color: var(--principal-fuerte);
  }

  .lateral__lista--abajo .lateral__enlace.es-activa {
    background: var(--principal-suave);
  }

  .lateral__enlace--panel {
    background: var(--marca);
    color: #ffffff;
    box-shadow: var(--sombra-2);
  }

  :root[data-tema='oscuro'] .lateral__enlace--panel {
    color: var(--gris-950);
  }

  .lateral__lista--abajo .lateral__enlace--panel:hover {
    background: var(--marca);
    color: #ffffff;
    filter: brightness(1.12);
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
    padding-top: var(--e-3);
    border-top: 1px solid var(--borde-sutil);
  }

  .contenido {
    padding-bottom: var(--e-12);
  }
}
</style>
