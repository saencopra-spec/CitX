<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import gsap from 'gsap'
import { BellRing, CircleCheck, Clock, Receipt, Wifi } from 'lucide-vue-next'
import EncabezadoPagina from '@/components/EncabezadoPagina.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import LineaEstado from '@/components/LineaEstado.vue'
import CodigoQR from '@/components/CodigoQR.vue'
import Estrellas from '@/components/Estrellas.vue'
import { api } from '@/lib/api'
import { usarSondeo } from '@/lib/sondeo'
import { sinMovimiento } from '@/lib/movimiento'
import {
  notificacionesSoportadas,
  permisoNotificaciones,
  pedirPermisoNotificaciones,
  notificarNavegador,
} from '@/lib/avisosNavegador'
import { useAvisos } from '@/stores/avisos'
import { colones } from '@compartido/dinero.js'
import {
  horaLegible,
  fechaIsoLegible,
  partesCR,
  fechaRelativa,
  horaDe,
} from '@compartido/hora.js'
import { textoQR, METODOS_PAGO } from '@compartido/pedidos.js'
import { inicioFranja } from '@compartido/jornada.js'
import { NOMBRE_MARCA } from '@compartido/pagos.js'

const props = defineProps({ codigo: { type: String, required: true } })
const route = useRoute()
const avisos = useAvisos()

const pedido = ref(null)
const error = ref('')
const esNuevo = route.query.nuevo === '1'
const permiso = ref(permisoNotificaciones())
const tarjetaCodigo = ref(null)
const calificando = ref({})

const terminado = computed(() => pedido.value?.estado === 'entregado')
const retiroHoy = computed(() => pedido.value?.franja.fecha === partesCR().iso)

const { detener } = usarSondeo(async () => {
  try {
    const datos = await api.get(`/pedidos/${props.codigo}`)
    pedido.value = datos.pedido
    error.value = ''
    if (datos.pedido.estado === 'entregado') detener()
  } catch (e) {
    if (e.estado === 404) {
      error.value = e.message
      detener()
    }
  }
}, 5000)

// Cuando la soda marca el pedido como listo, se avisa de todas las formas posibles.
watch(
  () => pedido.value?.estado,
  (nuevo, anterior) => {
    if (!anterior || nuevo === anterior) return
    if (nuevo === 'listo') {
      avisos.exito(`Tu pedido ${props.codigo} está listo. Pasá a retirarlo.`, {
        duracion: 8000,
      })
      notificarNavegador(
        'Tu pedido está listo',
        `Pasá a la soda con el código ${props.codigo}.`,
        `/soda/pedido/${props.codigo}`
      )
      navigator.vibrate?.([120, 60, 120])
      if (!sinMovimiento() && tarjetaCodigo.value) {
        gsap.fromTo(
          tarjetaCodigo.value,
          { scale: 0.96 },
          { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }
        )
      }
    }
  }
)

async function activarAvisos() {
  permiso.value = await pedirPermisoNotificaciones()
  if (permiso.value === 'granted')
    avisos.exito('Te avisamos cuando esté listo.')
}

async function calificar(item, estrellas) {
  calificando.value = { ...calificando.value, [item.productoId]: estrellas }
  try {
    await api.post(`/soda/productos/${item.productoId}/calificar`, {
      estrellas,
      codigo: props.codigo,
    })
    pedido.value.calificados = [...pedido.value.calificados, item.productoId]
    avisos.exito(`Gracias por calificar ${item.nombre}.`)
  } catch (e) {
    avisos.error(e.message)
  }
}

onMounted(() => {
  if (esNuevo && !sinMovimiento()) {
    gsap.from('.confirmado', {
      y: -12,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      delay: 0.15,
    })
  }
})
</script>

