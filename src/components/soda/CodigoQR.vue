<script setup>
import { ref, watchEffect } from 'vue'
import QRCode from 'qrcode'

/** QR dibujado en el navegador, sin depender de servicios externos. */
const props = defineProps({
  texto: { type: String, required: true },
  tamano: { type: Number, default: 200 },
  alt: { type: String, default: 'Código QR' },
})

const imagen = ref('')

watchEffect(async () => {
  imagen.value = await QRCode.toDataURL(props.texto, {
    width: props.tamano * 2,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#15234a', light: '#ffffff' },
  })
})
</script>

<template>
  <img
    v-if="imagen"
    :src="imagen"
    :alt="alt"
    :width="tamano"
    :height="tamano"
    class="qr"
  />
  <div
    v-else
    class="qr esqueleto"
    :style="{ width: `${tamano}px`, height: `${tamano}px` }"
  />
</template>

<style scoped>
.qr {
  border-radius: var(--radio-md);
  background: #ffffff;
  padding: 6px;
}
</style>
