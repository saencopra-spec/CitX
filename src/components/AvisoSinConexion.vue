<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { WifiOff } from 'lucide-vue-next'

const sinConexion = ref(false)

function actualizar() {
  sinConexion.value = !navigator.onLine
}

onMounted(() => {
  actualizar()
  window.addEventListener('online', actualizar)
  window.addEventListener('offline', actualizar)
})

onUnmounted(() => {
  window.removeEventListener('online', actualizar)
  window.removeEventListener('offline', actualizar)
})
</script>

<template>
  <Transition name="barra-conexion">
    <div
      v-if="sinConexion"
      class="sin-conexion"
      role="status"
      aria-live="polite"
    >
      <WifiOff :size="18" aria-hidden="true" />
      <p>
        Estas sin internet. Podes ver el mapa y la guia, pero no se pueden hacer
        pedidos hasta que vuelva la conexion.
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.sin-conexion {
  position: sticky;
  top: 0;
  z-index: var(--z-aviso);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--e-3);
  padding: var(--e-3) var(--margen-lateral);
  background: var(--aviso-fondo);
  color: var(--aviso);
  border-bottom: 1px solid currentcolor;
  font-size: var(--txt-sm);
  font-weight: var(--peso-medio);
  text-align: left;
}

.sin-conexion svg {
  flex-shrink: 0;
}

.barra-conexion-enter-active,
.barra-conexion-leave-active {
  transition:
    opacity var(--dur-media) var(--curva),
    transform var(--dur-media) var(--curva);
}

.barra-conexion-enter-from,
.barra-conexion-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
