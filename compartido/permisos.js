/**
 * Quien puede hacer que. Lo usa la API (que es la que manda) y la interfaz
 * (solo para no mostrar botones que no le sirven a esa persona).
 *
 * Cada rol trae permisos por defecto. La administracion puede ajustar los
 * permisos de cada persona del personal (por ejemplo, darle a alguien de
 * secretaria el permiso de objetos perdidos). Los permisos de administrar
 * usuarios y ver la bitacora solo los tiene el rol de administrador.
 */

export const ROLES = [
  'estudiante',
  'profesor',
  'administrativo',
  'admin',
  'soda',
]

export const NOMBRE_ROL = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  administrativo: 'Personal administrativo',
  admin: 'Administrador',
  soda: 'Soda Armonía',
}

/** Roles del personal: solo se obtienen con un codigo de invitacion. */
export const ROLES_PERSONAL = ['profesor', 'administrativo', 'soda', 'admin']

export const PERMISOS = {
  'eventos.publicar': {
    nombre: 'Publicar eventos',
    explica: 'Crear eventos para todo el colegio o para algunas secciones.',
  },
  'eventos.gestionarTodos': {
    nombre: 'Administrar todos los eventos',
    explica: 'Editar o borrar eventos que publicaron otras personas.',
  },
  'anuncios.publicar': {
    nombre: 'Enviar anuncios',
    explica:
      'Mandar avisos que llegan a la campanita de todos o de algunas secciones.',
  },
  'recordatorios.publicarSecciones': {
    nombre: 'Recordatorios para secciones',
    explica:
      'Enviar recordatorios a los estudiantes de una o varias secciones.',
  },
  'pedidos.gestionar': {
    nombre: 'Atender pedidos de la soda',
    explica: 'Ver el tablero de pedidos y cambiar su estado.',
  },
  'productos.gestionar': {
    nombre: 'Menú de la soda',
    explica: 'Crear productos, cambiar precios y marcar agotados.',
  },
  'reportes.ver': {
    nombre: 'Reportes de ventas',
    explica: 'Ver qué se vende más, ingresos por día y horas pico.',
  },
  'objetos.gestionar': {
    nombre: 'Objetos perdidos',
    explica: 'Publicar objetos encontrados y resolver solicitudes.',
  },
  'lugares.editar': {
    nombre: 'Lugares del mapa',
    explica: 'Cambiar la información de los lugares y mover sus pines.',
  },
  'horarios.editar': {
    nombre: 'Horarios',
    explica: 'Editar el horario semanal de cada sección.',
  },
  'enfermeria.editar': {
    nombre: 'Enfermería',
    explica: 'Editar servicios, avisos y horario de la enfermería.',
  },
  'usuarios.gestionar': {
    nombre: 'Usuarios e invitaciones',
    explica: 'Crear invitaciones, cambiar permisos y borrar cuentas.',
    soloAdmin: true,
  },
  'bitacora.ver': {
    nombre: 'Bitácora',
    explica: 'Ver el registro de acciones importantes del panel.',
    soloAdmin: true,
  },
}

export const ACCIONES = Object.keys(PERMISOS)

/** Permisos que la administracion puede dar o quitar a una persona. */
export const PERMISOS_ASIGNABLES = ACCIONES.filter(
  (a) => !PERMISOS[a].soloAdmin
)

/** Permisos que se usan dentro de la app (no hace falta entrar al panel). */
const PERMISOS_DE_APP = ['eventos.publicar', 'recordatorios.publicarSecciones']

export const PERMISOS_POR_ROL = {
  estudiante: [],
  profesor: ['eventos.publicar', 'recordatorios.publicarSecciones'],
  administrativo: [
    'eventos.publicar',
    'anuncios.publicar',
    'objetos.gestionar',
  ],
  soda: ['pedidos.gestionar', 'productos.gestionar', 'reportes.ver'],
  admin: ACCIONES,
}

/**
 * Permisos efectivos de una persona. Acepta el nombre de un rol o un usuario
 * ({ rol, permisos }). Si la administracion ajusto sus permisos, se usan
 * esos; si no, los del rol.
 */
export function permisosDe(sujeto) {
  if (!sujeto) return []
  const rol = typeof sujeto === 'string' ? sujeto : sujeto.rol
  if (!ROLES.includes(rol)) return []
  if (rol === 'admin') return [...ACCIONES]
  if (rol === 'estudiante') return []
  const propios =
    typeof sujeto === 'object' && Array.isArray(sujeto.permisos)
      ? sujeto.permisos
      : null
  const lista = propios ?? PERMISOS_POR_ROL[rol] ?? []
  return lista.filter((p) => PERMISOS_ASIGNABLES.includes(p))
}

export function puede(sujeto, accion) {
  const lista = permisosDe(sujeto)
  if (accion === 'panel.entrar' || accion === 'resumen.ver') {
    return lista.some((p) => !PERMISOS_DE_APP.includes(p))
  }
  return lista.includes(accion)
}

/** Secciones de setimo a duodecimo, de la 1 a la 6 por nivel. */
export const NIVELES = [7, 8, 9, 10, 11, 12]
export const SECCIONES = NIVELES.flatMap((n) =>
  [1, 2, 3, 4, 5, 6].map((s) => `${n}-${s}`)
)

export function seccionValida(seccion) {
  return SECCIONES.includes(seccion)
}

export const NOMBRE_NIVEL = {
  7: 'Sétimo',
  8: 'Octavo',
  9: 'Noveno',
  10: 'Décimo',
  11: 'Undécimo',
  12: 'Duodécimo',
}
