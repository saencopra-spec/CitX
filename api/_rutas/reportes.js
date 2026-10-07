import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok } from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'
import { partesCR, sumarDias, fechaDesdeCR } from '../../compartido/hora.js'

/**
 * Reportes de la soda: que se vende mas, cuanto entra por dia, horas pico y
 * metodos de pago. Se calculan con agregaciones de MongoDB sobre los pedidos.
 */
registrar('GET', '/reportes/soda', async ({ req, res, query }) => {
  await requerir(req, 'reportes.ver')
  const dias = [7, 30, 90].includes(Number(query.dias))
    ? Number(query.dias)
    : 30
  const hoy = partesCR().iso
  const desdeIso = sumarDias(hoy, -(dias - 1))
  const desde = fechaDesdeCR(desdeIso, '00:00')
  const pedidos = await col(COLECCIONES.pedidos)
  const productos = await col(COLECCIONES.productos)

  const base = { creadoEn: { $gte: desde } }
  const zona = 'America/Costa_Rica'

  const [
    resumen,
    top,
    porDia,
    porHora,
    porMetodo,
    porFranja,
    porEstado,
    catalogo,
  ] = await Promise.all([
    pedidos
      .aggregate([
        { $match: base },
        {
          $group: {
            _id: null,
            pedidos: { $sum: 1 },
            ingresos: { $sum: '$total' },
            unidades: { $sum: { $sum: '$items.cantidad' } },
            clientes: { $addToSet: '$usuarioId' },
          },
        },
      ])
      .toArray(),
    pedidos
      .aggregate([
        { $match: base },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productoId',
            nombre: { $last: '$items.nombre' },
            unidades: { $sum: '$items.cantidad' },
            ingresos: {
              $sum: { $multiply: ['$items.precio', '$items.cantidad'] },
            },
            pedidos: { $sum: 1 },
          },
        },
        { $sort: { unidades: -1 } },
      ])
      .toArray(),
    pedidos
      .aggregate([
        { $match: base },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$creadoEn',
                timezone: zona,
              },
            },
            pedidos: { $sum: 1 },
            ingresos: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    pedidos
      .aggregate([
        { $match: base },
        {
          $group: {
            _id: { $hour: { date: '$creadoEn', timezone: zona } },
            pedidos: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    pedidos
      .aggregate([
        { $match: base },
        {
          $group: {
            _id: '$pago.metodo',
            pedidos: { $sum: 1 },
            ingresos: { $sum: '$total' },
          },
        },
      ])
      .toArray(),
    pedidos
      .aggregate([
        { $match: base },
        { $group: { _id: '$franja.nombre', pedidos: { $sum: 1 } } },
        { $sort: { pedidos: -1 } },
      ])
      .toArray(),
    pedidos
      .aggregate([
        { $match: base },
        { $group: { _id: '$estado', pedidos: { $sum: 1 } } },
      ])
      .toArray(),
    productos
      .find(
        {},
        {
          projection: {
            nombre: 1,
            categoria: 1,
            calificacionSuma: 1,
            calificacionCantidad: 1,
            disponible: 1,
          },
        }
      )
      .toArray(),
  ])

  const porId = new Map(catalogo.map((p) => [String(p._id), p]))

  // Ventas por categoria, usando la categoria actual de cada producto.
  const categorias = {}
  for (const t of top) {
    const cat = porId.get(t._id)?.categoria ?? 'otros'
    categorias[cat] ??= { categoria: cat, unidades: 0, ingresos: 0 }
    categorias[cat].unidades += t.unidades
    categorias[cat].ingresos += t.ingresos
  }

  // Serie diaria completa (los dias sin ventas tambien aparecen, en cero).
  const mapaDias = new Map(porDia.map((d) => [d._id, d]))
  const serie = []
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(desdeIso, i)
    serie.push({
      fecha: f,
      pedidos: mapaDias.get(f)?.pedidos ?? 0,
      ingresos: mapaDias.get(f)?.ingresos ?? 0,
    })
  }

  const vendidos = new Set(top.map((t) => t._id))
  const r = resumen[0] ?? { pedidos: 0, ingresos: 0, unidades: 0, clientes: [] }

  ok(res, {
    dias,
    desde: desdeIso,
    hasta: hoy,
    resumen: {
      pedidos: r.pedidos,
      ingresos: r.ingresos,
      unidades: r.unidades,
      clientes: r.clientes.filter((c) => c !== 'borrado').length,
      ticketPromedio: r.pedidos ? Math.round(r.ingresos / r.pedidos) : 0,
    },
    masVendidos: top.slice(0, 15).map((t) => ({
      productoId: t._id,
      nombre: t.nombre,
      categoria: porId.get(t._id)?.categoria ?? null,
      unidades: t.unidades,
      ingresos: t.ingresos,
      pedidos: t.pedidos,
    })),
    porCategoria: Object.values(categorias).sort(
      (a, b) => b.ingresos - a.ingresos
    ),
    porDia: serie,
    porHora: porHora.map((h) => ({ hora: h._id, pedidos: h.pedidos })),
    porMetodo: porMetodo.map((m) => ({
      metodo: m._id,
      pedidos: m.pedidos,
      ingresos: m.ingresos,
    })),
    porFranja: porFranja.map((f) => ({ franja: f._id, pedidos: f.pedidos })),
    porEstado: Object.fromEntries(porEstado.map((e) => [e._id, e.pedidos])),
    sinVentas: catalogo
      .filter((p) => !vendidos.has(String(p._id)))
      .map((p) => ({
        nombre: p.nombre,
        categoria: p.categoria,
        disponible: p.disponible !== false,
      })),
    mejorCalificados: catalogo
      .filter((p) => p.calificacionCantidad > 0)
      .map((p) => ({
        nombre: p.nombre,
        calificacion:
          Math.round((p.calificacionSuma / p.calificacionCantidad) * 10) / 10,
        cantidad: p.calificacionCantidad,
      }))
      .sort(
        (a, b) => b.calificacion - a.calificacion || b.cantidad - a.cantidad
      )
      .slice(0, 8),
  })
})
