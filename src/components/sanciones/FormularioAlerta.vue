<script setup>
import { ref, watch } from 'vue'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Campo from '@/components/formularios/Campo.vue'
import { useSanciones } from '@/stores/sanciones'
import { useAvisos } from '@/stores/avisos'
import { usarErrores } from '@/lib/errores'

/**
 * Alerta a una persona desde el buscador, sin un pedido no recogido de por
 * medio. No bloquea pedidos: solo le llega el aviso y queda en el historial.
 */
const props = defineProps({
  abierto: { type: Boolean, default: false },
  /** { id, nombre } */
  usuario: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'alertado'])

const sanciones = useSanciones()
const avisos = useAvisos()
const { errores, limpiar, mostrar } = usarErrores()

const razon = ref('')
const guardando = ref(false)

watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return
    limpiar()
    razon.value = ''
  }
)

async function guardar() {
  if (!props.usuario) return
  guardando.value = true
  try {
    const alerta = await sanciones.alertarPersona(props.usuario.id, razon.value)
    avisos.exito(`Alerta enviada a ${props.usuario.nombre}.`)
    emit('alertado', alerta)
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
    :titulo="`Alertar a ${usuario?.nombre ?? ''}`"
    descripcion="Le llega un aviso. Puede seguir pidiendo en la soda."
    @cerrar="emit('cerrar')"
  >
    <form
      id="form-alerta"
      class="formulario"
      novalidate
      @submit.prevent="guardar"
    >
      <Campo
        id="alerta-razon"
        v-model="razon"
        etiqueta="Razón"
        tipo="textarea"
        obligatorio
        :maximo="300"
        ayuda="La persona la va a ver en su notificación."
        :error="errores.razon"
      />
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
        form="form-alerta"
        class="boton boton--accion"
        :disabled="guardando || !razon.trim()"
      >
        {{ guardando ? 'Enviando...' : 'Enviar alerta' }}
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
</style>
