import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ObjectId } from 'mongodb'

// La API corre completa, pero contra una base en memoria (tests/apoyo).
const falsa = vi.hoisted(() => ({ actual: null }))
vi.mock('../api/_lib/db.js', async (importOriginal) => {
  const real = await importOriginal()
  const { crearBdFalsa } = await import('./apoyo/bdFalsa.js')
  falsa.actual = crearBdFalsa(real.COLECCIONES)
  return falsa.actual.modulo
})

import handler from '../api/index.js'
import { firmar, NOMBRE_COOKIE } from '../api/_lib/sesion.js'
import { franjasDeRetiro } from '../compartido/jornada.js'
import { estadoDe, UMBRAL_POCAS } from '../compartido/soda.js'

process.env.JWT_SECRET = 'clave-de-pruebas-con-mas-de-32-caracteres-123'
process.env.MONGODB_URI = 'mongodb://pruebas'

const col = (nombre) => falsa.actual.coleccion(nombre)

async function llamar(metodo, ruta, { como, cuerpo } = {}) {
  const req = {
    method: metodo,
    url: `/api${ruta}`,
    headers: { host: 'localhost' },
    body: cuerpo ?? {},
  }
  if (como) req.headers.cookie = `${NOMBRE_COOKIE}=${firmar(como)}`
  const res = {
    statusCode: 0,
    setHeader() {},
    end(texto) {
      this.cuerpo = texto ? JSON.parse(texto) : null
    },
  }
  await handler(req, res)
  return { estado: res.statusCode, cuerpo: res.cuerpo }
}

async function crearUsuario(rol, datos = {}) {
  const u = {
    _id: new ObjectId(),
    nombre: `Persona ${rol}`,
    correo: `${rol}-${Math.random().toString(36).slice(2, 7)}@cit.ed.cr`,
    rol,
    seccion: rol === 'estudiante' ? '10-A' : null,
    activo: true,
    ...datos,
  }
  await col('usuarios').insertOne(u)
  return u
}

async function crearProducto(datos = {}) {
  const p = {
    _id: new ObjectId(),
    nombre: 'Empanada',
    categoria: 'snacks',
    descripcion: 'Empanada de queso recién hecha.',
    precio: 800,
    oculto: false,
    ...datos,
  }
  await col('productos').insertOne(p)
  return p
}

const stockDe = async (p) =>
  (await col('productos').findOne({ _id: p._id })).stock

function pedir(como, items) {
  const franja = franjasDeRetiro()[0]
  return llamar('POST', '/pedidos', {
    como,
    cuerpo: {
      items: items.map(([p, cantidad, nota = '']) => ({
        productoId: String(p._id),
        cantidad,
        nota,
      })),
      franja: { fecha: franja.fecha, clave: franja.clave },
      pago: { metodo: 'efectivo' },
    },
  })
}

beforeEach(() => falsa.actual.vaciar())

// ---------------------------------------------------------------------------

describe('Estado de un producto', () => {
  it('sin stock usa el estado elegido a mano', () => {
    expect(estadoDe({ estado: 'pocas' })).toBe('pocas')
    expect(estadoDe({ estado: 'agotado' })).toBe('agotado')
  })

  it('los productos de antes conservan Disponible o Agotado', () => {
    expect(estadoDe({ disponible: true })).toBe('disponible')
    expect(estadoDe({})).toBe('disponible')
    expect(estadoDe({ disponible: false })).toBe('agotado')
  })

  it('con stock se calcula con las unidades y el umbral', () => {
    const p = (stock, umbralPocas) => ({
      controlStock: true,
      stock,
      umbralPocas,
    })
    expect(estadoDe(p(6))).toBe('disponible')
    expect(estadoDe(p(UMBRAL_POCAS))).toBe('pocas')
    expect(estadoDe(p(1))).toBe('pocas')
    expect(estadoDe(p(0))).toBe('agotado')
    expect(estadoDe(p(3, 2))).toBe('disponible')
    expect(estadoDe(p(2, 2))).toBe('pocas')
    // Con stock, el estado guardado a mano no cuenta.
    expect(estadoDe({ ...p(10), estado: 'agotado' })).toBe('disponible')
  })
})

