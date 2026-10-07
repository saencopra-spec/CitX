<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Smartphone,
  CreditCard,
  Banknote,
  Info,
  Copy,
  ShieldCheck,
  LoaderCircle,
  Clock,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import Campo from '@/components/formularios/Campo.vue'
import { useCarrito } from '@/stores/carrito'
import { useAvisos } from '@/stores/avisos'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { colones } from '@compartido/dinero.js'
import { horaLegible, fechaIsoLegible, partesCR } from '@compartido/hora.js'
import {
  SINPE_SODA,
  TARJETA_PRUEBA,
  marcaTarjeta,
  NOMBRE_MARCA,
  formatearNumeroTarjeta,
  validarTarjeta,
  comprobanteSinpeValido,
  soloDigitos,
} from '@compartido/pagos.js'

const carrito = useCarrito()
const avisos = useAvisos()
const router = useRouter()
const { errores, limpiar, mostrar } = usarErrores()

const metodos = [
  { valor: 'sinpe', texto: 'SINPE Móvil', icono: Smartphone },
  { valor: 'tarjeta', texto: 'Tarjeta', icono: CreditCard },
  { valor: 'efectivo', texto: 'Efectivo', icono: Banknote },
]
const metodo = ref('sinpe')
const procesando = ref(false)
const mensajeProceso = ref('')

const comprobante = ref('')
const tarjeta = ref({ numero: '', titular: '', vencimiento: '', cvv: '' })

const marca = computed(() => marcaTarjeta(tarjeta.value.numero))
const franjaHoy = computed(() => carrito.franja?.fecha === partesCR().iso)

function alEscribirNumero(e) {
  tarjeta.value.numero = formatearNumeroTarjeta(e.target.value)
}

function alEscribirVencimiento(e) {
  const d = soloDigitos(e.target.value).slice(0, 4)
  tarjeta.value.vencimiento =
    d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

function usarTarjetaPrueba() {
  tarjeta.value = { ...TARJETA_PRUEBA, titular: 'Persona de prueba' }
  limpiar()
}

async function copiarNumero() {
  try {
    await navigator.clipboard.writeText(soloDigitos(SINPE_SODA.numero))
    avisos.exito('Número copiado.')
  } catch {
    avisos.aviso('No se pudo copiar. Anotalo: ' + SINPE_SODA.numero)
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

function validar() {
  limpiar()
  if (metodo.value === 'sinpe' && !comprobanteSinpeValido(comprobante.value)) {
    errores.comprobante =
      'El comprobante son solo números, entre 6 y 25 dígitos. Lo encontrás en el mensaje del banco.'
  }
  if (metodo.value === 'tarjeta') {
    Object.assign(errores, validarTarjeta(tarjeta.value))
  }
  return Object.keys(errores).length === 0
}

async function pagar() {
  if (!validar()) {
    document.querySelector('[aria-invalid="true"]')?.focus()
    return
  }
  procesando.value = true
  try {
    // La espera imita lo que tarda un banco en responder.
    if (metodo.value === 'sinpe') {
      mensajeProceso.value = 'Verificando el SINPE con el banco...'
      await esperar(1800)
    } else if (metodo.value === 'tarjeta') {
      mensajeProceso.value = 'Procesando el pago con la tarjeta...'
      await esperar(1500)
    } else {
      mensajeProceso.value = 'Enviando tu pedido a la soda...'
    }

    const pago =
      metodo.value === 'sinpe'
        ? { metodo: 'sinpe', comprobante: soloDigitos(comprobante.value) }
        : metodo.value === 'tarjeta'
          ? { metodo: 'tarjeta', ...tarjeta.value }
          : { metodo: 'efectivo' }

    const { pedido } = await api.post('/pedidos', {
      items: carrito.items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        nota: i.nota,
      })),
      franja: { fecha: carrito.franja.fecha, clave: carrito.franja.clave },
      pago,
    })
    carrito.vaciar()
    router.replace({
      name: 'pedido',
      params: { codigo: pedido.codigo },
      query: { nuevo: '1' },
    })
  } catch (e) {
    mostrar(e)
    if (e.campos?.franja) router.replace({ name: 'carrito' })
  } finally {
    procesando.value = false
  }
}

