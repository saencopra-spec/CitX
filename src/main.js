import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { aplicarConfiguracionTemprana } from './stores/configuracion'
import { revelar } from './lib/revelar'

import './styles/tokens.css'
import './styles/base.css'
import './styles/movimiento.css'

// Antes de montar nada: aplicamos tema, tamano de texto y demas ajustes
// guardados, para que no se vea un parpadeo al cargar.
aplicarConfiguracionTemprana()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('revelar', revelar)
app.mount('#app')

/**
 * La pantalla de carga de index.html se va cuando la primera pagina esta
 * lista. La primera vez de la sesion se deja ver completa (el logo se dibuja);
 * despues se va apenas se pueda.
 */
const inicioCarga = performance.now()
router.isReady().then(() => {
  const carga = document.getElementById('carga')
  if (!carga) return
  let vista
  try {
    vista = sessionStorage.getItem('citx-carga-vista') === '1'
    sessionStorage.setItem('citx-carga-vista', '1')
  } catch {
    vista = false
  }
  const reducido =
    document.documentElement.dataset.movimiento === 'reducido' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const minimo = vista || reducido ? 250 : 1500
  const espera = Math.max(0, minimo - (performance.now() - inicioCarga))
  setTimeout(() => {
    carga.classList.add('es-salida')
    setTimeout(() => carga.remove(), 600)
  }, espera)
})
