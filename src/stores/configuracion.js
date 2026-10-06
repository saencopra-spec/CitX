import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { api } from '@/lib/api'

const CLAVE = 'citx:configuracion'

/**
 * Valores por defecto. Se guardan en el navegador para que la configuracion
 * aplique antes de iniciar sesion, y en la cuenta del usuario para que lo siga
 * en cualquier dispositivo.
 */
function porDefecto() {
  return {
    tema: 'sistema', // 'claro' | 'oscuro' | 'sistema'
    tamanoTexto: 'normal', // 'normal' | 'grande' | 'mas-grande' | 'enorme'
    altoContraste: false,
    reducirMovimiento: 'sistema', // 'sistema' | 'si' | 'no'
    dislexia: false,
    daltonismo: 'ninguno', // 'ninguno' | 'protanopia' | 'deuteranopia' | 'tritanopia'
    botonesGrandes: false,
    lecturaVoz: false,
    sonidoPedidos: true,
  }
}

function leerGuardado() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return porDefecto()
    return { ...porDefecto(), ...JSON.parse(crudo) }
  } catch {
    return porDefecto()
  }
}

export const useConfiguracion = defineStore('configuracion', () => {
  const ajustes = ref(leerGuardado())
  const sincronizando = ref(false)

  const temaSistemaOscuro = ref(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const temaEfectivo = computed(() => {
    if (ajustes.value.tema === 'sistema') {
      return temaSistemaOscuro.value ? 'oscuro' : 'claro'
    }
    return ajustes.value.tema
  })

  const movimientoReducido = computed(() => {
    if (ajustes.value.reducirMovimiento === 'si') return true
    if (ajustes.value.reducirMovimiento === 'no') return false
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  })

  /** Escribe los ajustes como atributos en <html> para que el CSS reaccione. */
  function aplicarAlDocumento() {
    if (typeof document === 'undefined') return
    const raiz = document.documentElement
    const a = ajustes.value

    raiz.dataset.tema = temaEfectivo.value
    raiz.dataset.texto = a.tamanoTexto
    raiz.dataset.contraste = a.altoContraste ? 'alto' : 'normal'
    raiz.dataset.dislexia = a.dislexia ? 'si' : 'no'
    raiz.dataset.daltonismo = a.daltonismo
    raiz.dataset.tactil = a.botonesGrandes ? 'grande' : 'normal'

    if (a.reducirMovimiento === 'si') raiz.dataset.movimiento = 'reducido'
    else if (a.reducirMovimiento === 'no') raiz.dataset.movimiento = 'completo'
    else delete raiz.dataset.movimiento

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute(
        'content',
        temaEfectivo.value === 'oscuro' ? '#0d1117' : '#04afa8'
      )
    }
  }

  function guardarLocal() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(ajustes.value))
    } catch {
      // Si el navegador bloquea el almacenamiento seguimos igual, solo que la
      // configuracion no se recuerda en la proxima visita.
    }
  }

  /** Cambia un ajuste, lo aplica y lo guarda. */
  async function cambiar(clave, valor, guardarEnCuenta = true) {
    ajustes.value = { ...ajustes.value, [clave]: valor }
    aplicarAlDocumento()
    guardarLocal()
    if (guardarEnCuenta) await sincronizarCuenta()
  }

  function restablecer() {
    ajustes.value = porDefecto()
    aplicarAlDocumento()
    guardarLocal()
    sincronizarCuenta()
  }

  /** Guarda los ajustes en la cuenta. Si no hay sesion, falla en silencio. */
  let temporizador = null
  async function sincronizarCuenta() {
    clearTimeout(temporizador)
    temporizador = setTimeout(async () => {
      try {
        sincronizando.value = true
        await api.put('/configuracion', ajustes.value)
      } catch {
        // Sin sesion o sin internet: la configuracion local ya quedo guardada.
      } finally {
        sincronizando.value = false
      }
    }, 600)
  }

  /** Al iniciar sesion, trae los ajustes guardados en la cuenta. */
  function adoptarDeCuenta(remotos) {
    if (!remotos || typeof remotos !== 'object') return
    ajustes.value = { ...porDefecto(), ...remotos }
    aplicarAlDocumento()
    guardarLocal()
  }

  function escucharSistema() {
    if (typeof window === 'undefined') return
    const mqTema = window.matchMedia('(prefers-color-scheme: dark)')
    const mqMov = window.matchMedia('(prefers-reduced-motion: reduce)')
    const alCambiarTema = (e) => {
      temaSistemaOscuro.value = e.matches
      aplicarAlDocumento()
    }
    mqTema.addEventListener('change', alCambiarTema)
    mqMov.addEventListener('change', aplicarAlDocumento)
  }

  watch(temaEfectivo, aplicarAlDocumento)

  return {
    ajustes,
    sincronizando,
    temaEfectivo,
    movimientoReducido,
    cambiar,
    restablecer,
    aplicarAlDocumento,
    adoptarDeCuenta,
    escucharSistema,
  }
})

/**
 * Aplica la configuracion guardada lo antes posible, antes de montar Vue, para
 * que no se vea un parpadeo de tema claro cuando el usuario eligio oscuro.
 */
export function aplicarConfiguracionTemprana() {
  if (typeof document === 'undefined') return
  const a = leerGuardado()
  const raiz = document.documentElement
  const oscuroSistema = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
  raiz.dataset.tema =
    a.tema === 'sistema' ? (oscuroSistema ? 'oscuro' : 'claro') : a.tema
  raiz.dataset.texto = a.tamanoTexto
  raiz.dataset.contraste = a.altoContraste ? 'alto' : 'normal'
  raiz.dataset.dislexia = a.dislexia ? 'si' : 'no'
  raiz.dataset.daltonismo = a.daltonismo
  raiz.dataset.tactil = a.botonesGrandes ? 'grande' : 'normal'
  if (a.reducirMovimiento === 'si') raiz.dataset.movimiento = 'reducido'
  else if (a.reducirMovimiento === 'no') raiz.dataset.movimiento = 'completo'
}
