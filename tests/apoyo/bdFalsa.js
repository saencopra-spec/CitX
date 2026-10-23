import { ObjectId } from 'mongodb'

/**
 * Base de datos en memoria que imita lo poco de MongoDB que usan las rutas de
 * pedidos y sanciones. Sirve para probar la API completa sin un servidor de
 * Mongo. No pretende ser fiel en todo: solo en lo que estas pruebas necesitan.
 */

/** Copia profunda que conserva ObjectId y Date (structuredClone los pierde). */
function clonar(v) {
  if (v instanceof ObjectId) return v
  if (v instanceof Date) return new Date(v)
  if (Array.isArray(v)) return v.map(clonar)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clonar(x)]))
  }
  return v
}

function valorEn(doc, ruta) {
  return ruta
    .split('.')
    .reduce((v, parte) => (v == null ? undefined : v[parte]), doc)
}

function comparable(v) {
  if (v instanceof Date) return v.getTime()
  if (v instanceof ObjectId) return String(v)
  return v
}

function igual(a, b) {
  if (b === null) return a === null || a === undefined
  if (Array.isArray(a) && !Array.isArray(b)) {
    return a.some((x) => igual(x, b))
  }
  return comparable(a) === comparable(b)
}

function cumpleOperadores(valor, condicion) {
  return Object.entries(condicion).every(([op, arg]) => {
    switch (op) {
      case '$in':
        return arg.some((x) => igual(valor, x))
      case '$nin':
        return !arg.some((x) => igual(valor, x))
      case '$ne':
        return !igual(valor, arg)
      case '$gt':
        return valor != null && comparable(valor) > comparable(arg)
      case '$gte':
        return valor != null && comparable(valor) >= comparable(arg)
      case '$lt':
        return valor != null && comparable(valor) < comparable(arg)
      case '$lte':
        return valor != null && comparable(valor) <= comparable(arg)
      case '$exists':
        return (valor !== undefined) === Boolean(arg)
      case '$regex':
        return new RegExp(arg, condicion.$options ?? '').test(
          String(valor ?? '')
        )
      case '$options':
        return true
      default:
        throw new Error(`Operador no soportado en la base falsa: ${op}`)
    }
  })
}

export function coincide(doc, filtro = {}) {
  return Object.entries(filtro).every(([clave, condicion]) => {
    if (clave === '$or') return condicion.some((f) => coincide(doc, f))
    if (clave === '$nor') return !condicion.some((f) => coincide(doc, f))
    const valor = valorEn(doc, clave)
    const esOperador =
      condicion &&
      typeof condicion === 'object' &&
      !(condicion instanceof Date) &&
      !(condicion instanceof ObjectId) &&
      Object.keys(condicion).some((k) => k.startsWith('$'))
    return esOperador
      ? cumpleOperadores(valor, condicion)
      : igual(valor, condicion)
  })
}

function ponerEn(doc, ruta, valor) {
  const partes = ruta.split('.')
  let actual = doc
  for (const p of partes.slice(0, -1)) {
    actual[p] ??= {}
    actual = actual[p]
  }
  actual[partes.at(-1)] = valor
}

function aplicar(doc, cambios) {
  for (const [ruta, valor] of Object.entries(cambios.$set ?? {})) {
    ponerEn(doc, ruta, clonar(valor))
  }
  for (const [ruta, valor] of Object.entries(cambios.$push ?? {})) {
    const lista = valorEn(doc, ruta) ?? []
    lista.push(clonar(valor))
    ponerEn(doc, ruta, lista)
  }
  for (const ruta of Object.keys(cambios.$unset ?? {})) {
    const partes = ruta.split('.')
    const padre = valorEn(doc, partes.slice(0, -1).join('.')) ?? doc
    delete padre[partes.at(-1)]
  }
}

function ordenar(lista, orden) {
  const claves = Object.entries(orden)
  return [...lista].sort((a, b) => {
    for (const [clave, dir] of claves) {
      const x = comparable(valorEn(a, clave))
      const y = comparable(valorEn(b, clave))
      if (x === y) continue
      if (x === undefined) return dir
      if (y === undefined) return -dir
      return x < y ? -dir : dir
    }
    return 0
  })
}

