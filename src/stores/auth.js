import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import {
  NOMBRE_ROL,
  ROLES_SOLO_PANEL,
  puede as puedeRol,
} from '@compartido/permisos.js'
import { useConfiguracion } from './configuracion'
import { useNotificaciones } from './notificaciones'

export const ROLES = NOMBRE_ROL

const LLAVE_INVITADO = 'citx-invitado'

function leerInvitado() {
  try {
    return localStorage.getItem(LLAVE_INVITADO) === '1'
  } catch {
    return false
  }
}

function guardarInvitado(valor) {
  try {
    if (valor) localStorage.setItem(LLAVE_INVITADO, '1')
    else localStorage.removeItem(LLAVE_INVITADO)
  } catch {
    // Sin almacenamiento, el modo invitado dura hasta recargar.
  }
}

export const useAuth = defineStore('auth', () => {
  const usuario = ref(null)
  /** `listo` indica que ya preguntamos a la API si habia sesion abierta. */
  const listo = ref(false)
  const cargando = ref(false)

  /**
   * Modo invitado: se puede recorrer la app sin cuenta (mapa, eventos de
   * todo el colegio, menu de la soda, enfermeria), pero no pedir ni guardar.
   */
  const invitado = ref(leerInvitado())

  const haySesion = computed(() => Boolean(usuario.value))
  /** Esta dentro de la app, con cuenta o como invitado. */
  const dentro = computed(() => haySesion.value || invitado.value)

  function entrarComoInvitado() {
    invitado.value = true
    guardarInvitado(true)
  }

  function dejarDeSerInvitado() {
    invitado.value = false
    guardarInvitado(false)
  }
  const esAdmin = computed(() => usuario.value?.rol === 'admin')
  const esPersonalSoda = computed(() => usuario.value?.rol === 'soda')
  /** Soda y objetos perdidos trabajan solo en el panel, en su seccion. */
  const soloPanel = computed(() =>
    ROLES_SOLO_PANEL.includes(usuario.value?.rol)
  )

  /** Adonde va cada persona al entrar. */
  function inicioDe(u = usuario.value) {
    if (!u) return invitado.value ? { name: 'mapa' } : { name: 'empieza' }
    if (u.rol === 'soda') return { name: 'admin-pedidos' }
    if (u.rol === 'objetos') return { name: 'admin-objetos' }
    return { name: 'menu' }
  }
  const esProfesor = computed(() => usuario.value?.rol === 'profesor')
  const esEstudiante = computed(() => usuario.value?.rol === 'estudiante')
  const puedeEntrarAlPanel = computed(() => puede('panel.entrar'))
  const puedePublicarEventos = computed(() => puede('eventos.publicar'))

  /** Permiso del usuario actual segun compartido/permisos.js. */
  function puede(accion) {
    return Boolean(usuario.value) && puedeRol(usuario.value, accion)
  }

  function esFavorito(clave) {
    return (usuario.value?.favoritos ?? []).includes(clave)
  }

  async function alternarFavorito(clave) {
    const datos = await api.post(`/lugares/${clave}/favorito`)
    if (usuario.value) usuario.value.favoritos = datos.favoritos
    return datos.favorito
  }

  const nombreCorto = computed(() => {
    if (!usuario.value?.nombre) return invitado.value ? 'invitado' : ''
    return usuario.value.nombre.trim().split(/\s+/)[0]
  })

  const nombreRol = computed(() =>
    usuario.value
      ? (ROLES[usuario.value.rol] ?? '')
      : invitado.value
        ? 'Invitado'
        : ''
  )

  /** Pregunta a la API quien es el usuario de la cookie de sesion. */
  async function cargarSesion() {
    if (cargando.value) return
    cargando.value = true
    try {
      const datos = await api.get('/auth/yo')
      usuario.value = datos?.usuario ?? null
      if (usuario.value) dejarDeSerInvitado()
      if (datos?.usuario?.configuracion) {
        useConfiguracion().adoptarDeCuenta(datos.usuario.configuracion)
      }
    } catch {
      usuario.value = null
    } finally {
      listo.value = true
      cargando.value = false
    }
  }

  async function entrar(correo, contrasena) {
    const datos = await api.post('/auth/entrar', { correo, contrasena })
    usuario.value = datos.usuario
    dejarDeSerInvitado()
    if (datos.usuario?.configuracion) {
      useConfiguracion().adoptarDeCuenta(datos.usuario.configuracion)
    }
    listo.value = true
    return datos.usuario
  }

  async function registrar(formulario) {
    const datos = await api.post('/auth/registro', formulario)
    usuario.value = datos.usuario
    dejarDeSerInvitado()
    listo.value = true
    return datos.usuario
  }

  /** Usa un codigo de invitacion con la cuenta actual (pasa a ser personal). */
  async function canjear(codigo) {
    const datos = await api.post('/auth/canjear', { codigo })
    usuario.value = datos.usuario
    return datos.usuario
  }

  async function salir() {
    if (!usuario.value) {
      dejarDeSerInvitado()
      return
    }
    try {
      await api.post('/auth/salir')
    } finally {
      usuario.value = null
      useNotificaciones().limpiar()
    }
  }

  async function actualizarPerfil(cambios) {
    const datos = await api.put('/auth/perfil', cambios)
    usuario.value = datos.usuario
    return datos.usuario
  }

  async function cambiarContrasena(actual, nueva) {
    await api.put('/auth/contrasena', { actual, nueva })
  }

  return {
    usuario,
    listo,
    cargando,
    haySesion,
    invitado,
    dentro,
    entrarComoInvitado,
    dejarDeSerInvitado,
    esAdmin,
    esPersonalSoda,
    soloPanel,
    inicioDe,
    esProfesor,
    esEstudiante,
    puedeEntrarAlPanel,
    puedePublicarEventos,
    nombreCorto,
    nombreRol,
    puede,
    esFavorito,
    alternarFavorito,
    cargarSesion,
    entrar,
    registrar,
    canjear,
    salir,
    actualizarPerfil,
    cambiarContrasena,
  }
})
