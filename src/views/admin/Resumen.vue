<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ClipboardList,
  Clock,
  Wallet,
  PackageSearch,
  CalendarDays,
  Users,
  ArrowRight,
} from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import { api } from '@/lib/api'
import { usarSondeo } from '@/lib/sondeo'
import { useAuth } from '@/stores/auth'
import { colones } from '@compartido/dinero.js'
import {
  fechaRelativa,
  horaLegible,
  fechaLarga,
  saludoSegunHora,
} from '@compartido/hora.js'

const auth = useAuth()
const datos = ref(null)
const error = ref('')

usarSondeo(async () => {
  try {
    datos.value = await api.get('/resumen')
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}, 15000)

const hoy = fechaLarga(new Date())
</script>

<template>
  <div>
    <EncabezadoPanel
      :titulo="`${saludoSegunHora()}, ${auth.nombreCorto}`"
      :ayuda="`Así va el día: ${hoy}. Los números se actualizan solos.`"
    />

    <p v-if="error" class="nota nota--aviso">{{ error }}</p>

    <div class="cifras" :aria-busy="!datos">
      <RouterLink
        :to="{ name: 'admin-pedidos' }"
        class="cifra cifra--principal"
      >
        <ClipboardList :size="22" aria-hidden="true" />
        <span class="cifra__numero">{{ datos?.pendientes ?? '–' }}</span>
        <span class="cifra__texto">pedidos sin entregar</span>
        <span class="cifra__ir"
          >Abrir tablero <ArrowRight :size="16" aria-hidden="true"
        /></span>
      </RouterLink>
      <div class="cifra">
        <Clock :size="22" aria-hidden="true" />
        <span class="cifra__numero">{{ datos?.pedidosHoy ?? '–' }}</span>
        <span class="cifra__texto">pedidos para hoy</span>
      </div>
      <div class="cifra">
        <Wallet :size="22" aria-hidden="true" />
        <span class="cifra__numero cifra__numero--dinero">{{
          datos ? colones(datos.vendidoHoy) : '–'
        }}</span>
        <span class="cifra__texto">vendido hoy (simulado)</span>
      </div>
      <RouterLink
        v-if="auth.esAdmin"
        :to="{ name: 'admin-objetos' }"
        class="cifra"
        :class="{ 'cifra--alerta': datos?.solicitudesPendientes }"
      >
        <PackageSearch :size="22" aria-hidden="true" />
        <span class="cifra__numero">{{
          datos?.solicitudesPendientes ?? '–'
        }}</span>
        <span class="cifra__texto"
          >solicitudes de objetos perdidos por revisar</span
        >
      </RouterLink>
    </div>

    <div v-if="auth.esAdmin" class="bloques">
      <section class="bloque" aria-labelledby="t-eventos">
        <div class="bloque__encabezado">
          <h2 id="t-eventos" class="subtitulo">
            <CalendarDays :size="20" aria-hidden="true" /> Próximos eventos
          </h2>
          <RouterLink
            :to="{ name: 'admin-eventos' }"
            class="boton boton--texto boton--pequeno"
            >Ver todos</RouterLink
          >
        </div>
        <ul v-if="datos?.proximosEventos?.length" class="eventos">
          <li v-for="e in datos.proximosEventos" :key="e.id">
            <strong>{{ e.titulo }}</strong>
            <span
              >{{ fechaRelativa(e.inicio) }}, {{ horaLegible(e.hora) }}</span
            >
          </li>
        </ul>
        <p v-else class="texto-suave">No hay eventos próximos.</p>
      </section>
      <section class="bloque" aria-labelledby="t-usuarios">
        <div class="bloque__encabezado">
          <h2 id="t-usuarios" class="subtitulo">
            <Users :size="20" aria-hidden="true" /> Cuentas
          </h2>
          <RouterLink
            :to="{ name: 'admin-usuarios' }"
            class="boton boton--texto boton--pequeno"
            >Administrar</RouterLink
          >
        </div>
        <p class="bloque__grande">{{ datos?.usuarios ?? '–' }}</p>
        <p class="texto-suave">personas registradas en CitX</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cifras {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(13rem, 100%), 1fr));
  gap: var(--e-3);
}

.cifra {
  display: flex;
  flex-direction: column;
  gap: var(--e-1);
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
  color: var(--texto);
  text-decoration: none;
}

.cifra svg {
  color: var(--texto-tenue);
}

a.cifra:hover {
  box-shadow: var(--sombra-2);
  color: var(--texto);
}

.cifra--principal {
  background: var(--marca);
  border-color: var(--marca);
  color: #ffffff;
}

:root[data-tema='oscuro'] .cifra--principal {
  color: var(--gris-950);
}

.cifra--principal svg,
.cifra--principal .cifra__texto {
  color: inherit;
  opacity: 0.85;
}

a.cifra--principal:hover {
  color: #ffffff;
}

.cifra--alerta {
  border: 2px solid var(--aviso);
}

.cifra__numero {
  font-size: 2.5rem;
  font-weight: var(--peso-extra);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.cifra__numero--dinero {
  font-size: var(--txt-2xl);
  padding-block: 0.35rem;
}

.cifra__texto {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.cifra__ir {
  display: inline-flex;
  align-items: center;
  gap: var(--e-1);
  margin-top: var(--e-2);
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
}

.bloques {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--e-3);
  margin-top: var(--e-5);
}

.bloque {
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.bloque__encabezado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
  margin-bottom: var(--e-3);
}

.bloque__encabezado .subtitulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}

.eventos {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.eventos li {
  display: flex;
  flex-direction: column;
}

.eventos span {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.bloque__grande {
  font-size: 2.5rem;
  font-weight: var(--peso-extra);
}

@media (min-width: 1024px) {
  .bloques {
    grid-template-columns: 2fr 1fr;
  }
}
</style>
