import { onMounted, onUnmounted } from 'vue'

/**
 * Consulta algo cada cierto tiempo mientras la pestana esta visible.
 *
 * Vercel no mantiene conexiones abiertas (WebSockets), asi que el estado "en
 * vivo" de los pedidos se logra preguntando cada pocos segundos. Cuando la
 * pestana se oculta dejamos de preguntar para no gastar datos ni bateria, y al
 * volver se consulta de inmediato.
 */
export function usarSondeo(
  tarea,
  intervaloMs = 5000,
  { inmediato = true } = {}
) {
  let temporizador = null
  let activo = false
  let ocupado = false

  async function tick() {
    if (ocupado) return
    ocupado = true
    try {
      await tarea()
    } catch {
      // Un fallo suelto (por ejemplo sin senal) no detiene el sondeo.
    } finally {
      ocupado = false
    }
  }

  function arrancar() {
    if (activo) return
    activo = true
    if (inmediato) tick()
    temporizador = setInterval(tick, intervaloMs)
  }

  function detener() {
    activo = false
    clearInterval(temporizador)
    temporizador = null
  }

  function alCambiarVisibilidad() {
    if (document.hidden) detener()
    else arrancar()
  }

  onMounted(() => {
    if (!document.hidden) arrancar()
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
  })

  onUnmounted(() => {
    detener()
    document.removeEventListener('visibilitychange', alCambiarVisibilidad)
  })

  return { refrescar: tick, detener, arrancar }
}
