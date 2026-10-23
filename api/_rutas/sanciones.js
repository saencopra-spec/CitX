import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES, asegurarIndices } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  noExiste,
  malaPeticion,
  noAutenticado,
} from '../_lib/respuesta.js'
import { requerir, idValido } from '../_lib/sesion.js'
import { paginaDe } from '../_lib/paginas.js'
import { notificar } from '../_lib/notificar.js'
import {
  revisarNoRecogidos,
  filtroVigentes,
  buscarSancionActiva,
  avisarSancionesVencidas,
  avisarQuePuedePedir,
} from '../_lib/sanciones.js'
import { NO_RECOGIDO } from '../../compartido/pedidos.js'
import { fechaIsoLegible } from '../../compartido/hora.js'
import {
  CLAVES_DURACION,
  calcularFin,
  esPermanente,
  estadoSancion,
  mensajeBloqueo,
  sancionVigente,
  textoFin,
} from '../../compartido/sanciones.js'

/**
 * Alertas y sanciones de la soda. Cada alerta o sancion queda guardada en su
 * propia coleccion (con quien la puso, cuando, la razon y el pedido), asi el
 * historial no se pierde cuando una sancion termina o se levanta.
 */

const PERMISO = 'sanciones.gestionar'

function escaparRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function quien(usuario) {
  return { id: String(usuario._id), nombre: usuario.nombre }
}

export function sancionPublica(s, { admin = false } = {}) {
  const datos = {
    id: String(s._id),
    tipo: s.tipo,
    estado: estadoSancion(s),
    razon: s.razon,
    mensaje: s.mensaje ?? '',
    pedidoCodigo: s.pedidoCodigo ?? null,
    duracion: s.duracion ?? null,
    hasta: s.hasta ?? null,
    permanente: esPermanente(s.hasta),
    creadaEn: s.creadaEn,
    levantadaEn: s.levantada?.en ?? null,
  }
  if (admin) {
    datos.usuarioId = s.usuarioId
    datos.usuarioNombre = s.usuarioNombre
    datos.creadaPor = s.creadaPor ?? null
    datos.levantada = s.levantada ?? null
  }
  return datos
}

/** Cuantas alertas y sanciones tiene cada persona, para la lista del panel. */
async function conteosDe(usuarioIds) {
  const sanciones = await col(COLECCIONES.sanciones)
  const filas = await sanciones
    .aggregate([
      { $match: { usuarioId: { $in: usuarioIds } } },
      {
        $group: {
          _id: { usuarioId: '$usuarioId', tipo: '$tipo' },
          n: { $sum: 1 },
        },
      },
    ])
    .toArray()
  const mapa = new Map(
    usuarioIds.map((id) => [id, { alertas: 0, sanciones: 0 }])
  )
  for (const f of filas) {
    const c = mapa.get(f._id.usuarioId)
    if (!c) continue
    if (f._id.tipo === 'alerta') c.alertas = f.n
    else c.sanciones = f.n
  }
  return mapa
}

async function activasDe(usuarioIds, ahora = new Date()) {
  const sanciones = await col(COLECCIONES.sanciones)
  const lista = await sanciones
    .find({ ...filtroVigentes(ahora), usuarioId: { $in: usuarioIds } })
    .toArray()
  return new Map(lista.map((s) => [s.usuarioId, s]))
}

async function usuarioDestino(id) {
  const usuarios = await col(COLECCIONES.usuarios)
  const u = await usuarios.findOne(
    { _id: idValido(id) },
    { projection: { nombre: 1, correo: 1, rol: 1, seccion: 1, activo: 1 } }
  )
  if (!u) throw noExiste('No encontramos a esa persona.')
  return u
}

/** Pedido no recogido que todavia no tiene una decision del admin. */
async function casoPendiente(codigo) {
  const pedidos = await col(COLECCIONES.pedidos)
  const pedido = await pedidos.findOne({ codigo: codigo.toUpperCase() })
  if (!pedido) throw noExiste('No encontramos un pedido con ese código.')
  if (pedido.estado !== NO_RECOGIDO || pedido.caso) {
    throw malaPeticion('Este pedido ya no está pendiente de revisión.')
  }
  return pedido
}

