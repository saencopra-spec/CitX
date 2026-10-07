<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  BellOff,
  CalendarDays,
  ShoppingBag,
  ListChecks,
  PackageSearch,
  Bell,
  CheckCheck,
  MapPin,
  Megaphone,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import EstadoVacio from '@/components/avisos/EstadoVacio.vue'
import { useNotificaciones } from '@/stores/notificaciones'
import { useLugares } from '@/stores/lugares'
import { fechaRelativa, horaDe } from '@compartido/hora.js'

const notificaciones = useNotificaciones()
const router = useRouter()
const lugares = useLugares()
lugares.cargar()
const cargando = ref(!notificaciones.cargado)

const iconos = {
  evento: CalendarDays,
  pedido: ShoppingBag,
  recordatorio: ListChecks,
  objeto: PackageSearch,
  anuncio: Megaphone,
  general: Bell,
}

async function abrir(n) {
  await notificaciones.marcarLeida(n.id)
  if (n.enlace) router.push(n.enlace)
}

onMounted(async () => {
  try {
    await notificaciones.cargar({ avisarNuevas: false })
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <div class="pagina notificaciones">
    <EncabezadoPagina
      titulo="Avisos"
      bajada="Avisos de tus pedidos, eventos nuevos y recordatorios."
      :volver="{ name: 'menu' }"
    >
      <template #acciones>
        <button
          v-if="notificaciones.sinLeer"
          type="button"
          class="boton boton--texto boton--pequeno"
          @click="notificaciones.marcarTodas()"
        >
          <CheckCheck :size="18" aria-hidden="true" />
          Marcar todo como leído
        </button>
      </template>
    </EncabezadoPagina>

    <ul
      v-if="cargando"
      class="lista"
      aria-busy="true"
      aria-label="Cargando notificaciones"
    >
      <li v-for="n in 4" :key="n" class="esqueleto" style="height: 72px" />
    </ul>

    <EstadoVacio
      v-else-if="!notificaciones.lista.length"
      :icono="BellOff"
      titulo="No tenés notificaciones"
      texto="Aquí vas a ver cuando tu pedido esté listo o cuando publiquen un evento para tu sección."
    />

    <ul v-else class="lista">
      <li v-for="n in notificaciones.lista" :key="n.id">
        <button
          type="button"
          class="aviso"
          :class="{ 'es-nueva': !n.leida }"
          @click="abrir(n)"
        >
          <span class="aviso__icono" aria-hidden="true">
            <component :is="iconos[n.tipo] ?? Bell" :size="20" />
          </span>
          <span class="aviso__textos">
            <strong>{{ n.titulo }}</strong>
            <span>{{ n.cuerpo }}</span>
            <time :datetime="n.creadoEn"
              >{{ fechaRelativa(n.creadoEn) }}, {{ horaDe(n.creadoEn) }}</time
            >
          </span>
          <span v-if="!n.leida" class="aviso__nueva">Nueva</span>
        </button>
        <RouterLink
          v-if="n.lugarClave"
          :to="{ name: 'mapa', query: { lugar: n.lugarClave } }"
          class="boton boton--texto boton--pequeno aviso__mapa"
          @click="notificaciones.marcarLeida(n.id)"
        >
          <MapPin :size="16" aria-hidden="true" /> Ver en el mapa{{
            lugares.nombreDe(n.lugarClave)
              ? `: ${lugares.nombreDe(n.lugarClave)}`
              : ''
          }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  max-width: 44rem;
}

.aviso {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: var(--e-3);
  padding: var(--e-4);
  border-radius: var(--radio-md);
  background: var(--superficie);
  border: 1px solid var(--borde);
  text-align: left;
  transition: background-color var(--dur-rapida) var(--curva-suave);
}

.aviso:hover {
  background: var(--superficie-hover);
}

.aviso.es-nueva {
  border-left: 4px solid var(--principal);
}

.aviso__icono {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radio-sm);
  background: var(--superficie-3);
  color: var(--texto-suave);
}

.es-nueva .aviso__icono {
  background: var(--principal-suave);
  color: var(--principal-fuerte);
}

.aviso__textos {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.aviso__textos span {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.aviso__textos time {
  color: var(--texto-tenue);
  font-size: var(--txt-xs);
}

.aviso__nueva {
  flex-shrink: 0;
  font-size: var(--txt-xs);
  font-weight: var(--peso-fuerte);
  color: var(--principal-fuerte);
}
.aviso__mapa {
  margin: 2px 0 var(--e-2) calc(36px + var(--e-6));
}
</style>