onMounted(() => {
  if (carrito.vacio || !carrito.franja)
    router.replace({ name: carrito.vacio ? 'soda' : 'carrito' })
})
</script>

<template>
  <div class="pagina pago">
    <EncabezadoPagina titulo="Pagar" :volver="{ name: 'carrito' }" />

    <p class="demo" role="note">
      <Info :size="20" aria-hidden="true" />
      <span>
        <strong>Esto es una demostración.</strong>
        No se cobra dinero real. Podés usar datos inventados o la tarjeta de
        prueba.
      </span>
    </p>

    <div class="distribucion">
      <form class="formulario" novalidate @submit.prevent="pagar">
        <fieldset class="metodos">
          <legend class="subtitulo">¿Cómo querés pagar?</legend>
          <label v-for="m in metodos" :key="m.valor" class="metodo">
            <input
              v-model="metodo"
              type="radio"
              name="metodo"
              :value="m.valor"
              class="solo-lectores"
              @change="limpiar()"
            />
            <component :is="m.icono" :size="22" aria-hidden="true" />
            {{ m.texto }}
          </label>
        </fieldset>

        <Transition name="metodo" mode="out-in">
          <div v-if="metodo === 'sinpe'" key="sinpe" class="detalle">
            <ol class="pasos">
              <li>
                Abrí la app de tu banco y hacé un SINPE Móvil al
                <strong class="numero-sinpe">{{ SINPE_SODA.numero }}</strong>
                <button
                  type="button"
                  class="boton boton--texto boton--pequeno"
                  @click="copiarNumero"
                >
                  <Copy :size="16" aria-hidden="true" /> Copiar
                </button>
                a nombre de {{ SINPE_SODA.nombre }}.
              </li>
              <li>
                El monto exacto es <strong>{{ colones(carrito.total) }}</strong
                >.
              </li>
              <li>Escribí aquí el número de comprobante que te da el banco.</li>
            </ol>
            <Campo
              id="comprobante"
              v-model="comprobante"
              etiqueta="Número de comprobante"
              modo-teclado="numeric"
              placeholder="Por ejemplo 2026100912345678"
              ayuda="En la demostración sirve cualquier número de 6 a 25 dígitos."
              :maximo="30"
              :error="errores.comprobante"
            />
          </div>

          <div v-else-if="metodo === 'tarjeta'" key="tarjeta" class="detalle">
            <div
              class="tarjeta-vista"
              :data-marca="marca ?? 'ninguna'"
              aria-hidden="true"
            >
              <span class="tarjeta-vista__chip" />
              <span class="tarjeta-vista__numero">{{
                tarjeta.numero || '0000 0000 0000 0000'
              }}</span>
              <span class="tarjeta-vista__fila">
                <span>{{ tarjeta.titular || 'Nombre en la tarjeta' }}</span>
                <span>{{ tarjeta.vencimiento || 'MM/AA' }}</span>
              </span>
              <span class="tarjeta-vista__marca">{{
                marca ? NOMBRE_MARCA[marca] : ''
              }}</span>
            </div>

            <p class="nota">
              <CreditCard :size="18" aria-hidden="true" />
              <span>
                Tarjeta de prueba: <strong>{{ TARJETA_PRUEBA.numero }}</strong
                >, vence {{ TARJETA_PRUEBA.vencimiento }}, CVV
                {{ TARJETA_PRUEBA.cvv }}. La 4000 0000 0000 0002 simula una
                tarjeta rechazada.
                <button
                  type="button"
                  class="boton boton--texto boton--pequeno"
                  @click="usarTarjetaPrueba"
                >
                  Usar la de prueba
                </button>
              </span>
            </p>

            <div class="campo">
              <label class="campo__etiqueta" for="numero">
                Número de la tarjeta
                <span v-if="marca" class="etiqueta etiqueta--info">{{
                  NOMBRE_MARCA[marca]
                }}</span>
              </label>
              <input
                id="numero"
                class="campo__control numero"
                :value="tarjeta.numero"
                inputmode="numeric"
                autocomplete="cc-number"
                placeholder="0000 0000 0000 0000"
                maxlength="23"
                :aria-invalid="errores.numero ? 'true' : undefined"
                :aria-describedby="errores.numero ? 'numero-error' : undefined"
                @input="alEscribirNumero"
              />
              <p v-if="errores.numero" id="numero-error" class="campo__error">
                {{ errores.numero }}
              </p>
            </div>
            <Campo
              id="titular"
              v-model="tarjeta.titular"
              etiqueta="Nombre en la tarjeta"
              autocompletar="cc-name"
              :error="errores.titular"
            />
            <div class="dos-columnas">
              <div class="campo">
                <label class="campo__etiqueta" for="vencimiento">Vence</label>
                <input
                  id="vencimiento"
                  class="campo__control"
                  :value="tarjeta.vencimiento"
                  inputmode="numeric"
                  autocomplete="cc-exp"
                  placeholder="MM/AA"
                  maxlength="5"
                  :aria-invalid="errores.vencimiento ? 'true' : undefined"
                  :aria-describedby="
                    errores.vencimiento ? 'vencimiento-error' : undefined
                  "
                  @input="alEscribirVencimiento"
                />
                <p
                  v-if="errores.vencimiento"
                  id="vencimiento-error"
                  class="campo__error"
                >
                  {{ errores.vencimiento }}
                </p>
              </div>
              <Campo
                id="cvv"
                v-model="tarjeta.cvv"
                etiqueta="CVV"
                modo-teclado="numeric"
                autocompletar="cc-csc"
                :maximo="4"
                placeholder="123"
                :error="errores.cvv"
              />
            </div>
          </div>

          <div v-else key="efectivo" class="detalle">
            <p class="nota">
              <Banknote :size="18" aria-hidden="true" />
              <span>
                Pagás <strong>{{ colones(carrito.total) }}</strong> en la caja
                de la soda cuando retirés. Si podés, llevá el monto exacto para
                que todo sea más rápido.
              </span>
            </p>
          </div>
        </Transition>

        <button
          type="submit"
          class="boton boton--accion boton--ancho boton--grande"
          :disabled="procesando"
        >
          <LoaderCircle
            v-if="procesando"
            :size="20"
            class="girando"
            aria-hidden="true"
          />
          <ShieldCheck v-else :size="20" aria-hidden="true" />
          {{
            procesando
              ? mensajeProceso
              : metodo === 'efectivo'
                ? 'Confirmar pedido'
                : `Pagar ${colones(carrito.total)}`
          }}
        </button>
        <p class="solo-lectores" role="status" aria-live="assertive">
          {{ procesando ? mensajeProceso : '' }}
        </p>
      </form>

      <aside class="resumen" aria-labelledby="t-resumen">
        <h2 id="t-resumen" class="subtitulo">Tu pedido</h2>
        <ul class="lineas">
          <li v-for="i in carrito.items" :key="i.productoId">
            <span>{{ i.cantidad }} × {{ i.nombre }}</span>
            <span>{{ colones(i.precio * i.cantidad) }}</span>
          </li>
        </ul>
        <p v-if="carrito.franja" class="retiro">
          <Clock :size="18" aria-hidden="true" />
          Retiro: {{ carrito.franja.nombre.toLowerCase() }},
          {{ horaLegible(carrito.franja.inicio) }}
          <template v-if="!franjaHoy"
            >, {{ fechaIsoLegible(carrito.franja.fecha) }}</template
          >
        </p>
        <p class="total">
          <span>Total</span>
          <strong>{{ colones(carrito.total) }}</strong>
        </p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  gap: var(--e-3);
  padding: var(--e-4);
  margin-bottom: var(--e-5);
  border-radius: var(--radio-md);
  border: 2px dashed var(--aviso);
  background: var(--aviso-fondo);
  font-size: var(--txt-sm);
}

