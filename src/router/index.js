import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

/**
 * Rutas de CitX.
 *
 * `meta.publica`  -> se puede ver sin iniciar sesion.
 * `meta.roles`    -> lista de roles que pueden entrar. Si no esta, basta con
 *                    tener sesion iniciada.
 * `meta.titulo`   -> se usa para el <title> y para anunciar el cambio de
 *                    pagina a los lectores de pantalla.
 */
const rutas = [
  {
    path: '/',
    name: 'bienvenida',
    component: () => import('@/views/Bienvenida.vue'),
    meta: { publica: true, soloInvitados: true, titulo: 'Bienvenida' },
  },
  {
    path: '/empieza',
    name: 'empieza',
    component: () => import('@/views/EmpiezaAhora.vue'),
    meta: { publica: true, soloInvitados: true, titulo: 'Empieza ahora' },
  },
  {
    path: '/entrar',
    name: 'entrar',
    component: () => import('@/views/IniciarSesion.vue'),
    meta: { publica: true, soloInvitados: true, titulo: 'Iniciar sesion' },
  },
  {
    path: '/registro',
    name: 'registro',
    component: () => import('@/views/CrearCuenta.vue'),
    meta: { publica: true, soloInvitados: true, titulo: 'Crear cuenta' },
  },

  // --- Aplicacion con sesion iniciada ---
  {
    path: '/menu',
    name: 'menu',
    component: () => import('@/views/MenuPrincipal.vue'),
    meta: { titulo: 'Menu principal' },
  },
  {
    path: '/mapa',
    name: 'mapa',
    component: () => import('@/views/Mapa.vue'),
    meta: { titulo: 'Mapa interactivo' },
  },
  {
    path: '/guia',
    name: 'guia',
    component: () => import('@/views/Guia.vue'),
    meta: { titulo: 'Guia digital' },
  },
  {
    path: '/guia/eventos',
    name: 'eventos',
    component: () => import('@/views/guia/Eventos.vue'),
    meta: { titulo: 'Proximos eventos' },
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
    meta: { titulo: 'Enfermeria' },
  },
  {
    path: '/soda',
    name: 'soda',
    component: () => import('@/views/soda/SodaMenu.vue'),
    meta: { titulo: 'Soda Armonia' },
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
    component: () => import('@/views/Configuracion.vue'),
    meta: { publica: true, titulo: 'Configuracion' },
  },
  {
    path: '/notificaciones',
    name: 'notificaciones',
    component: () => import('@/views/Notificaciones.vue'),
    meta: { titulo: 'Notificaciones' },
  },

  // --- Panel de administracion ---
  {
    path: '/admin',
    component: () => import('@/views/admin/PanelLayout.vue'),
    meta: { roles: ['admin', 'soda'] },
    children: [
      {
        path: '',
        name: 'admin-resumen',
        component: () => import('@/views/admin/Resumen.vue'),
        meta: { roles: ['admin', 'soda'], titulo: 'Resumen' },
      },
      {
        path: 'pedidos',
        name: 'admin-pedidos',
        component: () => import('@/views/admin/PedidosTablero.vue'),
        meta: { roles: ['admin', 'soda'], titulo: 'Pedidos' },
      },
      {
        path: 'menu',
        name: 'admin-menu',
        component: () => import('@/views/admin/MenuSoda.vue'),
        meta: { roles: ['admin', 'soda'], titulo: 'Menu de la soda' },
      },
      {
        path: 'eventos',
        name: 'admin-eventos',
        component: () => import('@/views/admin/EventosAdmin.vue'),
        meta: { roles: ['admin', 'profesor'], titulo: 'Eventos' },
      },
      {
        path: 'lugares',
        name: 'admin-lugares',
        component: () => import('@/views/admin/LugaresAdmin.vue'),
        meta: { roles: ['admin'], titulo: 'Lugares del mapa' },
      },
      {
        path: 'objetos-perdidos',
        name: 'admin-objetos',
        component: () => import('@/views/admin/ObjetosAdmin.vue'),
        meta: { roles: ['admin'], titulo: 'Objetos perdidos' },
      },
      {
        path: 'horarios',
        name: 'admin-horarios',
        component: () => import('@/views/admin/HorariosAdmin.vue'),
        meta: { roles: ['admin'], titulo: 'Horarios' },
      },
      {
        path: 'enfermeria',
        name: 'admin-enfermeria',
        component: () => import('@/views/admin/EnfermeriaAdmin.vue'),
        meta: { roles: ['admin'], titulo: 'Enfermeria' },
      },
      {
        path: 'usuarios',
        name: 'admin-usuarios',
        component: () => import('@/views/admin/UsuariosAdmin.vue'),
        meta: { roles: ['admin'], titulo: 'Usuarios' },
      },
    ],
  },

  {
    path: '/:ruta(.*)*',
    name: 'no-encontrado',
    component: () => import('@/views/NoEncontrado.vue'),
    meta: { publica: true, titulo: 'Pagina no encontrada' },
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
    return { name: auth.esPersonalSoda ? 'admin-pedidos' : 'menu' }
  }

  if (!hacia.meta.publica && !haySesion) {
    return { name: 'empieza', query: { seguir: hacia.fullPath } }
  }

  if (hacia.meta.roles && haySesion) {
    if (!hacia.meta.roles.includes(auth.usuario.rol)) {
      return { name: 'menu' }
    }
  }

  return true
})

router.afterEach((hacia) => {
  const titulo = hacia.meta.titulo
  document.title = titulo ? `${titulo} - CitX` : 'CitX - Complejo Educativo CIT'
})
