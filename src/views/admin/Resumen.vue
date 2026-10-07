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
  TicketCheck,
  ArrowRight,
  Trophy,
  ChartColumn,
} from 'lucide-vue-next'
import EncabezadoPanel from '@/components/estructura/EncabezadoPanel.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import { api } from '@/lib/api'
import { usarSondeo } from '@/lib/sondeo'
import { useAuth } from '@/stores/auth'
import { colones } from '@compartido/dinero.js'
import { NOMBRE_ROL } from '@compartido/permisos.js'
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
    <div class="bienvenida">
      <EscudoCit :tamano="56" alternativo="" />
      <EncabezadoPanel
        :titulo="`${saludoSegunHora()}, ${auth.nombreCorto}`"
        :ayuda="`Así va el día: ${hoy}. Los números se actualizan solos.`"
      />
    </div>

    <p v-if="error" class="nota nota--aviso">{{ error }}</p>

    <div class="cifras" :aria-busy="!datos">
      <template v-if="datos?.soda">
        <RouterLink
          v-if="auth.puede('pedidos.gestionar')"
          :to="{ name: 'admin-pedidos' }"
          class="cifra cifra--principal"
        >
          <ClipboardList :size="22" aria-hidden="true" />
          <span class="cifra__numero">{{ datos.soda.pendientes }}</span>
          <span class="cifra__texto">pedidos sin entregar</span>
          <span class="cifra__ir"
            >Abrir tablero <ArrowRight :size="16" aria-hidden="true"
          /></span>
        </RouterLink>
        <div class="cifra">
          <Clock :size="22" aria-hidden="true" />
          <span class="cifra__numero">{{ datos.soda.pedidosHoy }}</span>
          <span class="cifra__texto">pedidos hechos hoy</span>
        </div>
        <RouterLink
          v-if="auth.puede('reportes.ver')"
          :to="{ name: 'admin-reportes' }"
          class="cifra"
        >
          <Wallet :size="22" aria-hidden="true" />
          <span class="cifra__numero cifra__numero--dinero">{{
            colones(datos.soda.vendidoHoy)
          }}</span>
          <span class="cifra__texto">vendido hoy</span>
          <span class="cifra__ir"
            >Ver reportes <ArrowRight :size="16" aria-hidden="true"
          /></span>
        </RouterLink>
      </template>
      <RouterLink
        v-if="datos && datos.solicitudesPendientes !== undefined"
        :to="{ name: 'admin-objetos' }"
        class="cifra"
        :class="{ 'cifra--alerta': datos.solicitudesPendientes }"
      >
        <PackageSearch :size="22" aria-hidden="true" />
        <span class="cifra__numero">{{ datos.solicitudesPendientes }}</span>
        <span class="cifra__texto"
          >solicitudes de objetos perdidos por revisar</span
        >
      </RouterLink>
      <RouterLink
        v-if="datos?.personas"
        :to="{ name: 'admin-usuarios' }"
        class="cifra"
      >
        <Users :size="22" aria-hidden="true" />
        <span class="cifra__numero">{{ datos.personas.total }}</span>
        <span class="cifra__texto">cuentas registradas</span>
      </RouterLink>
      <RouterLink
        v-if="datos?.personas"
        :to="{ name: 'admin-invitaciones' }"
        class="cifra"
      >
        <TicketCheck :size="22" aria-hidden="true" />
        <span class="cifra__numero">{{
          datos.personas.invitacionesActivas
        }}</span>
        <span class="cifra__texto">invitaciones sin usar</span>
      </RouterLink>
    </div>

    <div class="bloques">
      <section
        v-if="datos?.soda?.masVendidosHoy?.length"
        class="bloque"
        aria-labelledby="t-top"
      >
        <div class="bloque__encabezado">
          <h2 id="t-top" class="subtitulo">
            <Trophy :size="20" aria-hidden="true" /> Lo más pedido hoy
          </h2>
          <RouterLink
            v-if="auth.puede('reportes.ver')"
            :to="{ name: 'admin-reportes' }"
            class="boton boton--texto boton--pequeno"
          >
            <ChartColumn :size="16" aria-hidden="true" /> Reportes
          </RouterLink>
        </div>
        <ol class="top">
          <li v-for="(t, i) in datos.soda.masVendidosHoy" :key="t.nombre">
            <span class="top__lugar">{{ i + 1 }}</span>
            <span class="top__nombre">{{ t.nombre }}</span>
            <span class="top__unidades">{{ t.unidades }} unid.</span>
          </li>
        </ol>
      </section>

      <section class="bloque" aria-labelledby="t-eventos">
        <div class="bloque__encabezado">
          <h2 id="t-eventos" class="subtitulo">
            <CalendarDays :size="20" aria-hidden="true" /> Próximos eventos
          </h2>
          <RouterLink
            v-if="auth.puede('eventos.gestionarTodos')"
            :to="{ name: 'admin-eventos' }"
            class="boton boton--texto boton--pequeno"
          >
            Ver todos
          </RouterLink>
        </div>
        <ul v-if="datos?.proximosEventos?.length" class="lista">
          <li v-for="e in datos.proximosEventos" :key="e.id">
            <strong>{{ e.titulo }}</strong>
            <span
              >{{ fechaRelativa(e.inicio) }}, {{ horaLegible(e.hora) }}</span
            >
          </li>
        </ul>
        <p v-else class="texto-suave">No hay eventos próximos.</p>
      </section>

      <section
        v-if="datos?.personas"
        class="bloque"
        aria-labelledby="t-cuentas"
      >
        <div class="bloque__encabezado">
          <h2 id="t-cuentas" class="subtitulo">
            <Users :size="20" aria-hidden="true" /> Cuentas por tipo
          </h2>
        </div>
        <ul class="roles">
          <li v-for="(n, rol) in datos.personas.porRol" :key="rol">
            <span>{{ NOMBRE_ROL[rol] ?? rol }}</span>
            <strong>{{ n }}</strong>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.bienvenida {
  display: flex;
  align-items: center;
  gap: var(--e-4);
}

.bienvenida > :last-child {
  flex: 1;
  min-width: 0;
}

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

.lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.lista li {
  display: flex;
  flex-direction: column;
}

.lista span {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.lista .lista__meta {
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
}

.top {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.top li {
  display: flex;
  align-items: center;
  gap: var(--e-3);
}

.top__lugar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--aviso-fondo);
  color: var(--aviso);
  font-weight: var(--peso-extra);
}

.top__nombre {
  flex: 1;
  font-weight: var(--peso-semi);
}

.top__unidades {
  color: var(--texto-suave);
  font-variant-numeric: tabular-nums;
}

.roles {
  display: grid;
  gap: var(--e-2);
}

.roles li {
  display: flex;
  justify-content: space-between;
  padding-bottom: var(--e-2);
  border-bottom: 1px solid var(--borde-sutil);
}

@media (min-width: 1024px) {
  .bloques {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
