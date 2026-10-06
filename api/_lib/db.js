import { MongoClient } from 'mongodb'

/**
 * Conexion a MongoDB Atlas.
 *
 * Las funciones de Vercel se apagan y se vuelven a levantar todo el tiempo. Si
 * abrieramos una conexion nueva en cada llamada, Atlas se quedaria sin cupo en
 * minutos. Por eso guardamos el cliente en una variable global que sobrevive
 * entre invocaciones que caen en la misma instancia.
 */

const URI = process.env.MONGODB_URI
const NOMBRE_BD = process.env.MONGODB_DB || 'citx'

if (!globalThis._citxMongo) {
  globalThis._citxMongo = { cliente: null, promesa: null }
}

const cache = globalThis._citxMongo

export async function conectar() {
  if (!URI) {
    throw new Error(
      'Falta la variable de entorno MONGODB_URI. Revisa el archivo .env o la configuracion del proyecto en Vercel.'
    )
  }

  if (cache.cliente) return cache.cliente

  if (!cache.promesa) {
    const cliente = new MongoClient(URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      retryWrites: true,
    })
    cache.promesa = cliente.connect().then((c) => {
      cache.cliente = c
      return c
    })
  }

  try {
    return await cache.promesa
  } catch (e) {
    // Si fallo, limpiamos para que el proximo intento vuelva a probar.
    cache.promesa = null
    throw e
  }
}

export async function bd() {
  const cliente = await conectar()
  return cliente.db(NOMBRE_BD)
}

/** Acceso corto a una coleccion. */
export async function col(nombre) {
  return (await bd()).collection(nombre)
}

export const COLECCIONES = {
  usuarios: 'usuarios',
  lugares: 'lugares',
  eventos: 'eventos',
  productos: 'productos',
  pedidos: 'pedidos',
  objetosPerdidos: 'objetos_perdidos',
  solicitudesObjetos: 'solicitudes_objetos',
  recordatorios: 'recordatorios',
  horarios: 'horarios',
  materias: 'materias',
  enfermeria: 'enfermeria',
  notificaciones: 'notificaciones',
  calificaciones: 'calificaciones',
  intentosEntrada: 'intentos_entrada',
}

/**
 * Indices de la base. Se crean una sola vez por instancia; MongoDB ignora la
 * llamada si el indice ya existe.
 */
export async function asegurarIndices() {
  if (cache.indicesListos) return
  const base = await bd()
  await Promise.all([
    base
      .collection(COLECCIONES.usuarios)
      .createIndex({ correo: 1 }, { unique: true }),
    base
      .collection(COLECCIONES.lugares)
      .createIndex({ clave: 1 }, { unique: true }),
    base.collection(COLECCIONES.eventos).createIndex({ fecha: 1 }),
    base
      .collection(COLECCIONES.pedidos)
      .createIndex({ codigo: 1 }, { unique: true }),
    base
      .collection(COLECCIONES.pedidos)
      .createIndex({ usuarioId: 1, creadoEn: -1 }),
    base
      .collection(COLECCIONES.pedidos)
      .createIndex({ estado: 1, creadoEn: -1 }),
    base
      .collection(COLECCIONES.recordatorios)
      .createIndex({ usuarioId: 1, fecha: 1 }),
    base
      .collection(COLECCIONES.notificaciones)
      .createIndex({ usuarioId: 1, creadoEn: -1 }),
    base
      .collection(COLECCIONES.horarios)
      .createIndex({ seccion: 1 }, { unique: true }),
    base
      .collection(COLECCIONES.intentosEntrada)
      .createIndex({ creadoEn: 1 }, { expireAfterSeconds: 900 }),
    base.collection(COLECCIONES.intentosEntrada).createIndex({ llave: 1 }),
  ])
  cache.indicesListos = true
}
