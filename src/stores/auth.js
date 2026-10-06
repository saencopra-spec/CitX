import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import { useConfiguracion } from './configuracion'

export const ROLES = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  administrativo: 'Personal administrativo',
  admin: 'Administrador',
  soda: 'Soda Armonia',
}

export const useAuth = defineStore('auth', () => {
  const usuario = ref(null)
  /** `listo` indica que ya preguntamos a la API si habia sesion abierta. */
  const listo = ref(false)
  const cargando = ref(false)

  const haySesion = computed(() => Boolean(usuario.value))
  const esAdmin = computed(() => usuario.value?.rol === 'admin')
  const esPersonalSoda = computed(() => usuario.value?.rol === 'soda')
  const esProfesor = computed(() => usuario.value?.rol === 'profesor')
  const esEstudiante = computed(() => usuario.value?.rol === 'estudiante')
  const puedeEntrarAlPanel = computed(
    () => esAdmin.value || esPersonalSoda.value
  )
  const puedePublicarEventos = computed(() => esAdmin.value || esProfesor.value)

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

  async function salir() {
    try {
      await api.post('/auth/salir')
    } finally {
      usuario.value = null
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
    esProfesor,
    esEstudiante,
    puedeEntrarAlPanel,
    puedePublicarEventos,
    nombreCorto,
    nombreRol,
    cargarSesion,
    entrar,
    registrar,
    salir,
    actualizarPerfil,
    cambiarContrasena,
  }
})
