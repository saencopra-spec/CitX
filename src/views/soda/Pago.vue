<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Smartphone,
  Banknote,
  CreditCard,
  Store,
  Info,
  Copy,
  ShieldCheck,
  LoaderCircle,
  Clock,
  Phone,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import Campo from '@/components/formularios/Campo.vue'
import SubirFoto from '@/components/formularios/SubirFoto.vue'
import TarjetaSancion from '@/components/sanciones/TarjetaSancion.vue'
import { useCarrito } from '@/stores/carrito'
import { useSanciones } from '@/stores/sanciones'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { colones } from '@compartido/dinero.js'
import { telefonoValido } from '@compartido/contacto.js'
import { horaLegible, fechaIsoLegible, partesCR } from '@compartido/hora.js'
import {
  SINPE_SODA,
  comprobanteSinpeValido,
  soloDigitos,
} from '@compartido/pagos.js'

const carrito = useCarrito()
const avisos = useAvisos()
const sanciones = useSanciones()
const auth = useAuth()
const router = useRouter()
const { errores, limpiar, mostrar } = usarErrores()

// Para comprar en la soda hace falta un teléfono vinculado a la cuenta.
const faltaTelefono = computed(
  () => auth.haySesion && !auth.usuario?.telefono
)
const telefonoNuevo = ref('')
const errorTelefono = ref('')
const guardandoTelefono = ref(false)

async function guardarTelefono() {
  errorTelefono.value = ''
  if (!telefonoValido(telefonoNuevo.value)) {
    errorTelefono.value = 'Escribí un número de teléfono de 8 dígitos.'
    return
  }
  guardandoTelefono.value = true
  try {
    await auth.actualizarPerfil({
      nombre: auth.usuario.nombre,
      seccion: auth.usuario.seccion ?? null,
      telefono: telefonoNuevo.value,
    })
    telefonoNuevo.value = ''
    avisos.exito('Listo. Vinculamos tu teléfono y ya podés completar el pedido.')
  } catch (e) {
    errorTelefono.value = e.campos?.telefono ?? e.message
  } finally {
    guardandoTelefono.value = false
  }
}

const metodos = [
  { valor: 'sinpe', texto: 'SINPE Móvil', icono: Smartphone },
  { valor: 'efectivo', texto: 'Efectivo', icono: Banknote },
  { valor: 'tarjeta', texto: 'Tarjeta', icono: CreditCard },
]
const metodo = ref('sinpe')
// Efectivo y tarjeta se cobran en la caja de la soda al retirar.
const esEnCaja = computed(
  () => metodo.value === 'efectivo' || metodo.value === 'tarjeta'
)
const procesando = ref(false)
const mensajeProceso = ref('')

const comprobante = ref('')
/** Foto del comprobante del SINPE (obligatoria para pagar en línea). */
const comprobanteFoto = ref(null)

const franjaHoy = computed(() => carrito.franja?.fecha === partesCR().iso)

async function copiarNumero() {
  try {
    await navigator.clipboard.writeText(soloDigitos(SINPE_SODA.numero))
    avisos.exito('Número copiado.')
  } catch {
    avisos.aviso('No se pudo copiar. Anotalo: ' + SINPE_SODA.numero)
  }
}

function validar() {
  limpiar()
  if (metodo.value === 'sinpe') {
    if (!comprobanteFoto.value) {
      errores.foto =
        'Adjuntá la foto del comprobante del SINPE. Sin ella no se puede hacer el pedido.'
    }
    // El número de comprobante es opcional; si lo escriben, lo validamos.
    if (comprobante.value && !comprobanteSinpeValido(comprobante.value)) {
      errores.comprobante =
        'El comprobante son solo números, entre 6 y 25 dígitos. Lo encontrás en el mensaje del banco.'
    }
  }
  return Object.keys(errores).length === 0
}

