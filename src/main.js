import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { aplicarConfiguracionTemprana } from './stores/configuracion'

import './styles/tokens.css'
import './styles/base.css'

// Antes de montar nada: aplicamos tema, tamano de texto y demas ajustes
// guardados, para que no se vea un parpadeo al cargar.
aplicarConfiguracionTemprana()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
