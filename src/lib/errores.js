import { reactive } from 'vue'
import { useAvisos } from '@/stores/avisos'

/**
 * Manejo comun de errores de formularios: los errores por campo se muestran
 * junto a cada control y el mensaje general en un aviso.
 */
export function usarErrores() {
  const errores = reactive({})

  function limpiar() {
    for (const k of Object.keys(errores)) delete errores[k]
  }

  function mostrar(error, { aviso = true } = {}) {
    limpiar()
    if (error?.campos) Object.assign(errores, error.campos)
    if (aviso) {
      useAvisos().error(error?.message || 'Algo salió mal. Intentá de nuevo.')
    }
  }

  return { errores, limpiar, mostrar }
}

/** Opciones de seccion agrupadas por nivel, para los select. */
export function opcionesSeccion(secciones, nombreNivel) {
  const grupos = {}
  for (const s of secciones) {
    const nivel = s.split('-')[0]
    ;(grupos[nivel] ??= []).push({ valor: s, texto: s })
  }
  return Object.entries(grupos).map(([nivel, opciones]) => ({
    grupo: nombreNivel[nivel] ?? nivel,
    opciones,
  }))
}
