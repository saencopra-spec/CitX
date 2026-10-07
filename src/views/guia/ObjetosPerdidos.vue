<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  PackageSearch,
  MapPin,
  CalendarDays,
  Hand,
  Search,
  Settings2,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import EstadoVacio from '@/components/avisos/EstadoVacio.vue'
import FotoComida from '@/components/soda/FotoComida.vue'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Campo from '@/components/formularios/Campo.vue'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { usarErrores } from '@/lib/errores'
import { entradaEscalonada } from '@/lib/movimiento'
import { fechaIsoLegible } from '@compartido/hora.js'
import { coincide } from '@compartido/texto.js'

const auth = useAuth()
const avisos = useAvisos()
const { errores, limpiar, mostrar } = usarErrores()

const objetos = ref([])
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const reclamando = ref(null)
const mensaje = ref('')
const enviando = ref(false)
const lista = ref(null)

const visibles = computed(() =>
  objetos.value.filter((o) =>
    coincide(busqueda.value, o.titulo, o.descripcion, o.lugar)
  )
)

const textoSolicitud = {
  pendiente: 'Solicitud enviada. La administración la está revisando.',
  aprobada: 'Aprobada. Pasá a la dirección a retirarlo.',
  rechazada: 'Tu solicitud no fue aprobada.',
}

function abrir(o) {
  reclamando.value = o
  mensaje.value = ''
  limpiar()
}

async function enviar() {
  enviando.value = true
  try {
    await api.post(`/objetos/${reclamando.value.id}/reclamar`, {
      mensaje: mensaje.value,
    })
    reclamando.value.miSolicitud = 'pendiente'
    avisos.exito('Listo. Te avisamos cuando la administración responda.')
    reclamando.value = null
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    enviando.value = false
  }
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    objetos.value = (await api.get('/objetos')).objetos
    await nextTick()
    entradaEscalonada(lista.value)
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="pagina">
    <EncabezadoPagina
      titulo="Objetos perdidos"
      bajada="Lo que se ha encontrado en el colegio. Si algo es tuyo, tocá «Es mío» y contanos cómo reconocerlo."
      :volver="{ name: 'guia' }"
    >
      <template v-if="auth.puede('objetos.gestionar')" #acciones>
        <RouterLink
          to="/admin/objetos-perdidos"
          class="boton boton--contorno boton--pequeno"
        >
          <Settings2 :size="18" aria-hidden="true" /> Gestionar
        </RouterLink>
      </template>
    </EncabezadoPagina>

    <div class="buscador barra-busqueda">
      <Search :size="20" aria-hidden="true" />
      <label for="buscar-objeto" class="solo-lectores">Buscar objeto</label>
      <input
        id="buscar-objeto"
        v-model="busqueda"
        type="search"
        class="entrada"
        placeholder="Buscar: botella, mochila, audífonos..."
      />
    </div>

    <div v-if="cargando" class="objetos">
      <div
        v-for="n in 4"
        :key="n"
        class="esqueleto"
        style="height: 300px; border-radius: var(--radio-lg)"
      />
    </div>

    <EstadoVacio
      v-else-if="error"
      titulo="No pudimos cargar los objetos"
      :texto="error"
    >
      <button type="button" class="boton boton--accion" @click="cargar">
        Intentar de nuevo
      </button>
    </EstadoVacio>

    <EstadoVacio
      v-else-if="!visibles.length"
      :icono="PackageSearch"
      :titulo="
        busqueda
          ? 'No hay objetos que coincidan'
          : 'No hay objetos perdidos por ahora'
      "
      texto="Si perdiste algo, pasá a la dirección: a veces llegan cosas que todavía no se han publicado."
    />

    <ul v-else ref="lista" class="objetos">
      <li v-for="o in visibles" :key="o.id" data-entra class="objeto">
        <FotoComida
          :src="o.foto"
          :alt="`Foto de ${o.titulo}`"
          class="objeto__foto"
        />
        <div class="objeto__cuerpo">
          <h2 class="objeto__titulo">{{ o.titulo }}</h2>
          <p class="objeto__descripcion">{{ o.descripcion }}</p>
          <ul class="objeto__datos">
            <li>
              <MapPin :size="16" aria-hidden="true" /> Encontrado en:
              {{ o.lugar }}
            </li>
            <li>
              <CalendarDays :size="16" aria-hidden="true" />
              {{ fechaIsoLegible(o.encontradoEl) }}
            </li>
          </ul>
          <p
            v-if="o.miSolicitud"
            class="solicitud"
            :class="`solicitud--${o.miSolicitud}`"
          >
            {{ textoSolicitud[o.miSolicitud] }}
          </p>
          <button
            v-else
            type="button"
            class="boton boton--accion boton--ancho"
            @click="abrir(o)"
          >
            <Hand :size="18" aria-hidden="true" /> Es mío<span
              class="solo-lectores"
              >: {{ o.titulo }}</span
            >
          </button>
        </div>
      </li>
    </ul>

    <Dialogo
      :abierto="Boolean(reclamando)"
      :titulo="reclamando ? `¿${reclamando.titulo} es tuyo?` : ''"
      descripcion="Para entregarlo a la persona correcta, la administración necesita confirmar que es tuyo."
      @cerrar="reclamando = null"
    >
      <form id="form-reclamo" novalidate @submit.prevent="enviar">
        <Campo
          id="mensaje-reclamo"
          v-model="mensaje"
          tipo="textarea"
          etiqueta="¿Cómo lo reconocés?"
          placeholder="Por ejemplo: tiene mi nombre por dentro, un sticker de un gato, la funda está rota en una esquina."
          :maximo="300"
          :error="errores.mensaje"
        />
      </form>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="reclamando = null"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-reclamo"
          class="boton boton--accion"
          :disabled="enviando"
        >
          {{ enviando ? 'Enviando...' : 'Enviar solicitud' }}
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.barra-busqueda {
  max-width: 28rem;
  margin-bottom: var(--e-5);
}

.objetos {
  display: grid;
  gap: var(--e-4);
}

.objeto {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
}

.objeto__foto {
  aspect-ratio: 4 / 3;
}

.objeto__cuerpo {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  flex: 1;
  padding: var(--e-4);
}

.objeto__titulo {
  font-size: var(--txt-lg);
}

.objeto__descripcion {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.objeto__datos {
  display: flex;
  flex-direction: column;
  gap: var(--e-1);
  margin-bottom: var(--e-2);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.objeto__datos li {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}

.objeto__cuerpo .boton,
.solicitud {
  margin-top: auto;
}

.solicitud {
  padding: var(--e-3);
  border-radius: var(--radio-md);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  background: var(--info-fondo);
}

.solicitud--aprobada {
  background: var(--exito-fondo);
  color: var(--exito);
}

.solicitud--rechazada {
  background: var(--superficie-3);
  color: var(--texto-suave);
}

@media (min-width: 640px) {
  .objetos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .objetos {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1440px) {
  .objetos {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