/** Marca el caso como resuelto, solo si nadie lo resolvio en el medio. */
async function cerrarCaso(pedido, resolucion, admin, sancionId = null) {
  const pedidos = await col(COLECCIONES.pedidos)
  const r = await pedidos.updateOne(
    { _id: pedido._id, estado: NO_RECOGIDO, caso: { $exists: false } },
    {
      $set: {
        caso: {
          resolucion,
          por: quien(admin),
          en: new Date(),
          sancionId: sancionId ? String(sancionId) : null,
        },
      },
    }
  )
  return r.modifiedCount === 1
}

// ---------------------------------------------------------------------------
// Pedidos no recogidos
// ---------------------------------------------------------------------------

registrar('GET', '/sanciones/no-recogidos', async ({ req, res }) => {
  await requerir(req, PERMISO)
  await revisarNoRecogidos()
  const pedidos = await col(COLECCIONES.pedidos)
  const lista = await pedidos
    .find({ estado: NO_RECOGIDO, caso: { $exists: false } })
    .sort({ 'franja.fecha': -1, creadoEn: -1 })
    .limit(200)
    .toArray()
  const ids = [...new Set(lista.map((p) => p.usuarioId))]
  const [conteos, activas] = await Promise.all([conteosDe(ids), activasDe(ids)])
  ok(res, {
    pedidos: lista.map((p) => ({
      codigo: p.codigo,
      usuarioId: p.usuarioId,
      usuarioNombre: p.usuarioNombre,
      usuarioSeccion: p.usuarioSeccion ?? null,
      cuentaBorrada: p.usuarioId === 'borrado',
      items: p.items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad })),
      total: p.total,
      pago: { metodo: p.pago.metodo, estado: p.pago.estado },
      franja: p.franja,
      creadoEn: p.creadoEn,
      alertas: conteos.get(p.usuarioId)?.alertas ?? 0,
      sanciones: conteos.get(p.usuarioId)?.sanciones ?? 0,
      sancionActiva: activas.has(p.usuarioId)
        ? sancionPublica(activas.get(p.usuarioId))
        : null,
    })),
  })
})

registrar(
  'POST',
  '/sanciones/no-recogidos/:codigo/alertar',
  async ({ req, res, params }) => {
    const admin = await requerir(req, PERMISO)
    await asegurarIndices()
    const { mensaje } = z
      .object({
        mensaje: z
          .string()
          .trim()
          .max(300, 'El mensaje es muy largo.')
          .optional()
          .default(''),
      })
      .parse(await leerCuerpo(req))
    const pedido = await casoPendiente(params.codigo)
    if (pedido.usuarioId === 'borrado') {
      throw malaPeticion('La cuenta de este pedido ya no existe. Descartalo.')
    }

    const sanciones = await col(COLECCIONES.sanciones)
    const alerta = {
      tipo: 'alerta',
      usuarioId: pedido.usuarioId,
      usuarioNombre: pedido.usuarioNombre,
      razon: 'Pedido no recogido',
      mensaje,
      pedidoCodigo: pedido.codigo,
      creadaPor: quien(admin),
      creadaEn: new Date(),
    }
    const { insertedId } = await sanciones.insertOne(alerta)
    if (!(await cerrarCaso(pedido, 'alerta', admin, insertedId))) {
      await sanciones.deleteOne({ _id: insertedId })
      throw malaPeticion('Otra persona acaba de resolver este caso.')
    }

    const cuando = `${pedido.franja.nombre ?? 'la franja elegida'} del ${fechaIsoLegible(pedido.franja.fecha)}`
    await notificar([pedido.usuarioId], {
      titulo: `Aviso: no recogiste tu pedido ${pedido.codigo}`,
      cuerpo:
        `Tu pedido para ${cuando} se quedó sin retirar.` +
        (mensaje ? ` Mensaje de administración: ${mensaje}` : ''),
      enlace: `/soda/pedido/${pedido.codigo}`,
      tipo: 'alerta',
    })
    creado(res, {
      alerta: sancionPublica({ ...alerta, _id: insertedId }, { admin: true }),
    })
  }
)

