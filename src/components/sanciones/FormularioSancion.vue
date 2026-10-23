<script setup>
import { computed, ref, watch } from 'vue'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Campo from '@/components/formularios/Campo.vue'
import { useSanciones } from '@/stores/sanciones'
import { useAvisos } from '@/stores/avisos'
import { usarErrores } from '@/lib/errores'
import { partesCR } from '@compartido/hora.js'
import { DURACIONES, calcularFin, textoFin } from '@compartido/sanciones.js'

/**
 * Formulario para sancionar a alguien. Se abre desde un pedido no recogido
 * (con la razon y el pedido ya puestos) o desde el buscador del panel.
 */
const props = defineProps({
  abierto: { type: Boolean, default: false },
  /** { id, nombre, sancionActiva } */
  usuario: { type: Object, default: null },
  razonInicial: { type: String, default: '' },
  pedidoCodigo: { type: String, default: '' },
})
const emit = defineEmits(['cerrar', 'sancionado'])

const sanciones = useSanciones()
const avisos = useAvisos()
const { errores, limpiar, mostrar } = usarErrores()

const razon = ref('')
const duracion = ref('1d')
const fecha = ref('')
const hora = ref('15:30')
const guardando = ref(false)

const hoy = computed(() => partesCR().iso)

watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return
    limpiar()
    razon.value = props.razonInicial
    duracion.value = '1d'
    fecha.value = ''
    hora.value = '15:30'
  }
)

const hasta = computed(() =>
  duracion.value === 'personalizada' && fecha.value && hora.value
    ? `${fecha.value}T${hora.value}`
    : undefined
)

const fin = computed(() => calcularFin(duracion.value, { hasta: hasta.value }))

async function guardar() {
  if (!props.usuario) return
  guardando.value = true
  try {
    const sancion = await sanciones.sancionar({
      usuarioId: props.usuario.id,
      razon: razon.value,
      duracion: duracion.value,
      hasta: hasta.value,
      pedidoCodigo: props.pedidoCodigo || undefined,
    })
    avisos.exito(`Sanción aplicada a ${props.usuario.nombre}.`)
    emit('sancionado', sancion)
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
    :titulo="`Sancionar a ${usuario?.nombre ?? ''}`"
    descripcion="No podrá hacer pedidos en la soda hasta que termine. El resto de CitX le sigue funcionando."
    @cerrar="emit('cerrar')"
  >
    <form
      id="form-sancion"
      class="formulario"
      novalidate
      @submit.prevent="guardar"
    >
      <p v-if="usuario?.sancionActiva" class="nota nota--aviso">
        Ya tiene una sanción activa. Esta la reemplaza y la anterior queda en el
        historial como «reemplazada».
      </p>
      <p v-if="pedidoCodigo" class="nota">
        Por el pedido no recogido {{ pedidoCodigo }}.
      </p>

      <Campo
        id="sancion-razon"
        v-model="razon"
        etiqueta="Razón"
        tipo="textarea"
        obligatorio
        :maximo="300"
        ayuda="La persona la va a ver en su notificación y en la soda."
        :error="errores.razon"
      />

      <fieldset class="duraciones">
        <legend class="campo__etiqueta">Duración</legend>
        <div class="chips">
          <label
            v-for="(d, clave) in DURACIONES"
            :key="clave"
            class="chip"
            :class="{ 'es-elegida': duracion === clave }"
          >
            <input
              v-model="duracion"
              type="radio"
              name="sancion-duracion"
              :value="clave"
              class="solo-lectores"
            />
            {{ d.texto }}
          </label>
        </div>
        <p v-if="errores.duracion" class="campo__error">
          {{ errores.duracion }}
        </p>
      </fieldset>

      <div v-if="duracion === 'personalizada'" class="personalizada">
        <Campo
          id="sancion-fecha"
          v-model="fecha"
          etiqueta="Hasta el día"
          tipo="date"
          :min="hoy"
          :error="errores.hasta"
        />
        <Campo
          id="sancion-hora"
          v-model="hora"
          etiqueta="A la hora"
          tipo="time"
        />
      </div>

      <p class="resumen-fin" aria-live="polite">
        <template v-if="duracion === 'permanente'"
          >Sanción permanente: solo administración la puede levantar.</template
        >
        <template v-else-if="fin"
          >Podrá volver a pedir: <strong>{{ textoFin(fin) }}</strong></template
        >
        <template v-else>Elegí una fecha y hora que no hayan pasado.</template>
      </p>
    </form>
    <template #pie>
      <button
        type="button"
        class="boton boton--contorno"
        @click="emit('cerrar')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="form-sancion"
        class="boton boton--peligro"
        :disabled="guardando || !razon.trim() || !fin"
      >
        {{ guardando ? 'Sancionando...' : 'Sancionar' }}
      </button>
    </template>
  </Dialogo>
</template>

<style scoped>
.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.formulario > .nota {
  margin: 0;
}

.duraciones {
  margin: 0;
  padding: 0;
  border: 0;
}

.duraciones .chips {
  flex-wrap: wrap;
  margin-top: var(--e-2);
}

.chip {
  cursor: pointer;
}

.chip.es-elegida {
  border-color: var(--error);
  background: var(--error-fondo);
  color: var(--error);
}

.chip:has(input:focus-visible) {
  outline: 2px solid var(--principal);
  outline-offset: 2px;
}

.personalizada {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--e-3);
}

.resumen-fin {
  margin: 0;
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}
</style>
