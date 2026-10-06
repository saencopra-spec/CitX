<script setup>
import { onMounted, computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useConfiguracion } from '@/stores/configuracion'
import FiltrosDaltonismo from '@/components/FiltrosDaltonismo.vue'
import AvisoSinConexion from '@/components/AvisoSinConexion.vue'
import PilaDeAvisos from '@/components/PilaDeAvisos.vue'

const configuracion = useConfiguracion()
const route = useRoute()

/** Las pantallas de bienvenida y el panel traen su propio armazon. */
const sinArmazon = computed(
  () => route.meta.publica || route.path.startsWith('/admin')
)

/** Anuncio para lectores de pantalla cuando cambia de pagina. */
const anuncioRuta = ref('')
watch(
  () => route.fullPath,
  () => {
    anuncioRuta.value = route.meta.titulo
      ? `${route.meta.titulo}. Pagina cargada.`
      : ''
  }
)

onMounted(() => {
  configuracion.aplicarAlDocumento()
  configuracion.escucharSistema()
})
</script>

<template>
  <FiltrosDaltonismo />

  <a class="saltar-contenido" href="#contenido">Saltar al contenido</a>

  <AvisoSinConexion />

  <div class="aplicacion" :class="{ 'aplicacion--simple': sinArmazon }">
    <RouterView v-slot="{ Component }">
      <Transition name="pagina" mode="out-in">
        <component :is="Component" id="contenido" />
      </Transition>
    </RouterView>
  </div>

  <PilaDeAvisos />

  <p class="solo-lectores" role="status" aria-live="polite">
    {{ anuncioRuta }}
  </p>
</template>

<style scoped>
.aplicacion {
  position: relative;
  min-height: 100dvh;
}
</style>
