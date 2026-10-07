/**
 * Llena la base de datos con los datos de ejemplo de CitX.
 *
 * Uso:  npm run seed
 *
 * Se puede correr varias veces: reemplaza los lugares, el menu, las materias,
 * los horarios, la enfermeria, los eventos y objetos de ejemplo, y actualiza
 * las cuentas de demostracion. No borra las cuentas que la gente creo ni sus
 * pedidos. Con --limpiar-pedidos tambien vacia pedidos y notificaciones.
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { bd, cerrar, asegurarIndices, COLECCIONES } from '../api/_lib/db.js'
import { partesCR, sumarDias, fechaDesdeCR } from '../compartido/hora.js'
import {
  CUENTAS_DEMO,
  LUGARES,
  PRODUCTOS,
  EVENTOS,
  MATERIAS,
  OBJETOS,
  ENFERMERIA,
  SECCIONES_CON_HORARIO,
  horarioDeEjemplo,
} from './datos-iniciales.js'

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Falta MONGODB_URI en el archivo .env. Mirá .env.example.')
    process.exit(1)
  }

  const base = await bd()
  await asegurarIndices()
  const ahora = new Date()
  const hoy = partesCR(ahora).iso

  // Cuentas de demostracion
  const usuarios = base.collection(COLECCIONES.usuarios)
  const ids = {}
  for (const c of CUENTAS_DEMO) {
    const hash = await bcrypt.hash(c.contrasena, 10)
    const r = await usuarios.findOneAndUpdate(
      { correo: c.correo },
      {
        $set: {
          nombre: c.nombre,
          hash,
          rol: c.rol,
          seccion: c.seccion,
          activo: true,
          demo: true,
        },
        $setOnInsert: { favoritos: [], configuracion: null, creadoEn: ahora },
      },
      { upsert: true, returnDocument: 'after' }
    )
    ids[c.rol] = r
  }
  console.log(`Cuentas de demostración: ${CUENTAS_DEMO.length}`)

  // Lugares del mapa
  const lugares = base.collection(COLECCIONES.lugares)
  await lugares.deleteMany({})
  await lugares.insertMany(LUGARES.map((l) => ({ ...l, actualizadoEn: ahora })))
  console.log(`Lugares: ${LUGARES.length}`)

  // Menu de la soda (con calificaciones de ejemplo)
  const productos = base.collection(COLECCIONES.productos)
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

  // Materias y horarios
  const materias = base.collection(COLECCIONES.materias)
  await materias.deleteMany({})
  await materias.insertMany(MATERIAS.map((m, orden) => ({ ...m, orden })))
  const horarios = base.collection(COLECCIONES.horarios)
  await horarios.deleteMany({})
  await horarios.insertMany(
    SECCIONES_CON_HORARIO.map((s) => ({
      ...horarioDeEjemplo(s),
      actualizadoEn: ahora,
    }))
  )
  console.log(
    `Materias: ${MATERIAS.length}. Horarios: ${SECCIONES_CON_HORARIO.length} secciones.`
  )

  // Enfermeria
  await base
    .collection(COLECCIONES.enfermeria)
    .updateOne(
      { clave: 'principal' },
      { $set: { ...ENFERMERIA, actualizadoEn: ahora } },
      { upsert: true }
    )

  // Eventos de ejemplo, con fechas a partir de hoy
  const eventos = base.collection(COLECCIONES.eventos)
  await eventos.deleteMany({ demo: true })
  const autor = ids.profesor
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

  // Recordatorio de ejemplo de la profesora para 10-1
  const recordatorios = base.collection(COLECCIONES.recordatorios)
  await recordatorios.deleteMany({ demo: true })
  await recordatorios.insertMany([
    {
      titulo: 'Entregar el avance del proyecto de ExpoTécnica',
      materia: 'Desarrollo de Software',
      fecha: sumarDias(hoy, 1),
      secciones: ['10-1'],
      autorId: String(autor._id),
      autorNombre: autor.nombre,
      hecho: false,
      hechoPor: [],
      demo: true,
      creadoEn: ahora,
    },
    {
      titulo: 'Estudiar para la prueba corta de Inglés',
      materia: 'Inglés',
      fecha: sumarDias(hoy, 3),
      secciones: [],
      autorId: String(ids.estudiante._id),
      autorNombre: ids.estudiante.nombre,
      hecho: false,
      hechoPor: [],
      demo: true,
      creadoEn: ahora,
    },
  ])

  // Objetos perdidos
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

  if (process.argv.includes('--limpiar-pedidos')) {
    await base.collection(COLECCIONES.pedidos).deleteMany({})
    await base.collection(COLECCIONES.notificaciones).deleteMany({})
    console.log('Pedidos y notificaciones borrados.')
  }

  console.log('\nListo. Cuentas de demostración:')
  for (const c of CUENTAS_DEMO)
    console.log(`  ${c.rol.padEnd(15)} ${c.correo.padEnd(28)} ${c.contrasena}`)
}

main()
  .catch((e) => {
    console.error('No se pudo cargar la base:', e.message)
    process.exitCode = 1
  })
  .finally(() => cerrar())
