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

export const useAuth = defineStore('auth', () => {
  const usuario = ref(null)
  /** `listo` indica que ya preguntamos a la API si habia sesion abierta. */
  const listo = ref(false)
  const cargando = ref(false)

  const haySesion = computed(() => Boolean(usuario.value))
  const esAdmin = computed(() => usuario.value?.rol === 'admin')
  const esPersonalSoda = computed(() => usuario.value?.rol === 'soda')
  /** Soda y objetos perdidos trabajan solo en el panel, en su seccion. */
  const soloPanel = computed(() =>
    ROLES_SOLO_PANEL.includes(usuario.value?.rol)
  )

  /** Adonde va cada persona al entrar. */
  function inicioDe(u = usuario.value) {
    if (!u) return { name: 'empieza' }
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
    if (!usuario.value?.nombre) return ''
    return usuario.value.nombre.trim().split(/\s+/)[0]
  })

  const nombreRol = computed(() => ROLES[usuario.value?.rol] ?? '')

  /** Pregunta a la API quien es el usuario de la cookie de sesion. */
  async function cargarSesion() {
    if (cargando.value) return
    cargando.value = true
    try {
      const datos = await api.get('/auth/yo')
      usuario.value = datos?.usuario ?? null
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
    if (datos.usuario?.configuracion) {
      useConfiguracion().adoptarDeCuenta(datos.usuario.configuracion)
    }
    listo.value = true
    return datos.usuario
  }

  async function registrar(formulario) {
    const datos = await api.post('/auth/registro', formulario)
    usuario.value = datos.usuario
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
