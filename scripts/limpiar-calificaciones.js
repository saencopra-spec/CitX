/**
 * Quita de la base los restos del sistema de calificaciones, que ya no existe.
 *
 * Uso:  node scripts/limpiar-calificaciones.js             (solo cuenta)
 *       node scripts/limpiar-calificaciones.js --confirmar  (borra)
 *
 * - Borra la coleccion `calificaciones`.
 * - Quita `calificacionSuma` y `calificacionCantidad` de los productos.
 * - Quita `calificados` de los pedidos.
 *
 * No se corre solo: hay que ejecutarlo a mano contra la base que corresponda.
 */
import 'dotenv/config'
import { bd, cerrar, COLECCIONES } from '../api/_lib/db.js'

const CALIFICACIONES = 'calificaciones'
const confirmar = process.argv.includes('--confirmar')

async function principal() {
  const base = await bd()
  const productos = base.collection(COLECCIONES.productos)
  const pedidos = base.collection(COLECCIONES.pedidos)
  const existe =
    (await base.listCollections({ name: CALIFICACIONES }).toArray()).length > 0

  const filtroProductos = {
    $or: [
      { calificacionSuma: { $exists: true } },
      { calificacionCantidad: { $exists: true } },
    ],
  }
  const filtroPedidos = { calificados: { $exists: true } }

  const conteo = {
    calificaciones: existe
      ? await base.collection(CALIFICACIONES).countDocuments()
      : 0,
    productos: await productos.countDocuments(filtroProductos),
    pedidos: await pedidos.countDocuments(filtroPedidos),
  }
  console.log(
    `Coleccion calificaciones: ${existe ? `${conteo.calificaciones} documentos` : 'no existe'}`
  )
  console.log(`Productos con campos de calificacion: ${conteo.productos}`)
  console.log(`Pedidos con el campo calificados: ${conteo.pedidos}`)

  if (!confirmar) {
    console.log('\nNo se borro nada. Volve a correrlo con --confirmar.')
    return
  }

  if (existe) await base.collection(CALIFICACIONES).drop()
  const rp = await productos.updateMany(filtroProductos, {
    $unset: { calificacionSuma: '', calificacionCantidad: '' },
  })
  const rd = await pedidos.updateMany(filtroPedidos, {
    $unset: { calificados: '' },
  })
  console.log(
    `\nListo: coleccion ${existe ? 'borrada' : 'sin cambios'}, ${rp.modifiedCount} productos y ${rd.modifiedCount} pedidos limpiados.`
  )
}

principal()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(cerrar)
