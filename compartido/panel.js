import { PERMISOS, PERMISOS_ASIGNABLES } from './permisos.js'

/**
 * Secciones del panel de administracion. El menu lateral y la eleccion de
 * permisos en "Usuarios y permisos" salen de esta misma lista, asi los dos
 * siempre muestran las mismas secciones en el mismo orden.
 *
 * `ruta`          -> nombre de la ruta en src/router/index.js.
 * `permiso`       -> permiso que pide ese apartado.
 * `permisosDeApp` -> permisos de la seccion que se usan en la app y no en un
 *                    apartado del panel (`donde` dice en que parte).
 */
export const GRUPOS_PANEL = [
  {
    titulo: 'Día a día',
    apartados: [
      { ruta: 'admin-resumen', texto: 'Resumen', permiso: 'panel.entrar' },
    ],
  },
  {
    titulo: 'Soda',
    apartados: [
      { ruta: 'admin-pedidos', texto: 'Pedidos', permiso: 'pedidos.gestionar' },
      {
        ruta: 'admin-verificar',
        texto: 'Verificar pedido',
        permiso: 'pedidos.gestionar',
      },
      {
        ruta: 'admin-menu',
        texto: 'Menú de la soda',
        permiso: 'productos.gestionar',
      },
      {
        ruta: 'admin-reportes',
        texto: 'Reportes de la soda',
        permiso: 'reportes.ver',
      },
      {
        ruta: 'admin-sanciones',
        texto: 'Alertas y sanciones',
        permiso: 'sanciones.gestionar',
      },
    ],
  },
  {
    titulo: 'Comunicación',
    apartados: [
      {
        ruta: 'admin-anuncios',
        texto: 'Anuncios',
        permiso: 'anuncios.publicar',
      },
      {
        ruta: 'admin-eventos',
        texto: 'Eventos',
        permiso: 'eventos.gestionarTodos',
      },
    ],
    permisosDeApp: [
      { permiso: 'eventos.publicar', donde: 'Próximos eventos' },
      { permiso: 'recordatorios.publicarSecciones', donde: 'Recordatorios' },
    ],
  },
  {
    titulo: 'Colegio',
    apartados: [
      {
        ruta: 'admin-lugares',
        texto: 'Lugares del mapa',
        permiso: 'lugares.editar',
      },
      {
        ruta: 'admin-objetos',
        texto: 'Objetos perdidos',
        permiso: 'objetos.gestionar',
      },
      { ruta: 'admin-horarios', texto: 'Horarios', permiso: 'horarios.editar' },
      {
        ruta: 'admin-enfermeria',
        texto: 'Enfermería',
        permiso: 'enfermeria.editar',
      },
    ],
  },
  {
    titulo: 'Personas y seguridad',
    apartados: [
      {
        ruta: 'admin-usuarios',
        texto: 'Usuarios y permisos',
        permiso: 'usuarios.gestionar',
      },
      {
        ruta: 'admin-invitaciones',
        texto: 'Invitaciones',
        permiso: 'usuarios.gestionar',
      },
    ],
  },
]

/** 'A', 'A y B', 'A, B y C'. */
function enumerar(textos) {
  if (textos.length < 2) return textos.join('')
  return `${textos.slice(0, -1).join(', ')} y ${textos.at(-1)}`
}

/**
 * Permisos asignables agrupados por seccion del panel, con un solo checkbox
 * por permiso aunque lo usen varios apartados. `habilita` dice que apartados
 * abre ese permiso. Las secciones sin permisos asignables no aparecen.
 */
export function gruposDePermisos() {
  return GRUPOS_PANEL.map((g) => {
    const permisos = []
    for (const a of g.apartados) {
      if (!PERMISOS_ASIGNABLES.includes(a.permiso)) continue
      const ya = permisos.find((p) => p.clave === a.permiso)
      if (ya) ya.apartados.push(a.texto)
      else permisos.push({ clave: a.permiso, apartados: [a.texto] })
    }
    const delPanel = permisos.map((p) => ({
      clave: p.clave,
      nombre: PERMISOS[p.clave].nombre,
      explica: PERMISOS[p.clave].explica,
      habilita: `En el panel: ${enumerar(p.apartados)}.`,
    }))
    const deApp = (g.permisosDeApp ?? [])
      .filter((p) => PERMISOS_ASIGNABLES.includes(p.permiso))
      .map((p) => ({
        clave: p.permiso,
        nombre: PERMISOS[p.permiso].nombre,
        explica: PERMISOS[p.permiso].explica,
        habilita: `En la app: ${p.donde}.`,
      }))
    return { titulo: g.titulo, permisos: [...delPanel, ...deApp] }
  }).filter((g) => g.permisos.length)
}
