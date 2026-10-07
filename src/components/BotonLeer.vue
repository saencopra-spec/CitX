<script setup>
import { onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Volume2, Square } from 'lucide-vue-next'
import { useConfiguracion } from '@/stores/configuracion'
import {
  hablando,
  vozDisponible,
  leerEnVoz,
  detenerVoz,
  textoDePantalla,
} from '@/lib/voz'

/** Boton flotante para leer la pantalla en voz alta. Aparece si se activa en la configuracion. */
const configuracion = useConfiguracion()
const route = useRoute()

function alternar() {
  if (hablando.value) detenerVoz()
  else leerEnVoz(textoDePantalla())
}

// Si se cambia de pagina, se deja de leer la anterior.
watch(() => route.fullPath, detenerVoz)
onUnmounted(detenerVoz)
</script>

<template>
  <button
    v-if="configuracion.ajustes.lecturaVoz && vozDisponible"
    type="button"
    class="leer"
    :class="{ 'leer--activo': hablando }"
    :aria-pressed="hablando"
    @click="alternar"
  >
    <component
      :is="hablando ? Square : Volume2"
      :size="20"
      aria-hidden="true"
    />
    <span>{{ hablando ? 'Detener lectura' : 'Leer en voz alta' }}</span>
  </button>
</template>

<style scoped>
.leer {
  position: fixed;
  right: var(--e-4);
  bottom: calc(
    var(--alto-barra-inferior) + env(safe-area-inset-bottom) + var(--e-4)
  );
  z-index: var(--z-barra);
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  min-height: var(--objetivo-tactil);
  padding: 0 var(--e-4);
  border-radius: var(--radio-pildora);
  background: var(--marca);
  color: #ffffff;
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
  box-shadow: var(--sombra-3);
}

:root[data-tema='oscuro'] .leer {
  color: var(--gris-950);
}

.leer--activo {
  background: var(--error);
  color: #ffffff;
}

@media (min-width: 1024px) {
  .leer {
    bottom: var(--e-6);
    right: var(--e-6);
  }
}
</style>
