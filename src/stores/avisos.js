import { defineStore } from 'pinia'
import { ref } from 'vue'

let siguienteId = 1

/**
 * Avisos cortos que aparecen abajo (o arriba en pantalla grande) y se van
 * solos. Sirven para confirmar acciones: "Producto agregado", "Pedido listo".
 */
export const useAvisos = defineStore('avisos', () => {
  const lista = ref([])

  function mostrar(mensaje, opciones = {}) {
    const aviso = {
      id: siguienteId++,
      mensaje,
      tipo: opciones.tipo || 'info', // info | exito | error | aviso
      duracion: opciones.duracion ?? 4000,
      accion: opciones.accion || null, // { texto, alPulsar }
    }
    lista.value.push(aviso)
    if (aviso.duracion > 0) {
      setTimeout(() => cerrar(aviso.id), aviso.duracion)
    }
    return aviso.id
  }

  const exito = (m, o) => mostrar(m, { ...o, tipo: 'exito' })
  const error = (m, o) => mostrar(m, { ...o, tipo: 'error', duracion: 6000 })
  const aviso = (m, o) => mostrar(m, { ...o, tipo: 'aviso' })

  function cerrar(id) {
    lista.value = lista.value.filter((a) => a.id !== id)
  }

  return { lista, mostrar, exito, error, aviso, cerrar }
})