<template>
  <div class="pagina estado">
    <EncabezadoPagina
      :titulo="`Pedido ${codigo}`"
      :volver="{ name: 'mis-pedidos' }"
    />

    <EstadoVacio v-if="error" titulo="No encontramos ese pedido" :texto="error">
      <RouterLink :to="{ name: 'mis-pedidos' }" class="boton boton--accion"
        >Ver mis pedidos</RouterLink
      >
    </EstadoVacio>

    <div
      v-else-if="!pedido"
      class="esqueleto"
      style="height: 420px; border-radius: var(--radio-lg)"
      aria-busy="true"
    />

    <template v-else>
      <p v-if="esNuevo" class="confirmado nota nota--exito" role="status">
        <CircleCheck :size="20" aria-hidden="true" />
        <span>
          <strong>Pedido confirmado.</strong>
          <template v-if="pedido.pago.metodo === 'efectivo'">
            Pagás {{ colones(pedido.total) }} al retirar.</template
          >
          <template v-else>
            El pago quedó
            {{
              pedido.pago.metodo === 'sinpe' ? 'verificado' : 'aprobado'
            }}
            (simulado).</template
          >
        </span>
      </p>

      <div class="distribucion">
        <section
          ref="tarjetaCodigo"
          class="codigo"
          :class="{ 'es-listo': pedido.estado === 'listo' }"
          aria-labelledby="t-codigo"
        >
          <h2 id="t-codigo" class="solo-lectores">Código para retirar</h2>
          <p class="codigo__instruccion">
            <template v-if="pedido.estado === 'listo'">
              <BellRing :size="18" aria-hidden="true" /> Listo. Mostrá esto en
              la soda.
            </template>
            <template v-else-if="terminado">Pedido entregado</template>
            <template v-else>Mostrá este código al retirar</template>
          </p>
          <CodigoQR
            :texto="textoQR(pedido.codigo)"
            :tamano="180"
            :alt="`Código QR del pedido ${pedido.codigo}`"
          />
          <p
            class="codigo__texto"
            :aria-label="`Código ${pedido.codigo.split('').join(' ')}`"
          >
            {{ pedido.codigo }}
          </p>
          <p class="codigo__retiro">
            <Clock :size="16" aria-hidden="true" />
            {{ pedido.franja.nombre }},
            {{
              horaLegible(
                pedido.franja.inicio ?? inicioFranja(pedido.franja.clave)
              )
            }}
            <template v-if="!retiroHoy">
              · {{ fechaIsoLegible(pedido.franja.fecha) }}</template
            >
          </p>
        </section>

        <section class="seguimiento" aria-labelledby="t-estado">
          <div class="seguimiento__encabezado">
            <h2 id="t-estado" class="subtitulo">Estado</h2>
            <span v-if="!terminado" class="en-vivo"
              ><Wifi :size="14" aria-hidden="true" /> Se actualiza solo</span
            >
          </div>
          <div aria-live="polite">
            <LineaEstado
              :estado="pedido.estado"
              :historial="pedido.historial"
            />
          </div>

          <p
            v-if="
              !terminado && notificacionesSoportadas && permiso === 'default'
            "
            class="nota"
          >
            <BellRing :size="18" aria-hidden="true" />
            <span>
              ¿Querés que te avisemos aunque cierres esta pantalla?
              <button
                type="button"
                class="boton boton--texto boton--pequeno"
                @click="activarAvisos"
              >
                Activar avisos
              </button>
            </span>
          </p>
        </section>

        <section class="detalle" aria-labelledby="t-detalle">
          <h2 id="t-detalle" class="subtitulo">
            <Receipt :size="20" aria-hidden="true" /> Detalle
          </h2>
          <ul class="lineas">
            <li
              v-for="i in pedido.items"
              :key="i.productoId"
              class="linea-item"
            >
              <div class="linea-item__fila">
                <span>{{ i.cantidad }} × {{ i.nombre }}</span>
                <span>{{ colones(i.precio * i.cantidad) }}</span>
              </div>
              <p v-if="i.nota" class="linea-item__nota">Nota: {{ i.nota }}</p>
              <div v-if="terminado" class="calificar">
                <template v-if="pedido.calificados.includes(i.productoId)">
                  <span class="etiqueta etiqueta--exito">Calificado</span>
                </template>
                <template v-else>
                  <span class="texto-suave">¿Qué tal estuvo?</span>
                  <Estrellas
                    editable
                    :nombre="`estrellas-${i.productoId}`"
                    :valor="calificando[i.productoId] ?? 0"
                    @elegir="(n) => calificar(i, n)"
                  />
                </template>
              </div>
            </li>
          </ul>
          <dl class="pago">
            <div>
              <dt>Pago</dt>
              <dd>
                {{ METODOS_PAGO[pedido.pago.metodo] }}
                <template v-if="pedido.pago.metodo === 'tarjeta'"
                  >{{ NOMBRE_MARCA[pedido.pago.marca] }} terminada en
                  {{ pedido.pago.ultimos }}</template
                >
              </dd>
            </div>
            <div>
              <dt>Hecho</dt>
              <dd>
                {{ fechaRelativa(pedido.creadoEn) }},
                {{ horaDe(pedido.creadoEn) }}
              </dd>
            </div>
            <div class="pago__total">
              <dt>Total</dt>
              <dd>{{ colones(pedido.total) }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.confirmado {
  margin-bottom: var(--e-5);
}

.distribucion {
  display: grid;
  gap: var(--e-5);
  align-items: start;
}

.codigo,
.seguimiento,
.detalle {
  padding: var(--e-5);
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
}

.codigo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-3);
  text-align: center;
  transition:
    border-color var(--dur-lenta) var(--curva),
    background-color var(--dur-lenta) var(--curva);
}

.codigo.es-listo {
  border: 2px solid var(--exito);
  background: var(--exito-fondo);
}

.codigo__instruccion {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  font-weight: var(--peso-semi);
}

.es-listo .codigo__instruccion {
  color: var(--exito);
}

.codigo__texto {
  font-family: var(--fuente-mono);
  font-size: 2.25rem;
  font-weight: var(--peso-extra);
  letter-spacing: 0.2em;
  color: var(--texto);
  padding-left: 0.2em;
}

.codigo__retiro {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  flex-wrap: wrap;
  justify-content: center;
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.seguimiento {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.seguimiento__encabezado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
}

.en-vivo {
  display: inline-flex;
  align-items: center;
  gap: var(--e-1);
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
}

.detalle {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.detalle .subtitulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}

.lineas {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.linea-item__fila {
  display: flex;
  justify-content: space-between;
  gap: var(--e-3);
}

.linea-item__fila span:last-child {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.linea-item__nota {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.calificar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  margin-top: var(--e-1);
  font-size: var(--txt-sm);
}

.pago {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  padding-top: var(--e-3);
  border-top: 1px solid var(--borde);
  font-size: var(--txt-sm);
}

.pago div {
  display: flex;
  justify-content: space-between;
  gap: var(--e-3);
}

.pago dt {
  color: var(--texto-suave);
}

.pago dd {
  margin: 0;
  text-align: right;
}

.pago__total {
  font-size: var(--txt-lg);
  font-weight: var(--peso-extra);
}

@media (min-width: 768px) {
  .distribucion {
    grid-template-columns: 18rem minmax(0, 1fr);
  }

  .codigo {
    grid-row: span 2;
    position: sticky;
    top: var(--e-6);
  }
}

@media (min-width: 1440px) {
  .distribucion {
    grid-template-columns: 18rem minmax(0, 1fr) minmax(0, 1fr);
  }

  .codigo {
    grid-row: auto;
  }
}
</style>