describe('API: descuento de stock al pedir', () => {
  it('descuenta las unidades y cambia el estado solo', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearProducto({ controlStock: true, stock: 8 })
    const r = await pedir(est, [[p, 3]])
    expect(r.estado).toBe(201)
    expect(await stockDe(p)).toBe(5)

    const menu = await llamar('GET', '/soda/productos', { como: est })
    const enMenu = menu.cuerpo.productos[0]
    expect(enMenu.estado).toBe('pocas')
    // El estudiante nunca ve el numero de unidades.
    expect(enMenu.stock).toBeUndefined()
    expect(enMenu.controlStock).toBeUndefined()

    expect((await pedir(est, [[p, 5]])).estado).toBe(201)
    expect(await stockDe(p)).toBe(0)
    const otra = await llamar('GET', '/soda/productos', { como: est })
    expect(otra.cuerpo.productos[0].estado).toBe('agotado')
    expect(otra.cuerpo.productos[0].disponible).toBe(false)
  })

  it('suma el mismo producto repetido con notas distintas', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearProducto({ controlStock: true, stock: 4 })
    const r = await pedir(est, [
      [p, 2, 'sin cebolla'],
      [p, 3, 'con salsa'],
    ])
    expect(r.estado).toBe(400)
    expect(r.cuerpo.mensaje).toContain('No quedan suficientes unidades')
    expect(await stockDe(p)).toBe(4)
  })

  it('si no alcanza, rechaza el pedido sin decir cuantas quedan', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearProducto({ controlStock: true, stock: 2 })
    const r = await pedir(est, [[p, 3]])
    expect(r.estado).toBe(400)
    expect(r.cuerpo.mensaje).toBe(
      'No quedan suficientes unidades de Empanada. Quitalo del carrito o pedí menos.'
    )
    expect(r.cuerpo.mensaje).not.toMatch(/\d/)
    expect(await stockDe(p)).toBe(2)
    expect(col('pedidos').docs).toHaveLength(0)
  })

  it('un producto agotado no se puede pedir', async () => {
    const est = await crearUsuario('estudiante')
    const conStock = await crearProducto({ controlStock: true, stock: 0 })
    const aMano = await crearProducto({ nombre: 'Café', estado: 'agotado' })
    const viejo = await crearProducto({ nombre: 'Té', disponible: false })
    for (const p of [conStock, aMano, viejo]) {
      const r = await pedir(est, [[p, 1]])
      expect(r.estado).toBe(400)
      expect(r.cuerpo.mensaje).toContain('se acaba de agotar')
    }
    expect(col('pedidos').docs).toHaveLength(0)
  })

  it('pocas unidades a mano se puede pedir y no toca stock', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearProducto({ estado: 'pocas' })
    expect((await pedir(est, [[p, 2]])).estado).toBe(201)
    expect(await stockDe(p)).toBeUndefined()
  })

  it('dos pedidos por la ultima unidad: solo uno se crea', async () => {
    const a = await crearUsuario('estudiante')
    const b = await crearUsuario('estudiante')
    const p = await crearProducto({ controlStock: true, stock: 1 })
    const respuestas = await Promise.all([
      pedir(a, [[p, 1]]),
      pedir(b, [[p, 1]]),
    ])
    const estados = respuestas.map((r) => r.estado).sort()
    expect(estados).toEqual([201, 400])
    expect(await stockDe(p)).toBe(0)
    expect(col('pedidos').docs).toHaveLength(1)
    const rechazado = respuestas.find((r) => r.estado === 400)
    expect(rechazado.cuerpo.mensaje).toContain('se acaba de agotar')
  })

  it('muchos pedidos a la vez nunca venden de mas', async () => {
    const p = await crearProducto({ controlStock: true, stock: 5 })
    const personas = await Promise.all(
      Array.from({ length: 12 }, () => crearUsuario('estudiante'))
    )
    const respuestas = await Promise.all(
      personas.map((u) => pedir(u, [[p, 1]]))
    )
    expect(respuestas.filter((r) => r.estado === 201)).toHaveLength(5)
    expect(await stockDe(p)).toBe(0)
  })

  it('si un producto no alcanza, devuelve lo que ya habia descontado', async () => {
    const est = await crearUsuario('estudiante')
    const a = await crearProducto({ controlStock: true, stock: 10 })
    const b = await crearProducto({
      nombre: 'Batido',
      controlStock: true,
      stock: 1,
    })
    const r = await pedir(est, [
      [a, 4],
      [b, 2],
    ])
    expect(r.estado).toBe(400)
    expect(await stockDe(a)).toBe(10)
    expect(await stockDe(b)).toBe(1)
    expect(col('pedidos').docs).toHaveLength(0)
  })

  it('las unidades no vuelven al stock aunque el pedido cambie de estado', async () => {
    const soda = await crearUsuario('soda')
    const est = await crearUsuario('estudiante')
    const p = await crearProducto({ controlStock: true, stock: 3 })
    const r = await pedir(est, [[p, 2]])
    const codigo = r.cuerpo.pedido.codigo
    for (const estado of ['preparando', 'listo', 'entregado']) {
      await llamar('PATCH', `/pedidos/${codigo}/estado`, {
        como: soda,
        cuerpo: { estado },
      })
    }
    expect(await stockDe(p)).toBe(1)
  })
})