.demo svg {
  flex-shrink: 0;
  color: var(--aviso);
}

.distribucion {
  display: grid;
  gap: var(--e-6);
  align-items: start;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
  min-width: 0;
}

.metodos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--e-2);
  border: none;
  padding: 0;
}

.metodos legend {
  margin-bottom: var(--e-3);
}

.metodo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--e-1);
  min-height: 76px;
  padding: var(--e-2);
  border: 1.5px solid var(--borde-fuerte);
  border-radius: var(--radio-md);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  text-align: center;
  cursor: pointer;
  color: var(--texto-suave);
}

.metodo:has(input:checked) {
  border-color: var(--principal);
  background: var(--principal-suave);
  color: var(--texto);
}

.metodo:has(input:focus-visible) {
  outline: 3px solid var(--foco);
  outline-offset: 2px;
}

.detalle {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.pasos {
  list-style: decimal;
  padding-left: var(--e-5);
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  line-height: var(--alto-amplio);
}

.numero-sinpe {
  font-size: var(--txt-lg);
  font-variant-numeric: tabular-nums;
}

.tarjeta-vista {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--e-3);
  width: 100%;
  max-width: 340px;
  aspect-ratio: 1.586;
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  color: #ffffff;
  background: linear-gradient(135deg, var(--gris-700), var(--gris-900));
  box-shadow: var(--sombra-3);
  font-family: var(--fuente-mono);
  transition: background var(--dur-lenta) var(--curva);
}

