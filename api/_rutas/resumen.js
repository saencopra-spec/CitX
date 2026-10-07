import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok } from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'
import { puede } from '../../compartido/permisos.js'
import { partesCR, fechaDesdeCR } from '../../compartido/hora.js'

/** Numeros del dia para la primera pantalla del panel, segun los permisos. */
registrar('GET', '/resumen', async ({ req, res }) => {
  const usuario = await requerir(req, 'panel.entrar')
  const hoy = partesCR().iso
  const inicioHoy = fechaDesdeCR(hoy, '00:00')
  const datos = {}
  const tareas = []

  if (puede(usuario, 'pedidos.gestionar') || puede(usuario, 'reportes.ver')) {
    tareas.push(
      (async () => {
        const pedidos = await col(COLECCIONES.pedidos)
        const [pedidosHoy, pendientes, vendido, top] = await Promise.all([
          pedidos.countDocuments({ creadoEn: { $gte: inicioHoy } }),
          pedidos.countDocuments({
            estado: { $in: ['recibido', 'preparacion', 'listo'] },
          }),
          pedidos
            .aggregate([
              { $match: { creadoEn: { $gte: inicioHoy } } },
              { $group: { _id: null, total: { $sum: '$total' } } },
            ])
            .toArray(),
          pedidos
            .aggregate([
              { $match: { creadoEn: { $gte: inicioHoy } } },
              { $unwind: '$items' },
              {
                $group: {
                  _id: '$items.nombre',
                  unidades: { $sum: '$items.cantidad' },
                },
              },
              { $sort: { unidades: -1 } },
              { $limit: 3 },
            ])
            .toArray(),
        ])
        datos.soda = {
          pedidosHoy,
          pendientes,
          vendidoHoy: vendido[0]?.total ?? 0,
          masVendidosHoy: top.map((t) => ({
            nombre: t._id,
            unidades: t.unidades,
          })),
        }
      })()
    )
  }

  if (puede(usuario, 'objetos.gestionar')) {
    tareas.push(
      (async () => {
        const solicitudes = await col(COLECCIONES.solicitudesObjetos)
        datos.solicitudesPendientes = await solicitudes.countDocuments({
          estado: 'pendiente',
        })
      })()
    )
  }

  if (puede(usuario, 'usuarios.gestionar')) {
    tareas.push(
      (async () => {
        const usuarios = await col(COLECCIONES.usuarios)
        const invitaciones = await col(COLECCIONES.invitaciones)
        const [porRol, nuevosHoy, activas] = await Promise.all([
          usuarios
            .aggregate([{ $group: { _id: '$rol', n: { $sum: 1 } } }])
            .toArray(),
          usuarios.countDocuments({ creadoEn: { $gte: inicioHoy } }),
          invitaciones.countDocuments({
            revocada: { $ne: true },
            venceEn: { $gt: new Date() },
            $expr: { $lt: ['$usos', '$usosMaximos'] },
          }),
        ])
        datos.personas = {
          porRol: Object.fromEntries(porRol.map((r) => [r._id, r.n])),
          total: porRol.reduce((s, r) => s + r.n, 0),
          nuevosHoy,
          invitacionesActivas: activas,
        }
      })()
    )
  }

  tareas.push(
    (async () => {
      const eventos = await col(COLECCIONES.eventos)
      const proximos = await eventos
        .find({ inicio: { $gte: inicioHoy } })
        .sort({ inicio: 1 })
        .limit(4)
        .project({ titulo: 1, fecha: 1, hora: 1, inicio: 1 })
        .toArray()
      datos.proximosEventos = proximos.map((e) => ({
        id: String(e._id),
        titulo: e.titulo,
        hora: e.hora,
        inicio: e.inicio,
      }))
    })()
  )

  await Promise.all(tareas)
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
