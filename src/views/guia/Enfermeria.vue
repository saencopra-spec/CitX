<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  HeartPulse,
  MapPin,
  Clock,
  Phone,
  Siren,
  Stethoscope,
  Info,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import { api } from '@/lib/api'
import { estadoEnfermeria, HORARIO_ENFERMERIA } from '@compartido/enfermeria.js'
import { horaLegible } from '@compartido/hora.js'

const datos = ref(null)
const ahora = ref(new Date())
let reloj = null

const horario = computed(() => ({
  abre: datos.value?.abre ?? HORARIO_ENFERMERIA.abre,
  cierra: datos.value?.cierra ?? HORARIO_ENFERMERIA.cierra,
}))

const estado = computed(() => estadoEnfermeria(ahora.value, horario.value))

onMounted(async () => {
  reloj = setInterval(() => (ahora.value = new Date()), 30000)
  try {
    datos.value = (await api.get('/enfermeria')).enfermeria
  } catch {
    datos.value = null
  }
})

onUnmounted(() => clearInterval(reloj))
</script>

<template>
  <div class="pagina enfermeria">
    <EncabezadoPagina
      titulo="Enfermería"
      bajada="Atención de salud dentro del colegio."
      :volver="{ name: 'guia' }"
    />

    <div class="distribucion">
      <section
        class="estado"
        :class="estado.abierta ? 'es-abierta' : 'es-cerrada'"
        aria-live="polite"
      >
        <HeartPulse :size="30" aria-hidden="true" />
        <div>
          <p class="estado__titulo">
            {{ estado.abierta ? 'Abierta ahora' : 'Cerrada ahora' }}
          </p>
          <p class="estado__detalle">{{ estado.mensaje }}</p>
        </div>
      </section>

      <section class="datos" aria-label="Horario y ubicación">
        <p>
          <Clock :size="18" aria-hidden="true" /> Lunes a viernes, de
          {{ horaLegible(horario.abre) }} a {{ horaLegible(horario.cierra) }}
        </p>
        <p>
          <MapPin :size="18" aria-hidden="true" />
          <RouterLink :to="{ name: 'mapa', query: { lugar: 'enfermeria' } }"
            >Ver la enfermería en el mapa</RouterLink
          >
        </p>
        <p v-if="datos?.extension">
          <Phone :size="18" aria-hidden="true" /> {{ datos.extension }}
        </p>
      </section>

      <section class="emergencia" aria-labelledby="t-emergencia">
        <h2 id="t-emergencia" class="subtitulo">
          <Siren :size="22" aria-hidden="true" /> En caso de emergencia
        </h2>
        <ol class="pasos">
          <li v-for="(p, i) in datos?.emergencia ?? []" :key="i">{{ p }}</li>
        </ol>
        <a href="tel:911" class="boton boton--peligro boton--grande llamar">
          <Phone :size="20" aria-hidden="true" /> Llamar al 9-1-1
        </a>
      </section>

      <section class="servicios" aria-labelledby="t-servicios">
        <h2 id="t-servicios" class="subtitulo">
          <Stethoscope :size="22" aria-hidden="true" /> Qué ofrece
        </h2>
        <ul>
          <li v-for="(s, i) in datos?.servicios ?? []" :key="i">{{ s }}</li>
        </ul>
        <div v-if="datos?.avisos?.length" class="avisos">
          <p v-for="(a, i) in datos.avisos" :key="i" class="nota">
            <Info :size="18" aria-hidden="true" /><span>{{ a }}</span>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.distribucion {
  display: grid;
  gap: var(--e-4);
  max-width: 60rem;
}

.estado {
  display: flex;
  align-items: center;
  gap: var(--e-4);
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  border: 2px solid var(--borde);
  background: var(--superficie);
}

.es-abierta {
  border-color: var(--exito);
  background: var(--exito-fondo);
}

.es-abierta svg {
  color: var(--exito);
}

.es-cerrada svg {
  color: var(--texto-tenue);
}

.estado__titulo {
  font-size: var(--txt-xl);
  font-weight: var(--peso-extra);
}

.es-abierta .estado__titulo {
  color: var(--exito);
}

.estado__detalle {
  color: var(--texto-suave);
}

.datos {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.datos p {
  display: flex;
  align-items: center;
  gap: var(--e-3);
}

.datos svg {
  flex-shrink: 0;
  color: var(--accion);
}

.emergencia,
.servicios {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.emergencia {
  border-top: 5px solid var(--error);
}

.subtitulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}

.emergencia .subtitulo svg {
  color: var(--error);
}

.pasos {
  counter-reset: paso;
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.pasos li {
  counter-increment: paso;
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: var(--e-2);
  line-height: var(--alto-normal);
}

.pasos li::before {
  content: counter(paso);
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--error-fondo);
  color: var(--error);
  font-weight: var(--peso-fuerte);
  font-size: var(--txt-sm);
}

.llamar {
  align-self: flex-start;
}

.servicios ul {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.servicios li {
  padding-left: var(--e-5);
  position: relative;
}

.servicios li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 0.6em;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--principal);
}

.avisos {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

@media (min-width: 768px) {
  .distribucion {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
