/**
 * Notificaciones del sistema (las que salen fuera de la pagina) y un sonido
 * corto para el tablero de la soda. Todo es opcional: si el navegador no lo
 * permite, la app sigue funcionando con los avisos internos.
 */

export const notificacionesSoportadas =
  typeof window !== 'undefined' && 'Notification' in window

export function permisoNotificaciones() {
  return notificacionesSoportadas ? Notification.permission : 'denied'
}

export async function pedirPermisoNotificaciones() {
  if (!notificacionesSoportadas) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function notificarNavegador(titulo, cuerpo, enlace) {
  if (!notificacionesSoportadas || Notification.permission !== 'granted') return
  try {
    const n = new Notification(titulo, {
      body: cuerpo,
      icon: '/icons/icon-192.png',
      lang: 'es-CR',
    })
    if (enlace) {
      n.onclick = () => {
        window.focus()
        window.location.assign(enlace)
      }
    }
  } catch {
    // En algunos celulares solo se puede notificar desde el service worker.
  }
}

let contextoAudio = null

/** Dos tonos cortos, sin archivos de sonido. */
export function sonarCampana() {
  try {
    contextoAudio ??= new (window.AudioContext || window.webkitAudioContext)()
    const ahora = contextoAudio.currentTime
    ;[880, 1320].forEach((frecuencia, i) => {
      const osc = contextoAudio.createOscillator()
      const vol = contextoAudio.createGain()
      osc.type = 'sine'
      osc.frequency.value = frecuencia
      vol.gain.setValueAtTime(0.0001, ahora + i * 0.16)
      vol.gain.exponentialRampToValueAtTime(0.25, ahora + i * 0.16 + 0.02)
      vol.gain.exponentialRampToValueAtTime(0.0001, ahora + i * 0.16 + 0.3)
      osc.connect(vol).connect(contextoAudio.destination)
      osc.start(ahora + i * 0.16)
      osc.stop(ahora + i * 0.16 + 0.32)
    })
  } catch {
    // Sin audio disponible.
  }
}