.tarjeta-vista[data-marca='visa'] {
  background: linear-gradient(135deg, #1a3d8f, #0e1f4d);
}

.tarjeta-vista[data-marca='mastercard'] {
  background: linear-gradient(135deg, #3b3b3b, #121212);
}

.tarjeta-vista[data-marca='amex'] {
  background: linear-gradient(135deg, #2b7a8c, #134452);
}

.tarjeta-vista__chip {
  position: absolute;
  top: var(--e-5);
  left: var(--e-5);
  width: 40px;
  height: 30px;
  border-radius: 6px;
  background: linear-gradient(135deg, #e7c66b, #b58a2c);
}

.tarjeta-vista__numero {
  font-size: clamp(1rem, 4.6vw, 1.25rem);
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.tarjeta-vista__fila {
  display: flex;
  justify-content: space-between;
  gap: var(--e-3);
  font-size: var(--txt-xs);
  text-transform: none;
  opacity: 0.85;
}

.tarjeta-vista__marca {
  position: absolute;
  top: var(--e-5);
  right: var(--e-5);
  font-family: var(--fuente-base);
  font-weight: var(--peso-extra);
  font-style: italic;
}

.numero {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.campo__etiqueta .etiqueta {
  margin-left: var(--e-2);
}

.dos-columnas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--e-4);
}

.resumen {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.lineas {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  font-size: var(--txt-sm);
}

.lineas li {
  display: flex;
  justify-content: space-between;
  gap: var(--e-3);
}

.lineas li span:last-child {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.retiro {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  flex-wrap: wrap;
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.total {
  display: flex;
  justify-content: space-between;
  padding-top: var(--e-3);
  border-top: 1px solid var(--borde);
  font-size: var(--txt-lg);
  font-weight: var(--peso-extra);
}

.girando {
  animation: girar 0.9s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

.metodo-enter-active,
.metodo-leave-active {
  transition:
    opacity var(--dur-media) var(--curva),
    transform var(--dur-media) var(--curva);
}

.metodo-enter-from,
.metodo-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (min-width: 1024px) {
  .distribucion {
    grid-template-columns: minmax(0, 1fr) 22rem;
  }

  .resumen {
    position: sticky;
    top: var(--e-6);
  }
}
</style>