registrar(
  'POST',
  '/sanciones/no-recogidos/:codigo/descartar',
  async ({ req, res, params }) => {
    const admin = await requerir(req, PERMISO)
    const pedido = await casoPendiente(params.codigo)
    if (!(await cerrarCaso(pedido, 'descartado', admin))) {
      throw malaPeticion('Otra persona acaba de resolver este caso.')
    }
    ok(res, { codigo: pedido.codigo })
  }
)

// ---------------------------------------------------------------------------
// Panel de sanciones
// ---------------------------------------------------------------------------

/**
 * Todas las cuentas (como en "Usuarios y permisos"), de a una pagina. Con
 * texto busca por nombre, correo o seccion en toda la base.
 */
registrar('GET', '/sanciones/usuarios', async ({ req, res, query }) => {
  await requerir(req, PERMISO)
  const { pagina, saltar, porPagina } = paginaDe(query)
  const usuarios = await col(COLECCIONES.usuarios)
  const texto = String(query.buscar ?? '')
    .trim()
    .slice(0, 60)
  const filtro = {}
  if (texto) {
    const t = escaparRegex(texto)
    filtro.$or = [
      { nombre: { $regex: t, $options: 'i' } },
      { correo: { $regex: t, $options: 'i' } },
      { seccion: { $regex: `^${t}`, $options: 'i' } },
    ]
  }
  const [lista, total] = await Promise.all([
    usuarios
      .find(filtro, {
        projection: { nombre: 1, correo: 1, rol: 1, seccion: 1 },
      })
      .sort({ nombre: 1, _id: 1 })
      .skip(saltar)
      .limit(porPagina)
      .toArray(),
    usuarios.countDocuments(filtro),
  ])
  const ids = lista.map((u) => String(u._id))
  const [conteos, activas] = await Promise.all([conteosDe(ids), activasDe(ids)])
  ok(res, {
    usuarios: lista.map((u) => {
      const id = String(u._id)
      return {
        id,
        nombre: u.nombre,
        correo: u.correo,
        rol: u.rol,
        seccion: u.seccion ?? null,
        alertas: conteos.get(id)?.alertas ?? 0,
        sanciones: conteos.get(id)?.sanciones ?? 0,
        sancionActiva: activas.has(id)
          ? sancionPublica(activas.get(id), { admin: true })
          : null,
      }
    }),
    total,
    pagina,
    porPagina,
  })
})

const esquemaSancion = z.object({
  usuarioId: z.string(),
  razon: z
    .string()
    .trim()
    .min(3, 'Escribí la razón de la sanción.')
    .max(300, 'La razón es muy larga.'),
  duracion: z.enum(CLAVES_DURACION, { message: 'Elegí una duración.' }),
  hasta: z.string().max(16).optional(),
  pedidoCodigo: z.string().max(5).optional(),
})

/** Quien recibe una alerta o sancion: ni uno mismo ni la cuenta de la soda. */
function revisarDestino(u, admin, accion) {
  if (String(u._id) === String(admin._id)) {
    throw malaPeticion(`No te podés ${accion} a vos mismo.`)
  }
  if (u.rol === 'soda') {
    throw malaPeticion('La cuenta de la soda no hace pedidos.')
  }
}