describe('API: stock desde el panel', () => {
  it('activar el control empieza en 0 y agotado', async () => {
    const soda = await crearUsuario('soda')
    const p = await crearProducto({ estado: 'disponible' })
    const r = await llamar('PATCH', `/soda/productos/${p._id}`, {
      como: soda,
      cuerpo: { controlStock: true },
    })
    expect(r.estado).toBe(200)
    expect(r.cuerpo.producto).toMatchObject({
      controlStock: true,
      stock: 0,
      estado: 'agotado',
      umbralPocas: UMBRAL_POCAS,
    })
  })

  it('reponer y quitar son atomicos y no dejan el stock negativo', async () => {
    const soda = await crearUsuario('soda')
    const p = await crearProducto({ controlStock: true, stock: 0 })
    const cambiar = (cambio) =>
      llamar('POST', `/soda/productos/${p._id}/stock`, {
        como: soda,
        cuerpo: { cambio },
      })
    const mas = await cambiar(10)
    expect(mas.estado).toBe(200)
    expect(mas.cuerpo.producto.stock).toBe(10)
    expect(mas.cuerpo.producto.estado).toBe('disponible')
    expect((await cambiar(-6)).cuerpo.producto.estado).toBe('pocas')
    const demasiado = await cambiar(-5)
    expect(demasiado.estado).toBe(400)
    expect(demasiado.cuerpo.mensaje).toContain('quedan 4')
    expect(await stockDe(p)).toBe(4)
    expect((await cambiar(0)).estado).toBe(400)
    expect((await cambiar(2.5)).estado).toBe(400)
  })

  it('con stock activo no se cambia el estado a mano', async () => {
    const soda = await crearUsuario('soda')
    const p = await crearProducto({ controlStock: true, stock: 20 })
    const r = await llamar('PATCH', `/soda/productos/${p._id}`, {
      como: soda,
      cuerpo: { estado: 'agotado' },
    })
    expect(r.estado).toBe(400)
    expect(estadoDe(await col('productos').findOne({ _id: p._id }))).toBe(
      'disponible'
    )
  })

  it('apagar el control deja el estado que tenia, a mano', async () => {
    const soda = await crearUsuario('soda')
    const p = await crearProducto({ controlStock: true, stock: 2 })
    const r = await llamar('PATCH', `/soda/productos/${p._id}`, {
      como: soda,
      cuerpo: { controlStock: false },
    })
    expect(r.cuerpo.producto).toMatchObject({
      controlStock: false,
      estado: 'pocas',
      stock: null,
    })
    const cambio = await llamar('PATCH', `/soda/productos/${p._id}`, {
      como: soda,
      cuerpo: { estado: 'disponible' },
    })
    expect(cambio.cuerpo.producto.estado).toBe('disponible')
  })

  it('el umbral se edita por producto', async () => {
    const soda = await crearUsuario('soda')
    const p = await crearProducto({ controlStock: true, stock: 8 })
    const r = await llamar('PATCH', `/soda/productos/${p._id}`, {
      como: soda,
      cuerpo: { umbralPocas: 10 },
    })
    expect(r.cuerpo.producto.estado).toBe('pocas')
  })

  it('sin permiso no se toca el stock', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearProducto({ controlStock: true, stock: 1 })
    const r = await llamar('POST', `/soda/productos/${p._id}/stock`, {
      como: est,
      cuerpo: { cambio: 50 },
    })
    expect(r.estado).toBe(403)
    expect(await stockDe(p)).toBe(1)
  })

  it('el personal ve las unidades; los productos viejos quedan sin stock', async () => {
    const soda = await crearUsuario('soda')
    await crearProducto({ disponible: false })
    const r = await llamar('GET', '/soda/productos?todos=1', { como: soda })
    expect(r.cuerpo.productos[0]).toMatchObject({
      estado: 'agotado',
      controlStock: false,
      stock: null,
    })
  })
})
