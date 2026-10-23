import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'

/** setTimeout no acepta esperas de mas de ~24 dias. */
const ESPERA_MAXIMA = 2 ** 31 - 1

/**
 * Sanciones de la soda. La persona ve si puede pedir y su historial; la
 * administracion ve los pedidos no recogidos y el panel de sanciones. La API
 * vuelve a revisar todo: aqui solo se decide que mostrar.
 */
export const useSanciones = defineStore('sanciones', () => {
  /** Sancion que bloquea a la persona actual: { razon, hasta, permanente, mensaje }. */
  const sancion = ref(null)
  const cargado = ref(false)
  const historial = ref([])
  let temporizador = null

  const bloqueado = computed(() => Boolean(sancion.value))

  /** Cuando vence, se vuelve a preguntar: la API manda el aviso de fin. */
  function programarFin() {
    clearTimeout(temporizador)
    if (!sancion.value || sancion.value.permanente) return
    const falta = new Date(sancion.value.hasta) - Date.now()
    if (falta > ESPERA_MAXIMA) return
    temporizador = setTimeout(cargarEstado, Math.max(0, falta) + 1000)
  }

  async function cargarEstado() {
    const datos = await api.get('/sanciones/mi-estado')
    sancion.value = datos.sancion
    cargado.value = true
    programarFin()
    return sancion.value
  }

  async function cargarHistorial() {
    const datos = await api.get('/sanciones/mi-historial')
    historial.value = datos.historial
    return historial.value
  }

  function limpiar() {
    clearTimeout(temporizador)
    sancion.value = null
    cargado.value = false
    historial.value = []
  }

  // --- Administracion ---

  const noRecogidos = ref([])

  async function cargarNoRecogidos() {
    const datos = await api.get('/sanciones/no-recogidos')
    noRecogidos.value = datos.pedidos
    return noRecogidos.value
  }

  function quitarCaso(codigo) {
    noRecogidos.value = noRecogidos.value.filter((p) => p.codigo !== codigo)
  }

  async function alertar(codigo, mensaje = '') {
    const datos = await api.post(`/sanciones/no-recogidos/${codigo}/alertar`, {
      mensaje,
    })
    quitarCaso(codigo)
    return datos.alerta
  }

  async function descartar(codigo) {
    await api.post(`/sanciones/no-recogidos/${codigo}/descartar`)
    quitarCaso(codigo)
  }

  async function buscarUsuarios(texto = '') {
    const datos = await api.get(
      `/sanciones/usuarios?buscar=${encodeURIComponent(texto)}`
    )
    return datos.usuarios
  }

  async function historialDe(usuarioId) {
    return api.get(`/sanciones/usuario/${usuarioId}`)
  }

  async function sancionar(datos) {
    const r = await api.post('/sanciones', datos)
    if (datos.pedidoCodigo) quitarCaso(datos.pedidoCodigo)
    return r.sancion
  }

  async function levantar(id) {
    const r = await api.post(`/sanciones/${id}/levantar`)
    return r.sancion
  }

  return {
    sancion,
    cargado,
    bloqueado,
    historial,
    cargarEstado,
    cargarHistorial,
    limpiar,
    noRecogidos,
    cargarNoRecogidos,
    alertar,
    descartar,
    buscarUsuarios,
    historialDe,
    sancionar,
    levantar,
  }
})
