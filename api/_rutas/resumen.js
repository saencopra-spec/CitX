import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok } from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'
import { partesCR, fechaDesdeCR } from '../../compartido/hora.js'

/** Numeros del dia para la primera pantalla del panel. */
registrar('GET', '/resumen', async ({ req, res }) => {
  const usuario = await requerir(req, 'resumen.ver')
  const hoy = partesCR().iso
  const pedidos = await col(COLECCIONES.pedidos)

  const [pedidosHoy, pendientes, vendidoHoy] = await Promise.all([
    pedidos.countDocuments({ 'franja.fecha': hoy }),
    pedidos.countDocuments({
      estado: { $in: ['recibido', 'preparacion', 'listo'] },
    }),
    pedidos
      .aggregate([
        { $match: { 'franja.fecha': hoy } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ])
      .toArray(),
  ])

  const datos = {
    pedidosHoy,
    pendientes,
    vendidoHoy: vendidoHoy[0]?.total ?? 0,
  }

  if (usuario.rol === 'admin') {
    const eventos = await col(COLECCIONES.eventos)
    const solicitudes = await col(COLECCIONES.solicitudesObjetos)
    const [proximos, solicitudesPendientes, usuariosTotal] = await Promise.all([
      eventos
        .find({ inicio: { $gte: fechaDesdeCR(hoy, '00:00') } })
        .sort({ inicio: 1 })
        .limit(4)
        .project({ titulo: 1, fecha: 1, hora: 1, inicio: 1 })
        .toArray(),
      solicitudes.countDocuments({ estado: 'pendiente' }),
      (await col(COLECCIONES.usuarios)).countDocuments({}),
    ])
    datos.proximosEventos = proximos.map((e) => ({
      id: String(e._id),
      titulo: e.titulo,
      fecha: e.fecha,
      hora: e.hora,
      inicio: e.inicio,
    }))
    datos.solicitudesPendientes = solicitudesPendientes
    datos.usuarios = usuariosTotal
  }
  ok(res, datos)
})

/** Lo util para el saludo del menu principal: proximo evento y pedido activo. */
registrar('GET', '/inicio', async ({ req, res }) => {
  const usuario = await requerir(req)
  const eventos = await col(COLECCIONES.eventos)
  const pedidos = await col(COLECCIONES.pedidos)
  const filtroEventos = { inicio: { $gte: new Date() } }
  if (usuario.rol === 'estudiante') {
    filtroEventos.$or = [{ todos: true }, { secciones: usuario.seccion }]
  }
  const [evento, pedido] = await Promise.all([
    eventos.find(filtroEventos).sort({ inicio: 1 }).limit(1).next(),
    pedidos
      .find({
        usuarioId: String(usuario._id),
        estado: { $in: ['recibido', 'preparacion', 'listo'] },
      })
      .sort({ creadoEn: -1 })
      .limit(1)
      .next(),
  ])
  ok(res, {
    proximoEvento: evento
      ? {
          id: String(evento._id),
          titulo: evento.titulo,
          inicio: evento.inicio,
          hora: evento.hora,
          lugarClave: evento.lugarClave ?? null,
        }
      : null,
    pedidoActivo: pedido
      ? { codigo: pedido.codigo, estado: pedido.estado, franja: pedido.franja }
      : null,
  })
})
