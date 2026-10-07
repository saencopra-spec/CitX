<script setup>
import Dialogo from './Dialogo.vue'
import { useConfirmar } from '@/stores/confirmar'

const confirmar = useConfirmar()
</script>

<template>
  <Dialogo
    :abierto="confirmar.abierto"
    :titulo="confirmar.opciones.titulo ?? ''"
    modo="centro"
    encima
    ancho="26rem"
    @cerrar="confirmar.responder(false)"
  >
    <p class="mensaje">{{ confirmar.opciones.mensaje }}</p>
    <template #pie>
      <button
        type="button"
        class="boton boton--contorno"
        @click="confirmar.responder(false)"
      >
        {{ confirmar.opciones.cancelar }}
      </button>
      <button
        type="button"
        class="boton"
        :class="confirmar.opciones.peligro ? 'boton--peligro' : 'boton--accion'"
        @click="confirmar.responder(true)"
      >
        {{ confirmar.opciones.aceptar }}
      </button>
    </template>
  </Dialogo>
</template>

<style scoped>
.mensaje {
  color: var(--texto-suave);
  line-height: var(--alto-amplio);
}
</style>
