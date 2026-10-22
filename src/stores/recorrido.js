import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Recorrido guiado: la primera vez que alguien entra, la pantalla se oscurece
 * y se explica cada parte de la app. Se recuerda por persona en este
 * navegador; desde Configuracion se puede volver a ver.
 */
const LLAVE = 'citx-recorrido-visto'

function llaveDe(id) {
  return `${LLAVE}:${id || 'invitado'}`
}

export const useRecorrido = defineStore('recorrido', () => {
  const abierto = ref(false)

  function yaLoVio(id) {
    try {
      return localStorage.getItem(llaveDe(id)) === '1'
    } catch {
      // Sin almacenamiento no lo mostramos solo, para no repetirlo siempre.
      return true
    }
  }

  function marcarVisto(id) {
    try {
      localStorage.setItem(llaveDe(id), '1')
    } catch {
      // Nada que hacer: se volvera a ofrecer la proxima vez.
    }
  }

  function iniciar() {
    abierto.value = true
  }

  function cerrar(id) {
    abierto.value = false
    marcarVisto(id)
  }

  return { abierto, yaLoVio, marcarVisto, iniciar, cerrar }
})
