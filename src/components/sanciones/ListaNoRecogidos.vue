<script setup>
import { onMounted, ref } from 'vue'
import { TriangleAlert, Ban, PackageX } from 'lucide-vue-next'
import Dialogo from '@/components/avisos/Dialogo.vue'
import EstadoVacio from '@/components/avisos/EstadoVacio.vue'
import Campo from '@/components/formularios/Campo.vue'
import FormularioSancion from './FormularioSancion.vue'
import { useSanciones } from '@/stores/sanciones'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { colones } from '@compartido/dinero.js'
import { fechaIsoLegible } from '@compartido/hora.js'
import { METODOS_PAGO } from '@compartido/pedidos.js'

/**
 * Pedidos que pasaron a "no recogido". Nada es automatico: por cada uno la
 * administracion decide si alerta, sanciona o descarta el caso.
 */
const emit = defineEmits(['cambio'])

const sanciones = useSanciones()
const avisos = useAvisos()
const confirmar = useConfirmar()

const cargando = ref(true)
const error = ref('')
const ocupado = ref('')

const alertando = ref(null)
const mensaje = ref('')

const sancionando = ref(null)

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    await sanciones.cargarNoRecogidos()
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`
}

function resumenItems(p) {
  return p.items
    .map((i) => (i.cantidad > 1 ? `${i.cantidad} ${i.nombre}` : i.nombre))
    .join(', ')
}

function abrirAlerta(p) {
  alertando.value = p
  mensaje.value = ''
}

async function enviarAlerta() {
  const p = alertando.value
  ocupado.value = p.codigo
  try {
    await sanciones.alertar(p.codigo, mensaje.value)
    avisos.exito(`Alerta enviada a ${p.usuarioNombre}.`)
    alertando.value = null
    emit('cambio')
  } catch (e) {
    avisos.error(e.message)
  } finally {
    ocupado.value = ''
  }
}

function abrirSancion(p) {
  sancionando.value = {
    usuario: {
      id: p.usuarioId,
      nombre: p.usuarioNombre,
      sancionActiva: p.sancionActiva,
    },
    razon: `No recogió el pedido ${p.codigo} (${p.franja.nombre}, ${fechaIsoLegible(p.franja.fecha)}).`,
    pedidoCodigo: p.codigo,
  }
}

function alSancionar() {
  sancionando.value = null
  emit('cambio')
}

async function descartar(p) {
  const si = await confirmar.preguntar({
    titulo: `¿Descartar el caso del pedido ${p.codigo}?`,
    mensaje: `Sale de esta lista sin alertar ni sancionar a ${p.usuarioNombre}.`,
    aceptar: 'Descartar',
    peligro: false,
  })
  if (!si) return
  ocupado.value = p.codigo
  try {
    await sanciones.descartar(p.codigo)
    avisos.exito(`Caso ${p.codigo} descartado.`)
  } catch (e) {
    avisos.error(e.message)
  } finally {
    ocupado.value = ''
  }
}

defineExpose({ cargar })
</script>

<template>
  <div>
    <p v-if="cargando" class="texto-suave">Cargando pedidos no recogidos...</p>
    <div v-else-if="error" class="nota nota--aviso">
      <span>{{ error }}</span>
      <button type="button" class="boton boton--texto" @click="cargar">
        Reintentar
      </button>
    </div>
    <EstadoVacio
      v-else-if="!sanciones.noRecogidos.length"
      :icono="PackageX"
      titulo="No hay pedidos no recogidos"
      texto="Cuando un pedido listo no se retire a tiempo, va a aparecer aquí."
    />
    <ul v-else class="casos">
      <li v-for="p in sanciones.noRecogidos" :key="p.codigo" class="caso">
        <div class="caso__datos">
          <p class="caso__persona">
            <strong>{{ p.usuarioNombre }}</strong>
            <span v-if="p.usuarioSeccion" class="texto-suave">
              · {{ p.usuarioSeccion }}</span
            >
            <span v-if="p.sancionActiva" class="etiqueta etiqueta--error"
              >Sanción activa</span
            >
          </p>
          <p>
            Pedido <strong>{{ p.codigo }}</strong> · {{ resumenItems(p) }} ·
            {{ colones(p.total) }}
            <span class="texto-suave"
              >({{ METODOS_PAGO[p.pago.metodo]
              }}{{
                p.pago.estado === 'pendiente' ? ', sin pagar' : ', pagado'
              }})</span
            >
          </p>
          <p class="texto-suave">
            {{ fechaIsoLegible(p.franja.fecha) }} · {{ p.franja.nombre }}
          </p>
          <p class="caso__previos">
            {{ plural(p.alertas, 'alerta previa', 'alertas previas') }} ·
            {{ plural(p.sanciones, 'sanción previa', 'sanciones previas') }}
          </p>
        </div>
        <div class="caso__acciones">
          <button
            type="button"
            class="boton boton--pequeno boton--alertar"
            :disabled="ocupado === p.codigo || p.cuentaBorrada"
            @click="abrirAlerta(p)"
          >
            <TriangleAlert :size="16" aria-hidden="true" /> Alertar<span
              class="solo-lectores"
            >
              a {{ p.usuarioNombre }}</span
            >
          </button>
          <button
            type="button"
            class="boton boton--pequeno boton--peligro"
            :disabled="ocupado === p.codigo || p.cuentaBorrada"
            @click="abrirSancion(p)"
          >
            <Ban :size="16" aria-hidden="true" /> Sancionar<span
              class="solo-lectores"
            >
              a {{ p.usuarioNombre }}</span
            >
          </button>
          <button
            type="button"
            class="boton boton--pequeno boton--texto"
            :disabled="ocupado === p.codigo"
            @click="descartar(p)"
          >
            Descartar<span class="solo-lectores"> el caso {{ p.codigo }}</span>
          </button>
        </div>
      </li>
    </ul>

    <Dialogo
      :abierto="Boolean(alertando)"
      :titulo="`Alertar a ${alertando?.usuarioNombre ?? ''}`"
      descripcion="Le llega una notificación con el pedido no recogido. No bloquea nada."
      @cerrar="alertando = null"
    >
      <form id="form-alerta" novalidate @submit.prevent="enviarAlerta">
        <Campo
          id="alerta-mensaje"
          v-model="mensaje"
          etiqueta="Mensaje (opcional)"
          tipo="textarea"
          :maximo="300"
          placeholder="Ej.: Recordá retirar tus pedidos o avisar si no podés."
        />
      </form>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="alertando = null"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-alerta"
          class="boton boton--alertar"
          :disabled="ocupado === alertando?.codigo"
        >
          {{ ocupado === alertando?.codigo ? 'Enviando...' : 'Enviar alerta' }}
        </button>
      </template>
    </Dialogo>

    <FormularioSancion
      :abierto="Boolean(sancionando)"
      :usuario="sancionando?.usuario ?? null"
      :razon-inicial="sancionando?.razon ?? ''"
      :pedido-codigo="sancionando?.pedidoCodigo ?? ''"
      @cerrar="sancionando = null"
      @sancionado="alSancionar"
    />
  </div>
</template>

<style scoped>
.casos {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.caso {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
  padding: var(--e-4);
  border: 1px solid var(--borde);
  border-radius: var(--radio-md);
  background: var(--superficie);
  font-size: var(--txt-sm);
}

.caso__datos {
  display: flex;
  flex: 1 1 18rem;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.caso__datos p {
  margin: 0;
  overflow-wrap: anywhere;
}

.caso__persona {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
}

.caso__previos {
  font-weight: 600;
}

.caso__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}

/* Amarillo: avisa sin castigar. */
.boton--alertar {
  border: 1px solid var(--aviso);
  background: var(--aviso-fondo);
  color: var(--aviso);
}

.boton--alertar:hover:not(:disabled) {
  background: var(--aviso);
  color: var(--superficie);
}
</style>