registrar('POST', '/sanciones', async ({ req, res }) => {
  const admin = await requerir(req, PERMISO)
  await asegurarIndices()
  const datos = esquemaSancion.parse(await leerCuerpo(req))
  const u = await usuarioDestino(datos.usuarioId)
  const usuarioId = String(u._id)
  revisarDestino(u, admin, 'sancionar')

  const ahora = new Date()
  const hasta = calcularFin(datos.duracion, { ahora, hasta: datos.hasta })
  if (!hasta) {
    throw malaPeticion('Revisá la fecha de fin.', {
      hasta: 'Elegí una fecha y hora que todavía no hayan pasado.',
    })
  }

  let pedido = null
  if (datos.pedidoCodigo) {
    pedido = await casoPendiente(datos.pedidoCodigo)
    if (pedido.usuarioId !== usuarioId) {
      throw malaPeticion('Ese pedido es de otra persona.')
    }
  }

  const sanciones = await col(COLECCIONES.sanciones)
  const sancion = {
    tipo: 'sancion',
    usuarioId,
    usuarioNombre: u.nombre,
    razon: datos.razon,
    duracion: datos.duracion,
    hasta,
    pedidoCodigo: pedido?.codigo ?? null,
    creadaPor: quien(admin),
    creadaEn: ahora,
    levantada: null,
    finAvisado: false,
  }
  const { insertedId } = await sanciones.insertOne(sancion)

  // La nueva reemplaza a la que estuviera activa; la vieja queda en el historial.
  await sanciones.updateMany(
    { ...filtroVigentes(ahora), usuarioId, _id: { $ne: insertedId } },
    {
      $set: {
        levantada: {
          motivo: 'reemplazada',
          por: quien(admin),
          en: ahora,
          reemplazadaPor: String(insertedId),
        },
        finAvisado: true,
      },
    }
  )

  if (pedido) await cerrarCaso(pedido, 'sancion', admin, insertedId)

  await notificar([usuarioId], {
    titulo: 'No podés hacer pedidos en la soda por ahora',
    cuerpo:
      `Razón: ${datos.razon}. ` +
      (esPermanente(hasta)
        ? 'Es una sanción permanente: hablá con administración.'
        : `Podrás volver a pedir: ${textoFin(hasta)}.`) +
      ' Si ya tenías un pedido hecho, todavía podés recogerlo.',
    enlace: '/soda',
    tipo: 'sancion',
  })

  creado(res, {
    sancion: sancionPublica({ ...sancion, _id: insertedId }, { admin: true }),
  })
})

/** Alerta a una persona sin que haya un pedido no recogido de por medio. */
registrar('POST', '/sanciones/alertas', async ({ req, res }) => {
  const admin = await requerir(req, PERMISO)
  await asegurarIndices()
  const datos = z
    .object({
      usuarioId: z.string(),
      razon: z
        .string()
        .trim()
        .min(3, 'Escribí la razón de la alerta.')
        .max(300, 'La razón es muy larga.'),
    })
    .parse(await leerCuerpo(req))
  const u = await usuarioDestino(datos.usuarioId)
  revisarDestino(u, admin, 'alertar')

  const sanciones = await col(COLECCIONES.sanciones)
  const alerta = {
    tipo: 'alerta',
    usuarioId: String(u._id),
    usuarioNombre: u.nombre,
    razon: datos.razon,
    mensaje: '',
    pedidoCodigo: null,
    creadaPor: quien(admin),
    creadaEn: new Date(),
  }
  const { insertedId } = await sanciones.insertOne(alerta)
  await notificar([alerta.usuarioId], {
    titulo: 'Aviso de la soda',
    cuerpo: `Administración te envió una alerta. Razón: ${datos.razon}`,
    enlace: '/soda',
    tipo: 'alerta',
  })
  creado(res, {
    alerta: sancionPublica({ ...alerta, _id: insertedId }, { admin: true }),
  })
})

// ---------------------------------------------------------------------------
// Historial general: alertas, sanciones y descartes
// ---------------------------------------------------------------------------

export const FILTROS_HISTORIAL = [
  'todos',
  'alertas',
  'sanciones',
  'descartados',
  'activas',
]

/** Los descartes viven en el pedido (`caso`); se muestran como un registro mas. */
function descartePublico(p) {
  return {
    id: `descarte-${p.codigo}`,
    tipo: 'descarte',
    estado: 'descartado',
    usuarioId: p.usuarioId,
    usuarioNombre: p.usuarioNombre,
    razon: 'Pedido no recogido',
    mensaje: '',
    pedidoCodigo: p.codigo,
    hasta: null,
    permanente: false,
    creadaEn: p.caso.en,
    creadaPor: p.caso.por ?? null,
    levantada: null,
  }
}

const FILTRO_DESCARTES = {
  estado: NO_RECOGIDO,
  'caso.resolucion': 'descartado',
}

