/**
 * Directiva v-revelar: el elemento aparece cuando entra en pantalla.
 * Uso: <section v-revelar> o <li v-revelar="{ lado: 'izquierda', retraso: 80 }">.
 * Se usa una sola vez por elemento; despues deja de observar.
 */

let observador = null

function obtenerObservador() {
  if (observador || typeof IntersectionObserver === 'undefined')
    return observador
  observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue
        entrada.target.classList.add('es-visible')
        observador.unobserve(entrada.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  )
  return observador
}

export const revelar = {
  mounted(el, { value = {} }) {
    el.dataset.revelar = value.lado ?? ''
    if (value.retraso) el.style.setProperty('--retraso', `${value.retraso}ms`)
    const obs = obtenerObservador()
    if (!obs) {
      el.classList.add('es-visible')
      return
    }
    obs.observe(el)
  },
  unmounted(el) {
    observador?.unobserve(el)
  },
}
