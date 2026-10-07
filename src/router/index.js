import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

/**
 * Rutas de CitX.
 *
 * `meta.publica`  -> se puede ver sin iniciar sesion.
 * `meta.permiso`  -> permiso que hace falta (ver compartido/permisos.js). Si no esta, basta con
 *                    tener sesion iniciada.
 * `meta.titulo`   -> se usa para el <title> y para anunciar el cambio de
 *                    pagina a los lectores de pantalla.
 */
const rutas = [
  {
    path: '/',
    name: 'bienvenida',
    component: () => import('@/views/cuenta/Bienvenida.vue'),
    meta: { publica: true, soloInvitados: true, titulo: 'Bienvenida' },
  },
  {
    path: '/empieza',
    name: 'empieza',
    component: () => import('@/views/cuenta/EmpiezaAhora.vue'),
    meta: { publica: true, soloInvitados: true, titulo: 'Empieza ahora' },
  },
  {
    path: '/entrar',
    name: 'entrar',
    component: () => import('@/views/cuenta/IniciarSesion.vue'),
    meta: { publica: true, soloInvitados: true, titulo: 'Iniciar sesión' },
  },
  {
    path: '/registro',
    name: 'registro',
    component: () => import('@/views/cuenta/CrearCuenta.vue'),
    meta: { publica: true, soloInvitados: true, titulo: 'Crear cuenta' },
  },

  // --- Aplicacion con sesion iniciada ---
  {
    path: '/menu',
    name: 'menu',
    component: () => import('@/views/inicio/MenuPrincipal.vue'),
    meta: { titulo: 'Menú principal' },
  },
  {
    path: '/mapa',
    name: 'mapa',
    component: () => import('@/views/mapa/Mapa.vue'),
    meta: { titulo: 'Mapa interactivo' },
  },
  {
    path: '/guia',
    name: 'guia',
    component: () => import('@/views/guia/Guia.vue'),
    meta: { titulo: 'Guía digital' },
  },
  {
    path: '/guia/eventos',
    name: 'eventos',
    component: () => import('@/views/guia/Eventos.vue'),
    meta: { titulo: 'Próximos eventos' },
  },
  {
    path: '/guia/clases',
    name: 'clases',
    component: () => import('@/views/guia/Clases.vue'),
    meta: { titulo: 'Clases' },
  },
  {
    path: '/guia/objetos-perdidos',
    name: 'objetos-perdidos',
    component: () => import('@/views/guia/ObjetosPerdidos.vue'),
    meta: { titulo: 'Objetos perdidos' },
  },
  {
    path: '/guia/recordatorios',
    name: 'recordatorios',
    component: () => import('@/views/guia/Recordatorios.vue'),
    meta: { titulo: 'Recordatorios' },
  },
  {
    path: '/guia/enfermeria',
    name: 'enfermeria',
    component: () => import('@/views/guia/Enfermeria.vue'),
    meta: { titulo: 'Enfermería' },
  },
  {
    path: '/soda',
    name: 'soda',
    component: () => import('@/views/soda/SodaMenu.vue'),
    meta: { titulo: 'Soda Armonía' },
  },
  {
    path: '/soda/carrito',
    name: 'carrito',
    component: () => import('@/views/soda/Carrito.vue'),
    meta: { titulo: 'Carrito' },
  },
  {
    path: '/soda/pagar',
    name: 'pagar',
    component: () => import('@/views/soda/Pago.vue'),
    meta: { titulo: 'Pago' },
  },
  {
    path: '/soda/pedido/:codigo',
    name: 'pedido',
    component: () => import('@/views/soda/EstadoPedido.vue'),
    props: true,
    meta: { titulo: 'Estado del pedido' },
  },
  {
    path: '/soda/pedidos',
    name: 'mis-pedidos',
    component: () => import('@/views/soda/MisPedidos.vue'),
    meta: { titulo: 'Mis pedidos' },
  },
  {
    path: '/configuracion',
    name: 'configuracion',
    component: () => import('@/views/cuenta/Configuracion.vue'),
    meta: { publica: true, titulo: 'Configuración' },
  },
  {
    path: '/notificaciones',
    name: 'notificaciones',
    component: () => import('@/views/inicio/Notificaciones.vue'),
    meta: { titulo: 'Avisos' },
  },

  // --- Panel de administracion ---
  // Cada seccion pide un permiso; el personal ve solo las que le dieron.
  {
    path: '/admin',
    component: () => import('@/views/admin/PanelLayout.vue'),
    meta: { permiso: 'panel.entrar' },
    children: [
      {
        path: '',
        name: 'admin-resumen',
        component: () => import('@/views/admin/Resumen.vue'),
        meta: { permiso: 'panel.entrar', titulo: 'Resumen' },
      },
      {
        path: 'pedidos',
        name: 'admin-pedidos',
        component: () => import('@/views/admin/PedidosTablero.vue'),
        meta: { permiso: 'pedidos.gestionar', titulo: 'Pedidos' },
      },
      {
        path: 'reportes',
        name: 'admin-reportes',
        component: () => import('@/views/admin/Reportes.vue'),
        meta: { permiso: 'reportes.ver', titulo: 'Reportes de la soda' },
      },
      {
        path: 'menu',
        name: 'admin-menu',
        component: () => import('@/views/admin/MenuSoda.vue'),
        meta: { permiso: 'productos.gestionar', titulo: 'Menú de la soda' },
      },
      {
        path: 'anuncios',
        name: 'admin-anuncios',
        component: () => import('@/views/admin/AnunciosAdmin.vue'),
        meta: { permiso: 'anuncios.publicar', titulo: 'Anuncios' },
      },
      {
        path: 'eventos',
        name: 'admin-eventos',
        component: () => import('@/views/admin/EventosAdmin.vue'),
        meta: { permiso: 'eventos.gestionarTodos', titulo: 'Eventos' },
      },
      {
        path: 'lugares',
        name: 'admin-lugares',
        component: () => import('@/views/admin/LugaresAdmin.vue'),
        meta: { permiso: 'lugares.editar', titulo: 'Lugares del mapa' },
      },
      {
        path: 'objetos-perdidos',
        name: 'admin-objetos',
        component: () => import('@/views/admin/ObjetosAdmin.vue'),
        meta: { permiso: 'objetos.gestionar', titulo: 'Objetos perdidos' },
      },
      {
        path: 'horarios',
        name: 'admin-horarios',
        component: () => import('@/views/admin/HorariosAdmin.vue'),
        meta: { permiso: 'horarios.editar', titulo: 'Horarios' },
      },
      {
        path: 'enfermeria',
        name: 'admin-enfermeria',
        component: () => import('@/views/admin/EnfermeriaAdmin.vue'),
        meta: { permiso: 'enfermeria.editar', titulo: 'Enfermería' },
      },
      {
        path: 'usuarios',
        name: 'admin-usuarios',
        component: () => import('@/views/admin/UsuariosAdmin.vue'),
        meta: { permiso: 'usuarios.gestionar', titulo: 'Usuarios' },
      },
      {
        path: 'invitaciones',
        name: 'admin-invitaciones',
        component: () => import('@/views/admin/Invitaciones.vue'),
        meta: { permiso: 'usuarios.gestionar', titulo: 'Invitaciones' },
      },
      {
        path: 'bitacora',
        name: 'admin-bitacora',
        component: () => import('@/views/admin/Bitacora.vue'),
        meta: { permiso: 'bitacora.ver', titulo: 'Bitácora' },
      },
    ],
  },

  {
    path: '/:ruta(.*)*',
    name: 'no-encontrado',
    component: () => import('@/views/inicio/NoEncontrado.vue'),
    meta: { publica: true, titulo: 'Página no encontrada' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes: rutas,
  scrollBehavior(hacia, desde, guardada) {
    if (guardada) return guardada
    if (hacia.hash) return { el: hacia.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (hacia) => {
  const auth = useAuth()

  // En la primera navegacion preguntamos a la API si hay sesion abierta.
  if (!auth.listo) await auth.cargarSesion()

  const haySesion = Boolean(auth.usuario)

  if (hacia.meta.soloInvitados && haySesion) {
    return auth.inicioDe()
  }

  if (!hacia.meta.publica && !haySesion) {
    return { name: 'empieza', query: { seguir: hacia.fullPath } }
  }

  if (haySesion) {
    const permitido = hacia.matched.every(
      (r) => !r.meta.permiso || auth.puede(r.meta.permiso)
    )
    if (!permitido) {
      const alResumen =
        hacia.path.startsWith('/admin') &&
        hacia.name !== 'admin-resumen' &&
        auth.puede('panel.entrar')
      return { name: alResumen ? 'admin-resumen' : 'menu' }
    }
  }

  // Objetos perdidos ve unicamente su seccion, sin resumen.
  if (
    haySesion &&
    auth.usuario.rol === 'objetos' &&
    hacia.name === 'admin-resumen'
  ) {
    return { name: 'admin-objetos' }
  }

  // La soda y objetos perdidos trabajan solo en el panel.
  if (
    haySesion &&
    auth.soloPanel &&
    !hacia.path.startsWith('/admin') &&
    !hacia.meta.publica
  ) {
    return auth.inicioDe()
  }

  return true
})

router.afterEach((hacia) => {
  const titulo = hacia.meta.titulo
  document.title = titulo ? `${titulo} - CitX` : 'CitX - Complejo Educativo CIT'
})
