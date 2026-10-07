import { ref } from 'vue'

/**
 * Lectura en voz alta con la Web Speech API del navegador, en espanol.
 * Prefiere una voz de Costa Rica o de Latinoamerica si el equipo la tiene.
 */
export const hablando = ref(false)

export const vozDisponible =
  typeof window !== 'undefined' && 'speechSynthesis' in window

function elegirVoz() {
  const voces = window.speechSynthesis.getVoices()
  const preferencias = ['es-CR', 'es-MX', 'es-US', 'es-419', 'es-CO', 'es']
  for (const idioma of preferencias) {
    const voz = voces.find((v) =>
      v.lang?.toLowerCase().startsWith(idioma.toLowerCase())
    )
    if (voz) return voz
  }
  return null
}

export function leerEnVoz(texto) {
  if (!vozDisponible || !texto) return
  detenerVoz()
  // Los textos largos se cortan en algunos navegadores: leemos por partes.
  const partes = texto
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?:])\s+/)
    .reduce((acc, frase) => {
      const ultima = acc[acc.length - 1]
      if (ultima && ultima.length + frase.length < 220)
        acc[acc.length - 1] = `${ultima} ${frase}`
      else acc.push(frase)
      return acc
    }, [])

  const voz = elegirVoz()
  hablando.value = true
  partes.forEach((parte, i) => {
    const u = new SpeechSynthesisUtterance(parte)
    u.lang = voz?.lang ?? 'es-CR'
    if (voz) u.voice = voz
    u.rate = 1
    if (i === partes.length - 1) {
      u.onend = () => (hablando.value = false)
      u.onerror = () => (hablando.value = false)
    }
    window.speechSynthesis.speak(u)
  })
}

export function detenerVoz() {
  if (!vozDisponible) return
  window.speechSynthesis.cancel()
  hablando.value = false
}

/** Texto visible del contenido principal, sin menus ni botones repetidos. */
export function textoDePantalla() {
  const principal = document.querySelector('#contenido') ?? document.body
  const copia = principal.cloneNode(true)
  copia
    .querySelectorAll(
      '[aria-hidden="true"], .solo-lectores, script, style, svg'
    )
    .forEach((n) => n.remove())
  return copia.innerText ?? copia.textContent ?? ''
}
