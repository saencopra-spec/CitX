/**
 * Llena la base de datos con los datos de CitX.
 *
 * Uso:  npm run seed
 *
 * - Lugares del mapa: agrega los que falten, sin pisar lo que la
 *   administracion haya editado. Con --reiniciar-lugares los vuelve a los
 *   valores oficiales.
 * - Menu, materias, horarios, enfermeria, eventos y objetos de ejemplo: los
 *   renueva.
 * - No crea cuentas, salvo con --cuentas-demo (cinco cuentas *@citx.demo).
 * - --limpiar-pedidos borra pedidos y notificaciones.
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { bd, cerrar, asegurarIndices, COLECCIONES } from '../api/_lib/db.js'
import { partesCR, sumarDias, fechaDesdeCR } from '../compartido/hora.js'
import { LUGARES_CIT } from '../compartido/campus.js'
import {
  CUENTAS_DEMO,
  PRODUCTOS,
  EVENTOS,
  MATERIAS,
  OBJETOS,
  ENFERMERIA,
  SECCIONES_CON_HORARIO,
  horarioDeEjemplo,
} from './datos-iniciales.js'

const opcion = (n) => process.argv.includes(n)

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Falta MONGODB_URI en el archivo .env. Mirá .env.example.')
    process.exit(1)
  }

  const base = await bd()
  await asegurarIndices()
  const ahora = new Date()
  const hoy = partesCR(ahora).iso
  const usuarios = base.collection(COLECCIONES.usuarios)

  if (opcion('--cuentas-demo')) {
    for (const c of CUENTAS_DEMO) {
      await usuarios.updateOne(
        { correo: c.correo },
        {
          $set: {
            nombre: c.nombre,
            hash: await bcrypt.hash(c.contrasena, 10),
            rol: c.rol,
            seccion: c.seccion,
            activo: true,
            demo: true,
          },
          $setOnInsert: {
            favoritos: [],
            configuracion: null,
            versionSesion: 0,
            creadoEn: ahora,
          },
        },
        { upsert: true }
      )
    }
    console.log(`Cuentas de demostración: ${CUENTAS_DEMO.length}`)
  }

  // Lugares del mapa
  const lugares = base.collection(COLECCIONES.lugares)
  if (opcion('--reiniciar-lugares')) await lugares.deleteMany({})
  let nuevos = 0
  for (const l of LUGARES_CIT) {
    const r = await lugares.updateOne(
      { clave: l.clave },
      { $setOnInsert: { notaAcceso: '', ...l, actualizadoEn: ahora } },
      { upsert: true }
    )
    if (r.upsertedCount) nuevos++
  }
  console.log(`Lugares: ${LUGARES_CIT.length} oficiales (${nuevos} nuevos)`)

  // Menu de la soda (con calificaciones de ejemplo)
  const productos = base.collection(COLECCIONES.productos)
  if ((await productos.countDocuments()) === 0 || opcion('--reiniciar-menu')) {
    await productos.deleteMany({})
    await base.collection(COLECCIONES.calificaciones).deleteMany({})
    await productos.insertMany(
      PRODUCTOS.map(({ estrellas = [], disponible = true, ...p }) => ({
        ...p,
        disponible,
        oculto: false,
        calificacionSuma: estrellas.reduce((a, b) => a + b, 0),
        calificacionCantidad: estrellas.length,
        creadoEn: ahora,
      }))
    )
    console.log(`Productos: ${PRODUCTOS.length}`)
  } else {
    console.log(
      'Productos: se conservan los del panel (usá --reiniciar-menu para renovarlos)'
    )
  }

  // Materias y horarios
  const materias = base.collection(COLECCIONES.materias)
  await materias.deleteMany({})
  await materias.insertMany(MATERIAS.map((m, orden) => ({ ...m, orden })))
  const horarios = base.collection(COLECCIONES.horarios)
  for (const s of SECCIONES_CON_HORARIO) {
    await horarios.updateOne(
      { seccion: s },
      { $setOnInsert: { ...horarioDeEjemplo(s), actualizadoEn: ahora } },
      { upsert: true }
    )
  }
  console.log(
    `Materias: ${MATERIAS.length}. Horarios de ejemplo: ${SECCIONES_CON_HORARIO.length} secciones.`
  )

  // Enfermeria (solo si no existe)
  await base
    .collection(COLECCIONES.enfermeria)
    .updateOne(
      { clave: 'principal' },
      { $setOnInsert: { ...ENFERMERIA, actualizadoEn: ahora } },
      { upsert: true }
    )

  // Eventos de ejemplo, con fechas a partir de hoy
  const autor = (await usuarios.findOne({ rol: 'admin' })) ?? {
    _id: 'sistema',
    nombre: 'Administración CIT',
  }
  const eventos = base.collection(COLECCIONES.eventos)
  await eventos.deleteMany({ demo: true })
  await eventos.insertMany(
    EVENTOS.map(({ dias, ...e }) => {
      const fecha = sumarDias(hoy, dias)
      return {
        ...e,
        lugarTexto: '',
        fecha,
        inicio: fechaDesdeCR(fecha, e.hora),
        autorId: String(autor._id),
        autorNombre: autor.nombre,
        demo: true,
        creadoEn: ahora,
      }
    })
  )
  console.log(`Eventos: ${EVENTOS.length}`)

  // Objetos perdidos de ejemplo
  const objetos = base.collection(COLECCIONES.objetosPerdidos)
  const viejos = await objetos
    .find({ demo: true }, { projection: { _id: 1 } })
    .toArray()
  await base
    .collection(COLECCIONES.solicitudesObjetos)
    .deleteMany({ objetoId: { $in: viejos.map((o) => String(o._id)) } })
  await objetos.deleteMany({ demo: true })
  await objetos.insertMany(
    OBJETOS.map(({ diasAtras, ...o }) => ({
      ...o,
      encontradoEl: sumarDias(hoy, -diasAtras),
      estado: 'disponible',
      demo: true,
      creadoEn: ahora,
    }))
  )
  console.log(`Objetos perdidos: ${OBJETOS.length}`)

  if (opcion('--limpiar-pedidos')) {
    await base.collection(COLECCIONES.pedidos).deleteMany({})
    await base.collection(COLECCIONES.notificaciones).deleteMany({})
    console.log('Pedidos y notificaciones borrados.')
  }

  console.log('\nListo.')
}

main()
  .catch((e) => {
    console.error('No se pudo cargar la base:', e.message)
    process.exitCode = 1
  })
  .finally(() => cerrar())