async function pagar() {
  if (faltaTelefono.value) {
    avisos.aviso('Agregá tu teléfono para poder completar el pedido.')
    document.getElementById('telefono-vincular')?.focus()
    return
  }
  if (!validar()) {
    document.querySelector('[aria-invalid="true"]')?.focus()
    return
  }
  procesando.value = true
  try {
    mensajeProceso.value =
      metodo.value === 'sinpe'
        ? 'Enviando el comprobante a la soda...'
        : 'Enviando tu pedido a la soda...'

    const pago =
      metodo.value === 'sinpe'
        ? {
            metodo: 'sinpe',
            comprobante: comprobante.value
              ? soloDigitos(comprobante.value)
              : '',
            foto: comprobanteFoto.value,
          }
        : { metodo: metodo.value }

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
    if (e.esDePermiso) sanciones.cargarEstado().catch(() => {})
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

    <TarjetaSancion />

    <p class="demo" role="note">
      <Info :size="20" aria-hidden="true" />
      <span>
        <strong>Esto es una demostración.</strong>
        No se cobra dinero real. Para el SINPE podés adjuntar cualquier foto
        como comprobante.
      </span>
    </p>

    <section v-if="faltaTelefono" class="telefono" aria-labelledby="t-telefono">
      <h2 id="t-telefono" class="telefono__titulo">
        <Phone :size="20" aria-hidden="true" /> Vinculá tu teléfono para pedir
      </h2>
      <p class="telefono__texto">
        Por seguridad, la soda necesita un teléfono asociado a tu cuenta antes
        de tu primer pedido. Así podemos contactarte si surge algo con tu
        pedido —por ejemplo, si no alcanzás a pasar a retirarlo— y tener un
        respaldo de quién hizo cada compra. Lo guardamos una sola vez y queda
        listo para siempre.
      </p>
      <form class="telefono__form" novalidate @submit.prevent="guardarTelefono">
        <Campo
          id="telefono-vincular"
          v-model="telefonoNuevo"
          etiqueta="Tu número de teléfono"
          tipo="tel"
          autocompletar="tel"
          modo-teclado="numeric"
          placeholder="8888 8888"
          :error="errorTelefono"
        />
        <button
          type="submit"
          class="boton boton--accion"
          :disabled="guardandoTelefono"
        >
          {{ guardandoTelefono ? 'Guardando...' : 'Vincular teléfono' }}
        </button>
      </form>
    </section>

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
              <li>
                Adjuntá una <strong>foto del comprobante</strong> que te da el
                banco. Es obligatoria para confirmar el pedido.
              </li>
            </ol>
            <SubirFoto
              id="comprobante-foto"
              v-model="comprobanteFoto"
              etiqueta="Foto del comprobante"
              :error="errores.foto"
            />
            <Campo
              id="comprobante"
              v-model="comprobante"
              etiqueta="Número de comprobante (opcional)"
              modo-teclado="numeric"
              placeholder="Por ejemplo 2026100912345678"
              ayuda="Si lo tenés a mano, ayuda a la soda a ubicar tu pago."
              :maximo="30"
              :error="errores.comprobante"
            />
          </div>

          <div v-else key="caja" class="detalle">
            <div class="en-caja">
              <Store :size="24" aria-hidden="true" class="en-caja__icono" />
              <div>
                <p class="en-caja__titulo">Pago en caja</p>
                <p class="en-caja__texto">
                  <template v-if="metodo === 'efectivo'">
                    Pagás <strong>{{ colones(carrito.total) }}</strong> en
                    <strong>efectivo</strong> en la caja de la soda cuando
                    retirés. Si podés, llevá el monto exacto para que todo sea
                    más rápido.
                  </template>
                  <template v-else>
                    Pagás <strong>{{ colones(carrito.total) }}</strong> con
                    <strong>tarjeta</strong> en la caja de la soda cuando
                    retirés.
                  </template>
                </p>
              </div>
            </div>
          </div>
        </Transition>

        <button
          type="submit"
          class="boton boton--accion boton--ancho boton--grande"
          :disabled="procesando || sanciones.bloqueado || faltaTelefono"
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
              : esEnCaja
                ? 'Confirmar pedido'
                : `Enviar comprobante · ${colones(carrito.total)}`
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

.telefono {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding: var(--e-5);
  margin-bottom: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-left: 4px solid var(--principal);
}

.telefono__titulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-md);
}

.telefono__texto {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  line-height: var(--alto-amplio);
}

.telefono__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--e-3);
}

.telefono__form :deep(.campo) {
  flex: 1 1 14rem;
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

.en-caja {
  display: flex;
  align-items: flex-start;
  gap: var(--e-3);
  padding: var(--e-4);
  border-radius: var(--radio-md);
  border: 1px solid var(--borde);
  background: var(--superficie-3);
}

.en-caja__icono {
  flex-shrink: 0;
  color: var(--principal-fuerte);
}

.en-caja__titulo {
  font-weight: var(--peso-extra);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--texto);
}

.en-caja__texto {
  margin-top: var(--e-1);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  line-height: var(--alto-amplio);
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
