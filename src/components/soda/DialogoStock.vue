<script setup>
import { computed, ref, watch } from 'vue'
import { PackagePlus, PackageMinus } from 'lucide-vue-next'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Campo from '@/components/formularios/Campo.vue'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { useAvisos } from '@/stores/avisos'
import { CAMBIO_STOCK_MAXIMO } from '@compartido/soda.js'

/**
 * Reponer o quitar unidades de un producto con control de stock. Antes de
 * guardar se confirma el cambio (no el total, que puede moverse si entran
 * pedidos mientras tanto). Tambien se edita el umbral de "pocas unidades".
 */
const props = defineProps({
  abierto: { type: Boolean, default: false },
  /** { id, nombre, stock, umbralPocas } */
  producto: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'actualizado'])

const avisos = useAvisos()
const { errores, limpiar, mostrar } = usarErrores()

const paso = ref('elegir')
const modo = ref('reponer')
const unidades = ref('')
const umbral = ref('')
const guardando = ref(false)

watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return
    paso.value = 'elegir'
    modo.value = 'reponer'
    unidades.value = ''
    umbral.value = String(props.producto?.umbralPocas ?? '')
    limpiar()
  }
)

const n = computed(() => Number(unidades.value))
const valido = computed(
  () =>
    Number.isInteger(n.value) && n.value > 0 && n.value <= CAMBIO_STOCK_MAXIMO
)
const cambio = computed(() => (modo.value === 'reponer' ? n.value : -n.value))
const textoCambio = computed(
  () =>
    `${cambio.value > 0 ? '+' : '−'}${n.value} ${n.value === 1 ? 'unidad' : 'unidades'}`
)

function continuar() {
  limpiar()
  if (!valido.value) {
    errores.unidades = `Escribí un número entero entre 1 y ${CAMBIO_STOCK_MAXIMO}.`
    return
  }
  paso.value = 'confirmar'
}

async function confirmar() {
  guardando.value = true
  try {
    const { producto } = await api.post(
      `/soda/productos/${props.producto.id}/stock`,
      { cambio: cambio.value }
    )
    avisos.exito(`${props.producto.nombre}: ${textoCambio.value}.`)
    emit('actualizado', producto)
  } catch (e) {
    paso.value = 'elegir'
    mostrar(e)
    if (e.campos?.cambio) errores.unidades = e.campos.cambio
  } finally {
    guardando.value = false
  }
}

async function guardarUmbral() {
  limpiar()
  const valor = Number(umbral.value)
  if (!Number.isInteger(valor) || valor < 0) {
    errores.umbralPocas = 'Escribí un número entero, 0 o más.'
    return
  }
  guardando.value = true
  try {
    const { producto } = await api.patch(
      `/soda/productos/${props.producto.id}`,
      {
        umbralPocas: valor,
      }
    )
    avisos.exito(`Guardamos el aviso de pocas unidades de ${producto.nombre}.`)
    emit('actualizado', producto, { seguirAbierto: true })
  } catch (e) {
    mostrar(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Dialogo
    :abierto="abierto"
    :titulo="
      paso === 'confirmar'
        ? '¿Confirmás el cambio?'
        : `Stock de ${producto?.nombre ?? ''}`
    "
    ancho="28rem"
    @cerrar="emit('cerrar')"
  >
    <div v-if="paso === 'confirmar'" class="confirmacion">
      <p
        class="confirmacion__cambio"
        :class="cambio > 0 ? 'es-suma' : 'es-resta'"
      >
        {{ textoCambio }}
      </p>
      <p class="confirmacion__producto">{{ producto?.nombre }}</p>
      <p class="texto-suave">
        Stock actual: {{ producto?.stock }}
        {{ producto?.stock === 1 ? 'unidad' : 'unidades' }}
      </p>
    </div>

    <template v-else>
      <p class="actual">
        Quedan <strong>{{ producto?.stock }}</strong>
        {{ producto?.stock === 1 ? 'unidad' : 'unidades' }}
      </p>
      <form
        id="form-stock"
        class="formulario"
        novalidate
        @submit.prevent="continuar"
      >
        <div class="segmentos" role="group" aria-label="Qué hacer">
          <button
            type="button"
            :aria-pressed="modo === 'reponer'"
            @click="modo = 'reponer'"
          >
            <PackagePlus :size="18" aria-hidden="true" /> Agregar
          </button>
          <button
            type="button"
            :aria-pressed="modo === 'quitar'"
            @click="modo = 'quitar'"
          >
            <PackageMinus :size="18" aria-hidden="true" /> Quitar
          </button>
        </div>
        <Campo
          id="stock-unidades"
          v-model="unidades"
          :etiqueta="
            modo === 'reponer' ? 'Unidades a agregar' : 'Unidades a quitar'
          "
          tipo="number"
          modo-teclado="numeric"
          :min="1"
          :max="CAMBIO_STOCK_MAXIMO"
          :error="errores.unidades"
        />
      </form>

      <form
        class="formulario umbral"
        novalidate
        @submit.prevent="guardarUmbral"
      >
        <Campo
          id="stock-umbral"
          v-model="umbral"
          etiqueta="«Pocas unidades» con esta cantidad o menos"
          tipo="number"
          modo-teclado="numeric"
          :min="0"
          :error="errores.umbralPocas"
        />
        <button
          type="submit"
          class="boton boton--contorno boton--pequeno"
          :disabled="guardando"
        >
          Guardar aviso
        </button>
      </form>
    </template>

    <template #pie>
      <template v-if="paso === 'confirmar'">
        <button
          type="button"
          class="boton boton--contorno"
          :disabled="guardando"
          @click="paso = 'elegir'"
        >
          Volver
        </button>
        <button
          type="button"
          class="boton"
          :class="cambio > 0 ? 'boton--accion' : 'boton--peligro'"
          :disabled="guardando"
          @click="confirmar"
        >
          {{ guardando ? 'Guardando...' : 'Confirmar' }}
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="boton boton--contorno"
          @click="emit('cerrar')"
        >
          Cerrar
        </button>
        <button
          type="submit"
          form="form-stock"
          class="boton boton--accion"
          :disabled="!unidades"
        >
          Continuar
        </button>
      </template>
    </template>
  </Dialogo>
</template>

<style scoped>
.actual {
  margin: 0 0 var(--e-4);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.umbral {
  margin-top: var(--e-5);
  padding-top: var(--e-4);
  border-top: 1px solid var(--borde);
  align-items: flex-start;
}

.umbral :deep(.campo) {
  width: 100%;
}

.confirmacion {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-2);
  padding: var(--e-4) 0;
  text-align: center;
}

.confirmacion p {
  margin: 0;
}

.confirmacion__cambio {
  font-size: clamp(2.25rem, 8vw, 3rem);
  font-weight: var(--peso-extra);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.confirmacion__cambio.es-suma {
  color: var(--exito);
}

.confirmacion__cambio.es-resta {
  color: var(--error);
}

.confirmacion__producto {
  font-size: var(--txt-lg);
  font-weight: var(--peso-semi);
}
</style>
