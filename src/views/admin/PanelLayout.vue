<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  ClipboardList,
  ChartColumn,
  UtensilsCrossed,
  Megaphone,
  CalendarDays,
  Map as IconoMapa,
  PackageSearch,
  CalendarClock,
  HeartPulse,
  Users,
  TicketCheck,
  ScrollText,
  ArrowLeft,
  LogOut,
  Settings,
} from 'lucide-vue-next'
import LogoCitx from '@/components/marca/LogoCitx.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import CampanaAvisos from '@/components/avisos/CampanaAvisos.vue'
import { useAuth } from '@/stores/auth'
import { useNotificaciones } from '@/stores/notificaciones'
import { useConfirmar } from '@/stores/confirmar'
import { usarSondeo } from '@/lib/sondeo'

defineOptions({ inheritAttrs: false })

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const confirmar = useConfirmar()
const notificaciones = useNotificaciones()

const grupos = [
  {
    titulo: 'Día a día',
    enlaces: [
      {
        nombre: 'admin-resumen',
        texto: 'Resumen',
        icono: LayoutDashboard,
        permiso: 'panel.entrar',
      },
      {
        nombre: 'admin-pedidos',
        texto: 'Pedidos',
        icono: ClipboardList,
        permiso: 'pedidos.gestionar',
      },
      {
        nombre: 'admin-reportes',
        texto: 'Reportes de la soda',
        icono: ChartColumn,
        permiso: 'reportes.ver',
      },
      {
        nombre: 'admin-menu',
        texto: 'Menú de la soda',
        icono: UtensilsCrossed,
        permiso: 'productos.gestionar',
      },
    ],
  },
  {
    titulo: 'Comunicación',
    enlaces: [
      {
        nombre: 'admin-anuncios',
        texto: 'Anuncios',
        icono: Megaphone,
        permiso: 'anuncios.publicar',
      },
      {
        nombre: 'admin-eventos',
        texto: 'Eventos',
        icono: CalendarDays,
        permiso: 'eventos.gestionarTodos',
      },
    ],
  },
  {
    titulo: 'Colegio',
    enlaces: [
      {
        nombre: 'admin-lugares',
        texto: 'Lugares del mapa',
        icono: IconoMapa,
        permiso: 'lugares.editar',
      },
      {
        nombre: 'admin-objetos',
        texto: 'Objetos perdidos',
        icono: PackageSearch,
        permiso: 'objetos.gestionar',
      },
      {
        nombre: 'admin-horarios',
        texto: 'Horarios',
        icono: CalendarClock,
        permiso: 'horarios.editar',
      },
      {
        nombre: 'admin-enfermeria',
        texto: 'Enfermería',
        icono: HeartPulse,
        permiso: 'enfermeria.editar',
      },
    ],
  },
  {
    titulo: 'Personas y seguridad',
    enlaces: [
      {
        nombre: 'admin-usuarios',
        texto: 'Usuarios y permisos',
        icono: Users,
        permiso: 'usuarios.gestionar',
      },
      {
        nombre: 'admin-invitaciones',
        texto: 'Invitaciones',
        icono: TicketCheck,
        permiso: 'usuarios.gestionar',
      },
      {
        nombre: 'admin-bitacora',
        texto: 'Bitácora',
        icono: ScrollText,
        permiso: 'bitacora.ver',
      },
    ],
  },
]

const visibles = computed(() =>
  grupos
    .map((g) => ({
      ...g,
      enlaces: g.enlaces.filter(
        (e) =>
          auth.puede(e.permiso) &&
          !(e.nombre === 'admin-resumen' && auth.usuario?.rol === 'objetos')
      ),
    }))
    .filter((g) => g.enlaces.length)
)

usarSondeo(() => notificaciones.cargar(), 30000)

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
        <EscudoCit :tamano="44" alternativo="" />
        <div class="lateral__nombres">
          <LogoCitx
            :tamano="26"
            con-nombre
            direccion="horizontal"
            alternativo=""
          />
          <span class="lateral__etiqueta">Panel de administración</span>
        </div>
        <div class="lateral__campana">
          <CampanaAvisos />
        </div>
      </div>
      <nav class="lateral__nav">
        <div v-for="g in visibles" :key="g.titulo" class="grupo">
          <p class="grupo__titulo">{{ g.titulo }}</p>
          <RouterLink
            v-for="e in g.enlaces"
            :key="e.nombre"
            :to="{ name: e.nombre }"
            class="enlace"
            :class="{ 'es-activo': route.name === e.nombre }"
            :aria-current="route.name === e.nombre ? 'page' : undefined"
          >
            <component :is="e.icono" :size="20" aria-hidden="true" />
            <span>{{ e.texto }}</span>
          </RouterLink>
        </div>
      </nav>
      <div class="lateral__pie">
        <p class="usuario">
          <strong>{{ auth.usuario?.nombre }}</strong>
          <span>{{ auth.nombreRol }}</span>
        </p>
        <RouterLink
          v-if="!auth.soloPanel"
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
  padding: var(--e-2) var(--e-2) var(--e-2) var(--margen-lateral);
}

.lateral__nombres {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.lateral__marca :deep(.marca__nombre) {
  color: #ffffff;
}

.lateral__etiqueta {
  font-size: var(--txt-xs);
  color: var(--marino-100);
  font-weight: var(--peso-semi);
}

.lateral__campana :deep(.campana__boton) {
  color: #ffffff;
}

.lateral__campana :deep(.campana__boton:hover) {
  background: rgba(255, 255, 255, 0.12);
}

.lateral__campana :deep(.campana__cuenta) {
  border-color: var(--marino-800);
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

.grupo {
  display: contents;
}

.grupo__titulo {
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
    grid-template-columns: 16.5rem minmax(0, 1fr);
  }

  .lateral {
    height: 100dvh;
    padding: var(--e-5) var(--e-3);
    gap: var(--e-4);
    overflow-y: auto;
  }

  .lateral__marca {
    padding: 0 0 0 var(--e-2);
  }

  .lateral__nav {
    flex-direction: column;
    overflow: visible;
    padding: 0;
  }

  .grupo {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: var(--e-3);
  }

  .grupo__titulo {
    display: block;
    padding: var(--e-1) var(--e-3);
    font-size: var(--txt-xs);
    font-weight: var(--peso-semi);
    color: var(--marino-200);
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