registrar('GET', '/sanciones/historial', async ({ req, res, query }) => {
  await requerir(req, PERMISO)
  const { pagina, saltar, porPagina } = paginaDe(query)
  const tipo = FILTROS_HISTORIAL.includes(query.tipo) ? query.tipo : 'todos'
  const sanciones = await col(COLECCIONES.sanciones)
  const pedidos = await col(COLECCIONES.pedidos)

  const filtroSanciones = {
    todos: {},
    alertas: { tipo: 'alerta' },
    sanciones: { tipo: 'sancion' },
    activas: filtroVigentes(),
  }[tipo]
  const conSanciones = tipo !== 'descartados'
  const conDescartes = tipo === 'todos' || tipo === 'descartados'

  // Para mezclar las dos colecciones por fecha basta con traer de cada una
  // los primeros `saltar + porPagina`: la pagina pedida esta entre ellos.
  const hasta = saltar + porPagina
  const [listaS, totalS, listaD, totalD] = await Promise.all([
    conSanciones
      ? sanciones
          .find(filtroSanciones)
          .sort({ creadaEn: -1, _id: -1 })
          .limit(hasta)
          .toArray()
      : [],
    conSanciones ? sanciones.countDocuments(filtroSanciones) : 0,
    conDescartes
      ? pedidos
          .find(FILTRO_DESCARTES)
          .sort({ 'caso.en': -1, _id: -1 })
          .limit(hasta)
          .toArray()
      : [],
    conDescartes ? pedidos.countDocuments(FILTRO_DESCARTES) : 0,
  ])

  const registros = [
    ...listaS.map((s) => sancionPublica(s, { admin: true })),
    ...listaD.map(descartePublico),
  ]
    .sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn))
    .slice(saltar, hasta)

  ok(res, { registros, total: totalS + totalD, pagina, porPagina, tipo })
})

registrar('POST', '/sanciones/:id/levantar', async ({ req, res, params }) => {
  const admin = await requerir(req, PERMISO)
  const sanciones = await col(COLECCIONES.sanciones)
  const s = await sanciones.findOne({ _id: idValido(params.id) })
  if (!s || s.tipo !== 'sancion') throw noExiste('No encontramos esa sanción.')
  if (!sancionVigente(s)) {
    throw malaPeticion('Esa sanción ya no está activa.')
  }
  const r = await sanciones.updateOne(
    { _id: s._id, levantada: null },
    {
      $set: {
        levantada: { motivo: 'admin', por: quien(admin), en: new Date() },
        finAvisado: true,
      },
    }
  )
  if (r.modifiedCount === 0) {
    throw malaPeticion('Otra persona acaba de cambiar esta sanción.')
  }
  if (!(await buscarSancionActiva(s.usuarioId))) {
    await avisarQuePuedePedir(
      s.usuarioId,
      'Administración levantó tu sanción en la soda. Ya podés hacer pedidos de nuevo.'
    )
  }
  const actualizada = await sanciones.findOne({ _id: s._id })
  ok(res, { sancion: sancionPublica(actualizada, { admin: true }) })
})

// ---------------------------------------------------------------------------
// Lo que ve cada persona
// ---------------------------------------------------------------------------

registrar('GET', '/sanciones/mi-estado', async ({ req, res }) => {
  const usuario = await requerir(req)
  await avisarSancionesVencidas({ usuarioId: usuario._id })
  const s = await buscarSancionActiva(usuario._id)
  ok(res, {
    sancion: s
      ? {
          razon: s.razon,
          hasta: s.hasta,
          permanente: esPermanente(s.hasta),
          mensaje: mensajeBloqueo(s),
        }
      : null,
  })
})

registrar('GET', '/sanciones/mi-historial', async ({ req, res }) => {
  const usuario = await requerir(req)
  const sanciones = await col(COLECCIONES.sanciones)
  const lista = await sanciones
    .find({ usuarioId: String(usuario._id) })
    .sort({ creadaEn: -1 })
    .limit(100)
    .toArray()
  ok(res, { historial: lista.map((s) => sancionPublica(s)) })
})

// ---------------------------------------------------------------------------
// Respaldo diario (Vercel Cron)
// ---------------------------------------------------------------------------

/** Vercel manda CRON_SECRET en el encabezado Authorization. */
registrar('GET', '/cron/sanciones', async ({ req, res }) => {
  const secreto = process.env.CRON_SECRET
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) {
    throw noAutenticado('Solo el cron de Vercel puede usar esta dirección.')
  }
  const noRecogidos = await revisarNoRecogidos()
  const avisadas = await avisarSancionesVencidas()
  ok(res, { noRecogidos, avisadas })
})
