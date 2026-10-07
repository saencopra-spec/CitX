/**
 * Quien puede hacer que. Lo usa la API (que es la que manda) y la interfaz
 * (solo para no mostrar botones que no le sirven a esa persona).
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

/** Roles que se pueden elegir en el registro publico. */
export const ROLES_REGISTRO = ['estudiante', 'profesor', 'administrativo']

const REGLAS = {
  'panel.entrar': ['admin', 'soda'],
  'resumen.ver': ['admin', 'soda'],
  'pedidos.gestionar': ['admin', 'soda'],
  'productos.gestionar': ['admin', 'soda'],
  'eventos.publicar': ['admin', 'profesor'],
  'eventos.gestionarTodos': ['admin'],
  'recordatorios.publicarSecciones': ['admin', 'profesor'],
  'lugares.editar': ['admin'],
  'objetos.gestionar': ['admin'],
  'horarios.editar': ['admin'],
  'enfermeria.editar': ['admin'],
  'usuarios.gestionar': ['admin'],
}

export function puede(rol, accion) {
  const permitidos = REGLAS[accion]
  return Boolean(permitidos && permitidos.includes(rol))
}

export const ACCIONES = Object.keys(REGLAS)

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
