import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Pregunta de confirmacion antes de acciones que no se pueden deshacer.
 * Uso: if (await confirmar.preguntar({ titulo, mensaje })) { ... }
 */
export const useConfirmar = defineStore('confirmar', () => {
  const abierto = ref(false)
  const opciones = ref({})
  let resolver = null

  function preguntar({
    titulo,
    mensaje,
    aceptar = 'Sí, borrar',
    cancelar = 'Cancelar',
    peligro = true,
  }) {
    opciones.value = { titulo, mensaje, aceptar, cancelar, peligro }
    abierto.value = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function responder(valor) {
    abierto.value = false
    resolver?.(valor)
    resolver = null
  }

  return { abierto, opciones, preguntar, responder }
})
