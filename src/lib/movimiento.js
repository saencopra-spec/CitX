import gsap from 'gsap'
import { useConfiguracion } from '@/stores/configuracion'

/** true si la persona pidio reducir el movimiento (en CitX o en su sistema). */
export function sinMovimiento() {
  try {
    return useConfiguracion().movimientoReducido
  } catch {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
}

/**
 * Entrada escalonada suave de los elementos que coinciden con el selector.
 * No hace nada si se pidio reducir el movimiento.
 */
export function entradaEscalonada(
  contenedor,
  selector = '[data-entra]',
  opciones = {}
) {
  if (!contenedor || sinMovimiento()) return null
  const elementos = contenedor.querySelectorAll(selector)
  if (!elementos.length) return null
  return gsap.from(elementos, {
    opacity: 0,
    y: 14,
    duration: 0.45,
    stagger: 0.05,
    ease: 'power2.out',
    clearProps: 'opacity,transform',
    ...opciones,
  })
}

/** Pequeno salto para dar respuesta a una accion (por ejemplo el carrito). */
export function rebote(elemento) {
  if (!elemento || sinMovimiento()) return
  gsap.fromTo(
    elemento,
    { scale: 1 },
    { scale: 1.18, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' }
  )
}
