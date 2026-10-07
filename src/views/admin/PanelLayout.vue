<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  CalendarDays,
  Map as IconoMapa,
  PackageSearch,
  CalendarClock,
  HeartPulse,
  Users,
  ArrowLeft,
  LogOut,
  Settings,
} from 'lucide-vue-next'
import LogoCitx from '@/components/LogoCitx.vue'
import { useAuth } from '@/stores/auth'
import { useConfirmar } from '@/stores/confirmar'

defineOptions({ inheritAttrs: false })

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const confirmar = useConfirmar()

const enlaces = [
  {
    nombre: 'admin-resumen',
    texto: 'Resumen',
    icono: LayoutDashboard,
    roles: ['admin', 'soda'],
  },
  {
    nombre: 'admin-pedidos',
    texto: 'Pedidos',
    icono: ClipboardList,
    roles: ['admin', 'soda'],
  },
  {
    nombre: 'admin-menu',
    texto: 'Menú de la soda',
    icono: UtensilsCrossed,
    roles: ['admin', 'soda'],
  },
  {
    nombre: 'admin-eventos',
    texto: 'Eventos',
    icono: CalendarDays,
    roles: ['admin'],
  },
  {
    nombre: 'admin-lugares',
    texto: 'Lugares del mapa',
    icono: IconoMapa,
    roles: ['admin'],
  },
  {
    nombre: 'admin-objetos',
    texto: 'Objetos perdidos',
    icono: PackageSearch,
    roles: ['admin'],
  },
  {
    nombre: 'admin-horarios',
    texto: 'Horarios',
    icono: CalendarClock,
    roles: ['admin'],
  },
  {
    nombre: 'admin-enfermeria',
    texto: 'Enfermería',
    icono: HeartPulse,
    roles: ['admin'],
  },
  {
    nombre: 'admin-usuarios',
    texto: 'Usuarios',
    icono: Users,
    roles: ['admin'],
  },
]

const visibles = computed(() =>
  enlaces.filter((e) => e.roles.includes(auth.usuario?.rol))
)

async function salir() {
  const si = await confirmar.preguntar({
    titulo: '¿Cerrar sesión?',
    mensaje:
      'Para volver a entrar al panel vas a necesitar el correo y la contraseña.',
    aceptar: 'Cerrar sesión',
    peligro: false,
  })
  if (!si) return
  await auth.salir()
  router.replace({ name: 'entrar' })
}
</script>

<template>
  <div class="panel">
    <aside class="lateral" aria-label="Secciones del panel">
      <div class="lateral__marca">
        <LogoCitx
          :tamano="34"
          con-nombre
          direccion="horizontal"
          alternativo=""
        />
        <span class="lateral__etiqueta">Panel</span>
      </div>
      <nav class="lateral__nav">
        <RouterLink
          v-for="e in visibles"
          :key="e.nombre"
          :to="{ name: e.nombre }"
          class="enlace"
          :class="{ 'es-activo': route.name === e.nombre }"
          :aria-current="route.name === e.nombre ? 'page' : undefined"
        >
          <component :is="e.icono" :size="20" aria-hidden="true" />
          <span>{{ e.texto }}</span>
        </RouterLink>
      </nav>
      <div class="lateral__pie">
        <p class="usuario">
          <strong>{{ auth.usuario?.nombre }}</strong>
          <span>{{ auth.nombreRol }}</span>
        </p>
        <RouterLink
          v-if="!auth.esPersonalSoda"
          :to="{ name: 'menu' }"
          class="enlace"
        >
          <ArrowLeft :size="20" aria-hidden="true" />
          <span>Volver a la app</span>
        </RouterLink>
        <RouterLink :to="{ name: 'configuracion' }" class="enlace">
          <Settings :size="20" aria-hidden="true" /> <span>Configuración</span>
        </RouterLink>
        <button type="button" class="enlace" @click="salir">
          <LogOut :size="20" aria-hidden="true" /> <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <main id="contenido" class="contenido">
      <RouterView v-slot="{ Component }">
        <Transition name="pagina" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.panel {
  min-height: 100dvh;
  background: var(--fondo);
}

.lateral {
  position: sticky;
  top: 0;
  z-index: var(--z-barra);
  display: flex;
  flex-direction: column;
  background: var(--marino-800);
  color: #ffffff;
  padding-top: env(safe-area-inset-top);
}

.lateral__marca {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  padding: var(--e-3) var(--margen-lateral);
}

.lateral__marca :deep(.marca__nombre) {
  color: #ffffff;
}

.lateral__etiqueta {
  padding: 2px var(--e-2);
  border-radius: var(--radio-xs);
  background: rgba(255, 255, 255, 0.14);
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
}

.lateral__nav {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding: 0 var(--e-2) var(--e-2);
  scrollbar-width: none;
}

.lateral__nav::-webkit-scrollbar {
  display: none;
}

.enlace {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  min-height: var(--objetivo-tactil);
  padding: 0 var(--e-3);
  border-radius: var(--radio-sm);
  color: var(--marino-100);
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  text-align: left;
}

.enlace:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.enlace.es-activo {
  background: #ffffff;
  color: var(--marino-800);
}

.lateral__pie {
  display: none;
}

.contenido {
  min-width: 0;
  padding: 0 var(--margen-lateral) var(--e-12);
}

@media (min-width: 1024px) {
  .panel {
    display: grid;
    grid-template-columns: 15.5rem minmax(0, 1fr);
  }

  .lateral {
    height: 100dvh;
    padding: var(--e-5) var(--e-3);
    gap: var(--e-5);
    overflow-y: auto;
  }

  .lateral__marca {
    padding: 0 var(--e-2);
  }

  .lateral__nav {
    flex-direction: column;
    overflow: visible;
    padding: 0;
  }

  .enlace {
    width: 100%;
    font-size: var(--txt-base);
  }

  .lateral__pie {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  .usuario {
    display: flex;
    flex-direction: column;
    padding: var(--e-3);
    margin-bottom: var(--e-2);
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    font-size: var(--txt-sm);
  }

  .usuario span {
    color: var(--marino-200);
  }

  .contenido {
    padding-inline: var(--e-8);
  }
}

@media (max-width: 1023px) {
  .lateral__nav::after {
    content: '';
    flex: 0 0 var(--e-2);
  }
}
</style>
