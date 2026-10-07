<script setup>
import { onMounted, computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useConfiguracion } from '@/stores/configuracion'
import { useAuth } from '@/stores/auth'
import FiltrosDaltonismo from '@/components/accesibilidad/FiltrosDaltonismo.vue'
import AvisoSinConexion from '@/components/avisos/AvisoSinConexion.vue'
import PilaDeAvisos from '@/components/avisos/PilaDeAvisos.vue'
import DialogoConfirmar from '@/components/avisos/DialogoConfirmar.vue'
import ArmazonApp from '@/components/estructura/ArmazonApp.vue'

const configuracion = useConfiguracion()
const auth = useAuth()
const route = useRoute()

/**
 * Con sesion iniciada, la app lleva navegacion (barra inferior o lateral).
 * Las pantallas de entrada y el panel de administracion traen la suya.
 */
const conArmazon = computed(
  () =>
    auth.haySesion &&
    !route.meta.soloInvitados &&
    !route.path.startsWith('/admin') &&
    !auth.soloPanel
)

/** Anuncio para lectores de pantalla cuando cambia de pagina. */
const anuncioRuta = ref('')
watch(
  () => route.fullPath,
  () => {
    anuncioRuta.value = route.meta.titulo
      ? `${route.meta.titulo}. Página cargada.`
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

  <ArmazonApp v-if="conArmazon">
    <RouterView v-slot="{ Component, route: r }">
      <Transition name="pagina" mode="out-in">
        <component :is="Component" id="contenido" :key="r.path" />
      </Transition>
    </RouterView>
  </ArmazonApp>

  <div v-else class="aplicacion">
    <RouterView v-slot="{ Component, route: r }">
      <Transition name="pagina" mode="out-in">
        <component
          :is="Component"
          id="contenido"
          :key="r.matched[0]?.path ?? r.path"
        />
      </Transition>
    </RouterView>
  </div>

  <PilaDeAvisos />
  <DialogoConfirmar />

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