function cursor(obtener) {
  let orden = null
  let tope = Infinity
  const c = {
    sort(o) {
      orden = o
      return c
    },
    limit(n) {
      tope = n
      return c
    },
    async toArray() {
      let lista = obtener()
      if (orden) lista = ordenar(lista, orden)
      return lista.slice(0, tope).map((d) => clonar(d))
    },
    async next() {
      return (await c.toArray())[0] ?? null
    },
  }
  return c
}

/** Solo $match y $group con $sum, que es lo que usan las rutas probadas. */
function agregar(docs, etapas) {
  let lista = docs
  for (const etapa of etapas) {
    if (etapa.$match) lista = lista.filter((d) => coincide(d, etapa.$match))
    else if (etapa.$group) {
      const { _id, ...campos } = etapa.$group
      const grupos = new Map()
      const evaluar = (d, expr) =>
        typeof expr === 'string' && expr.startsWith('$')
          ? valorEn(d, expr.slice(1))
          : expr
      for (const d of lista) {
        const id =
          _id && typeof _id === 'object'
            ? Object.fromEntries(
                Object.entries(_id).map(([k, v]) => [k, evaluar(d, v)])
              )
            : evaluar(d, _id)
        const llave = JSON.stringify(id)
        if (!grupos.has(llave)) {
          grupos.set(
            llave,
            Object.fromEntries([
              ['_id', id],
              ...Object.keys(campos).map((k) => [k, 0]),
            ])
          )
        }
        const g = grupos.get(llave)
        for (const [k, expr] of Object.entries(campos)) {
          g[k] += Number(evaluar(d, expr.$sum)) || 0
        }
      }
      lista = [...grupos.values()]
    } else {
      throw new Error('Etapa de agregacion no soportada en la base falsa.')
    }
  }
  return lista
}

function crearColeccion() {
  let docs = []
  return {
    get docs() {
      return docs
    },
    find(filtro = {}) {
      return cursor(() => docs.filter((d) => coincide(d, filtro)))
    },
    async findOne(filtro = {}) {
      const d = docs.find((x) => coincide(x, filtro))
      return d ? clonar(d) : null
    },
    async insertOne(doc) {
      doc._id ??= new ObjectId()
      docs.push(clonar(doc))
      return { insertedId: doc._id }
    },
    async insertMany(lista) {
      for (const d of lista) await this.insertOne(d)
      return { insertedCount: lista.length }
    },
    async updateOne(filtro, cambios) {
      const d = docs.find((x) => coincide(x, filtro))
      if (d) aplicar(d, cambios)
      return { matchedCount: d ? 1 : 0, modifiedCount: d ? 1 : 0 }
    },
    async updateMany(filtro, cambios) {
      const lista = docs.filter((x) => coincide(x, filtro))
      lista.forEach((d) => aplicar(d, cambios))
      return { matchedCount: lista.length, modifiedCount: lista.length }
    },
    async findOneAndUpdate(filtro, cambios) {
      const d = docs.find((x) => coincide(x, filtro))
      if (!d) return null
      aplicar(d, cambios)
      return clonar(d)
    },
    async deleteOne(filtro) {
      const i = docs.findIndex((x) => coincide(x, filtro))
      if (i !== -1) docs.splice(i, 1)
      return { deletedCount: i === -1 ? 0 : 1 }
    },
    async distinct(campo, filtro = {}) {
      return [
        ...new Set(
          docs.filter((d) => coincide(d, filtro)).map((d) => valorEn(d, campo))
        ),
      ]
    },
    aggregate(etapas) {
      return cursor(() => agregar(docs, etapas))
    },
    async countDocuments(filtro = {}) {
      return docs.filter((d) => coincide(d, filtro)).length
    },
    vaciar() {
      docs = []
    },
  }
}

export function crearBdFalsa(COLECCIONES) {
  const colecciones = new Map()
  const coleccion = (nombre) => {
    if (!colecciones.has(nombre)) colecciones.set(nombre, crearColeccion())
    return colecciones.get(nombre)
  }
  return {
    coleccion,
    vaciar: () => colecciones.forEach((c) => c.vaciar()),
    modulo: {
      COLECCIONES,
      col: async (nombre) => coleccion(nombre),
      bd: async () => ({ collection: coleccion }),
      conectar: async () => null,
      asegurarIndices: async () => {},
      cerrar: async () => {},
    },
  }
}
