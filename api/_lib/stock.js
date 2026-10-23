import { malaPeticion } from './respuesta.js'
import { sePuedePedir } from '../../compartido/soda.js'

/**
 * Descuento del stock al crear un pedido.
 *
 * Cada producto con control de stock se descuenta con un update condicional
 * (`stock >= cantidad`), asi dos pedidos por la ultima unidad no pueden
 * pasar los dos. Si uno de los productos no alcanza, se devuelve en esta
 * misma solicitud lo que ya se habia descontado y el pedido no se crea.
 *
 * Una vez creado el pedido, las unidades no vuelven nunca solas al stock.
 */

function faltan(p) {
  return malaPeticion(
    `No quedan suficientes unidades de ${p.nombre}. Quitalo del carrito o pedí menos.`
  )
}

function agotado(p) {
  return malaPeticion(
    `${p.nombre} se acaba de agotar. Quitalo del carrito para seguir.`
  )
}

/** Devuelve lo descontado en esta solicitud (si el pedido no se creo). */
export async function devolverStock(productos, descontados) {
  for (const { _id, cantidad } of descontados) {
    await productos.updateOne(
      { _id, controlStock: true },
      { $inc: { stock: cantidad } }
    )
  }
}

/**
 * `lineas`: [{ producto, cantidad }] con un solo renglon por producto.
 * Devuelve la lista de lo descontado, por si hay que devolverlo.
 */
export async function descontarStock(productos, lineas) {
  const descontados = []
  try {
    for (const { producto: p, cantidad } of lineas) {
      if (!p.controlStock) continue
      const r = await productos.updateOne(
        { _id: p._id, controlStock: true, stock: { $gte: cantidad } },
        { $inc: { stock: -cantidad } }
      )
      if (r.modifiedCount === 1) {
        descontados.push({ _id: p._id, cantidad })
        continue
      }
      // No alcanzo, o le apagaron el control de stock en el medio.
      const actual = await productos.findOne({ _id: p._id })
      if (!actual || actual.oculto) {
        throw malaPeticion('Uno de los productos ya no está en el menú.')
      }
      if (actual.controlStock) {
        throw (Number(actual.stock) || 0) > 0 ? faltan(p) : agotado(p)
      }
      if (!sePuedePedir(actual)) throw agotado(p)
    }
  } catch (e) {
    await devolverStock(productos, descontados)
    throw e
  }
  return descontados
}
