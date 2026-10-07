import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import { notificarNavegador } from '@/lib/avisosNavegador'
import { useAvisos } from './avisos'

/**
 * Centro de notificaciones dentro de la app (la campana). Se consulta cada
 * cierto tiempo; cuando llega algo nuevo se muestra un aviso y, si la persona
 * dio permiso, tambien una notificacion del navegador.
 */
export const useNotificaciones = defineStore('notificaciones', () => {
  const lista = ref([])
  const sinLeer = ref(0)
  const cargado = ref(false)
  let vistas = new Set()

  async function cargar({ avisarNuevas = true } = {}) {
    const datos = await api.get('/notificaciones')
    const nuevas = datos.notificaciones.filter(
      (n) => !n.leida && !vistas.has(n.id)
    )

    if (cargado.value && avisarNuevas) {
      const avisos = useAvisos()
      for (const n of nuevas.slice(0, 2)) {
        avisos.mostrar(n.titulo, {
          tipo: n.tipo === 'pedido' ? 'exito' : 'info',
          duracion: 6000,
        })
        notificarNavegador(n.titulo, n.cuerpo, n.enlace)
      }
    }

    vistas = new Set(datos.notificaciones.map((n) => n.id))
    lista.value = datos.notificaciones
    sinLeer.value = datos.sinLeer
    cargado.value = true
  }

  async function marcarLeida(id) {
    const n = lista.value.find((x) => x.id === id)
    if (!n || n.leida) return
    n.leida = true
    sinLeer.value = Math.max(0, sinLeer.value - 1)
    await api.patch(`/notificaciones/${id}`).catch(() => {})
  }

  async function marcarTodas() {
    lista.value.forEach((n) => (n.leida = true))
    sinLeer.value = 0
    await api.patch('/notificaciones/leer-todas').catch(() => {})
  }

  function limpiar() {
    lista.value = []
    sinLeer.value = 0
    cargado.value = false
    vistas = new Set()
  }

  return { lista, sinLeer, cargado, cargar, marcarLeida, marcarTodas, limpiar }
})
