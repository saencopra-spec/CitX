import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
import { margenGracia } from '../api/_lib/sanciones.js'
import { puede } from '../compartido/permisos.js'
import { partesCR, sumarDias } from '../compartido/hora.js'
import {
  cambioDeEstadoPermitido,
  siguienteEstado,
} from '../compartido/pedidos.js'
import {
  debeMarcarseNoRecogido,
  limiteRetiro,
  calcularFin,
  sancionActiva,
  esPermanente,
  estadoSancion,
  mensajeBloqueo,
  FIN_PERMANENTE,
} from '../compartido/sanciones.js'

process.env.JWT_SECRET = 'clave-de-pruebas-con-mas-de-32-caracteres-123'
process.env.CRON_SECRET = 'secreto-del-cron'

/** Crea un Date a partir de una hora de Costa Rica (UTC-6). */
const cr = (texto) => new Date(`${texto}:00-06:00`)
const DIA = 24 * 60 * 60 * 1000

const col = (nombre) => falsa.actual.coleccion(nombre)

async function llamar(metodo, ruta, { como, cuerpo, headers = {} } = {}) {
  const req = {
    method: metodo,
    url: `/api${ruta}`,
    headers: { host: 'localhost', ...headers },
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

let siguienteCodigo = 0
async function crearPedido(usuario, { estado = 'listo', fecha, clave } = {}) {
  const p = {
    codigo: `P${String(++siguienteCodigo).padStart(4, '0')}`,
    usuarioId: String(usuario._id),
    usuarioNombre: usuario.nombre,
    usuarioSeccion: usuario.seccion,
    items: [{ productoId: 'x', nombre: 'Empanada', precio: 800, cantidad: 1 }],
    total: 800,
    franja: {
      fecha,
      clave: clave ?? 'recreo-manana',
      nombre: 'Recreo de la mañana',
      inicio: '09:00',
    },
    pago: { metodo: 'efectivo', estado: 'pendiente' },
    estado,
    historial: [{ estado, en: new Date() }],
    calificados: [],
    creadoEn: new Date(),
  }
  await col('pedidos').insertOne(p)
  return p
}

async function crearSancion(usuario, datos = {}) {
  const s = {
    tipo: 'sancion',
    usuarioId: String(usuario._id),
    usuarioNombre: usuario.nombre,
    razon: 'No recogió el pedido',
    duracion: '1d',
    hasta: new Date(Date.now() + DIA),
    creadaPor: { id: 'admin', nombre: 'Admin' },
    creadaEn: new Date(),
    levantada: null,
    finAvisado: false,
    ...datos,
  }
  await col('sanciones').insertOne(s)
  return s
}

const notificacionesDe = (u) =>
  col('notificaciones').docs.filter((n) => n.usuarioId === String(u._id))

const HOY = partesCR().iso
const PASADO = sumarDias(HOY, -3)
const FUTURO = sumarDias(HOY, 3)

beforeEach(() => falsa.actual.vaciar())

// ---------------------------------------------------------------------------

describe('Reglas de no recogido', () => {
  const pedido = (estado) => ({
    estado,
    franja: { fecha: '2026-10-21', clave: 'recreo-manana' },
  })

  it('el limite es el fin de la franja mas 15 minutos de gracia', () => {
    // El recreo de la mañana termina a las 9:15.
    expect(limiteRetiro(pedido('listo'))).toEqual(cr('2026-10-21T09:30'))
  })

  it('marca un pedido listo solo cuando ya paso el margen', () => {
    expect(
      debeMarcarseNoRecogido(pedido('listo'), cr('2026-10-21T09:29'))
    ).toBe(false)
    expect(
      debeMarcarseNoRecogido(pedido('listo'), cr('2026-10-21T09:31'))
    ).toBe(true)
  })

  it('no toca pedidos que no estan listos', () => {
    const tarde = cr('2026-10-21T15:00')
    for (const estado of [
      'recibido',
      'preparacion',
      'entregado',
      'no_recogido',
    ]) {
      expect(debeMarcarseNoRecogido(pedido(estado), tarde)).toBe(false)
    }
  })

  it('el margen se puede cambiar', () => {
    expect(
      debeMarcarseNoRecogido(pedido('listo'), cr('2026-10-21T09:16'), 0)
    ).toBe(true)
  })

  describe('margen desde la variable de entorno', () => {
    afterEach(() => {
      delete process.env.MARGEN_NO_RECOGIDO_MIN
    })

    it('usa MARGEN_NO_RECOGIDO_MIN y si no, 15', () => {
      expect(margenGracia()).toBe(15)
      process.env.MARGEN_NO_RECOGIDO_MIN = '30'
      expect(margenGracia()).toBe(30)
      process.env.MARGEN_NO_RECOGIDO_MIN = 'abc'
      expect(margenGracia()).toBe(15)
    })
  })

  it('la soda todavia puede entregar un no recogido, y nada mas', () => {
    expect(siguienteEstado('no_recogido')).toBe('entregado')
    expect(cambioDeEstadoPermitido('no_recogido', 'entregado')).toBe(true)
    expect(cambioDeEstadoPermitido('no_recogido', 'listo')).toBe(false)
    expect(cambioDeEstadoPermitido('listo', 'no_recogido')).toBe(false)
  })
})

describe('Duracion y estado de las sanciones', () => {
  const ahora = cr('2026-10-21T10:00')

  it('calcula el fin de cada duracion', () => {
    expect(calcularFin('1d', { ahora })).toEqual(cr('2026-10-22T10:00'))
    expect(calcularFin('3d', { ahora })).toEqual(cr('2026-10-24T10:00'))
    expect(calcularFin('1s', { ahora })).toEqual(cr('2026-10-28T10:00'))
    expect(
      calcularFin('personalizada', { ahora, hasta: '2026-10-23T15:30' })
    ).toEqual(cr('2026-10-23T15:30'))
  })

  it('rechaza una fecha personalizada que ya paso o mal escrita', () => {
    expect(
      calcularFin('personalizada', { ahora, hasta: '2026-10-20T15:30' })
    ).toBeNull()
    expect(calcularFin('personalizada', { ahora, hasta: 'mañana' })).toBeNull()
    expect(calcularFin('2 años', { ahora })).toBeNull()
  })

  it('la permanente usa el año 9999, como en Lyfter', () => {
    const fin = calcularFin('permanente', { ahora })
    expect(fin).toEqual(FIN_PERMANENTE)
    expect(esPermanente(fin)).toBe(true)
    expect(esPermanente(cr('2027-01-01T00:00'))).toBe(false)
  })

  it('una sancion vencida o levantada ya no bloquea', () => {
    const vencida = { tipo: 'sancion', hasta: cr('2026-10-21T09:00') }
    const levantada = {
      tipo: 'sancion',
      hasta: cr('2026-10-30T09:00'),
      levantada: { motivo: 'admin' },
    }
    const alerta = { tipo: 'alerta' }
    expect(sancionActiva([vencida, levantada, alerta], ahora)).toBeNull()
    expect(estadoSancion(vencida, ahora)).toBe('cumplida')
    expect(estadoSancion(levantada, ahora)).toBe('levantada')
    expect(
      estadoSancion({ ...levantada, levantada: { motivo: 'reemplazada' } })
    ).toBe('reemplazada')
  })

  it('la permanente sigue activa', () => {
    const s = { tipo: 'sancion', hasta: FIN_PERMANENTE, razon: 'x' }
    expect(sancionActiva([s], ahora)).toBe(s)
    expect(estadoSancion(s, ahora)).toBe('activa')
  })

  it('arma el mensaje de bloqueo', () => {
    expect(
      mensajeBloqueo({ razon: 'Pedido sin retirar', hasta: FIN_PERMANENTE })
    ).toBe(
      'No podés hacer pedidos por ahora — Razón: Pedido sin retirar — Sanción permanente, hablá con administración'
    )
    expect(
      mensajeBloqueo({
        razon: 'Pedido sin retirar',
        hasta: cr('2026-10-23T15:30'),
      })
    ).toMatch(/Podrás volver a pedir: viernes, 23 de octubre, 3:30 p\. m\.$/)
  })
})

describe('Permisos de sanciones', () => {
  it('solo el rol admin puede alertar, sancionar o levantar', () => {
    expect(puede('admin', 'sanciones.gestionar')).toBe(true)
    for (const rol of [
      'estudiante',
      'profesor',
      'administrativo',
      'soda',
      'objetos',
    ]) {
      expect(puede(rol, 'sanciones.gestionar')).toBe(false)
    }
  })

  it('no se le puede asignar a alguien del personal', () => {
    const soda = { rol: 'soda', permisos: ['sanciones.gestionar'] }
    expect(puede(soda, 'sanciones.gestionar')).toBe(false)
  })
})

// ---------------------------------------------------------------------------

describe('API: marcado automatico de no recogido', () => {
  it('al consultar pedidos pasa a no recogido lo listo que ya vencio', async () => {
    const est = await crearUsuario('estudiante')
    const viejo = await crearPedido(est, { fecha: PASADO })
    const pendiente = await crearPedido(est, { fecha: FUTURO })
    const enCocina = await crearPedido(est, {
      fecha: PASADO,
      estado: 'preparacion',
    })

    const r = await llamar('GET', '/pedidos/mios', { como: est })
    expect(r.estado).toBe(200)
    const porCodigo = Object.fromEntries(
      r.cuerpo.pedidos.map((p) => [p.codigo, p])
    )
    expect(porCodigo[viejo.codigo].estado).toBe('no_recogido')
    expect(porCodigo[viejo.codigo].historial.at(-1).estado).toBe('no_recogido')
    expect(porCodigo[pendiente.codigo].estado).toBe('listo')
    expect(porCodigo[enCocina.codigo].estado).toBe('preparacion')
  })

  it('marcarlo no sanciona ni notifica', async () => {
    const est = await crearUsuario('estudiante')
    await crearPedido(est, { fecha: PASADO })
    await llamar('GET', '/pedidos/mios', { como: est })
    expect(notificacionesDe(est)).toHaveLength(0)
    expect(col('sanciones').docs).toHaveLength(0)
    const r = await llamar('GET', '/sanciones/mi-estado', { como: est })
    expect(r.cuerpo.sancion).toBeNull()
  })

  it('tambien revisa al crear un pedido', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: PASADO })
    await llamar('POST', '/pedidos', { como: est, cuerpo: {} })
    expect((await col('pedidos').findOne({ codigo: p.codigo })).estado).toBe(
      'no_recogido'
    )
  })

  it('el cron diario revisa y exige su secreto', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: PASADO })
    expect((await llamar('GET', '/cron/sanciones')).estado).toBe(401)
    const r = await llamar('GET', '/cron/sanciones', {
      headers: { authorization: 'Bearer secreto-del-cron' },
    })
    expect(r.estado).toBe(200)
    expect(r.cuerpo.noRecogidos).toBe(1)
    expect((await col('pedidos').findOne({ codigo: p.codigo })).estado).toBe(
      'no_recogido'
    )
  })

  it('la soda puede entregarlo tarde y sale de la lista del admin', async () => {
    const admin = await crearUsuario('admin')
    const soda = await crearUsuario('soda')
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: PASADO })

    let lista = await llamar('GET', '/sanciones/no-recogidos', { como: admin })
    expect(lista.cuerpo.pedidos.map((x) => x.codigo)).toEqual([p.codigo])

    const r = await llamar('PATCH', `/pedidos/${p.codigo}/estado`, {
      como: soda,
      cuerpo: { estado: 'entregado' },
    })
    expect(r.estado).toBe(200)
    expect(r.cuerpo.pedido.estado).toBe('entregado')

    lista = await llamar('GET', '/sanciones/no-recogidos', { como: admin })
    expect(lista.cuerpo.pedidos).toHaveLength(0)
  })
})

describe('API: alertas', () => {
  it('alertar notifica con el mensaje, cierra el caso y no bloquea', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: PASADO })
    await llamar('GET', '/sanciones/no-recogidos', { como: admin })

    const r = await llamar(
      'POST',
      `/sanciones/no-recogidos/${p.codigo}/alertar`,
      { como: admin, cuerpo: { mensaje: 'Avisá si no podés venir.' } }
    )
    expect(r.estado).toBe(201)

    const [aviso] = notificacionesDe(est)
    expect(aviso.tipo).toBe('alerta')
    expect(aviso.titulo).toContain(p.codigo)
    expect(aviso.cuerpo).toContain('Avisá si no podés venir.')

    const lista = await llamar('GET', '/sanciones/no-recogidos', {
      como: admin,
    })
    expect(lista.cuerpo.pedidos).toHaveLength(0)
    const estado = await llamar('GET', '/sanciones/mi-estado', { como: est })
    expect(estado.cuerpo.sancion).toBeNull()
  })

  it('la lista cuenta alertas y sanciones previas', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    await crearSancion(est, { tipo: 'alerta', hasta: undefined })
    await crearSancion(est, { hasta: new Date(Date.now() - DIA) })
    await crearPedido(est, { fecha: PASADO })
    const r = await llamar('GET', '/sanciones/no-recogidos', { como: admin })
    expect(r.cuerpo.pedidos[0]).toMatchObject({ alertas: 1, sanciones: 1 })
  })
})

describe('API: bloqueo de pedidos', () => {
  it('rechaza el pedido de alguien con sancion activa, con el mismo mensaje', async () => {
    const est = await crearUsuario('estudiante')
    await crearSancion(est, { razon: 'No recogió dos pedidos' })
    const r = await llamar('POST', '/pedidos', { como: est, cuerpo: {} })
    expect(r.estado).toBe(403)
    expect(r.cuerpo.mensaje).toMatch(
      /^No podés hacer pedidos por ahora — Razón: No recogió dos pedidos — Podrás volver a pedir: /
    )
    const estado = await llamar('GET', '/sanciones/mi-estado', { como: est })
    expect(estado.cuerpo.sancion.mensaje).toBe(r.cuerpo.mensaje)
  })

  it('su pedido activo de antes se mantiene', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: FUTURO })
    await crearSancion(est)
    const r = await llamar('GET', `/pedidos/${p.codigo}`, { como: est })
    expect(r.estado).toBe(200)
    expect(r.cuerpo.pedido.estado).toBe('listo')
  })

  it('una sancion vencida ya no bloquea y avisa una sola vez', async () => {
    const est = await crearUsuario('estudiante')
    await crearSancion(est, { hasta: new Date(Date.now() - 60 * 1000) })

    const r = await llamar('POST', '/pedidos', { como: est, cuerpo: {} })
    // Pasa el bloqueo y llega a la validacion del carrito.
    expect(r.estado).toBe(400)

    await llamar('GET', '/sanciones/mi-estado', { como: est })
    const estado = await llamar('GET', '/sanciones/mi-estado', { como: est })
    expect(estado.cuerpo.sancion).toBeNull()
    const avisos = notificacionesDe(est).filter(
      (n) => n.titulo === 'Ya podés volver a pedir'
    )
    expect(avisos).toHaveLength(1)
  })

  it('una sancion permanente bloquea y no tiene fecha de vuelta', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    const r = await llamar('POST', '/sanciones', {
      como: admin,
      cuerpo: {
        usuarioId: String(est._id),
        razon: 'Pedidos falsos',
        duracion: 'permanente',
      },
    })
    expect(r.estado).toBe(201)
    expect(r.cuerpo.sancion.permanente).toBe(true)
    expect(new Date(r.cuerpo.sancion.hasta).getUTCFullYear()).toBe(9999)

    const pedido = await llamar('POST', '/pedidos', { como: est, cuerpo: {} })
    expect(pedido.estado).toBe(403)
    expect(pedido.cuerpo.mensaje).toContain(
      'Sanción permanente, hablá con administración'
    )
    const [aviso] = notificacionesDe(est)
    expect(aviso.tipo).toBe('sancion')
    expect(aviso.cuerpo).toContain('Pedidos falsos')
  })
})

describe('API: panel de sanciones', () => {
  it('una sancion nueva reemplaza a la activa y la deja en el historial', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    const vieja = await crearSancion(est)
    const r = await llamar('POST', '/sanciones', {
      como: admin,
      cuerpo: {
        usuarioId: String(est._id),
        razon: 'Otra vez sin retirar',
        duracion: '1s',
      },
    })
    expect(r.estado).toBe(201)

    const h = await llamar('GET', `/sanciones/usuario/${est._id}`, {
      como: admin,
    })
    const estados = Object.fromEntries(
      h.cuerpo.historial.map((s) => [s.id, s.estado])
    )
    expect(estados[String(vieja._id)]).toBe('reemplazada')
    expect(estados[r.cuerpo.sancion.id]).toBe('activa')
    const nueva = h.cuerpo.historial.find((s) => s.id === r.cuerpo.sancion.id)
    expect(nueva.creadaPor.nombre).toBe(admin.nombre)
    expect(nueva.razon).toBe('Otra vez sin retirar')
  })

  it('sancionar desde un no recogido cierra el caso', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: PASADO })
    await llamar('GET', '/sanciones/no-recogidos', { como: admin })
    const r = await llamar('POST', '/sanciones', {
      como: admin,
      cuerpo: {
        usuarioId: String(est._id),
        razon: 'No recogió',
        duracion: '3d',
        pedidoCodigo: p.codigo,
      },
    })
    expect(r.estado).toBe(201)
    expect(r.cuerpo.sancion.pedidoCodigo).toBe(p.codigo)
    const lista = await llamar('GET', '/sanciones/no-recogidos', {
      como: admin,
    })
    expect(lista.cuerpo.pedidos).toHaveLength(0)
  })

  it('pide razon y una fecha personalizada valida', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    const base = { usuarioId: String(est._id), razon: 'Motivo' }
    const sinRazon = await llamar('POST', '/sanciones', {
      como: admin,
      cuerpo: { ...base, razon: '  ', duracion: '1d' },
    })
    expect(sinRazon.estado).toBe(400)
    expect(sinRazon.cuerpo.campos.razon).toBeTruthy()
    const pasada = await llamar('POST', '/sanciones', {
      como: admin,
      cuerpo: { ...base, duracion: 'personalizada', hasta: '2020-01-01T10:00' },
    })
    expect(pasada.estado).toBe(400)
    expect(pasada.cuerpo.campos.hasta).toBeTruthy()
  })

  it('levantar antes de tiempo desbloquea y avisa', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    const s = await crearSancion(est)
    const r = await llamar('POST', `/sanciones/${s._id}/levantar`, {
      como: admin,
    })
    expect(r.estado).toBe(200)
    expect(r.cuerpo.sancion.estado).toBe('levantada')
    const estado = await llamar('GET', '/sanciones/mi-estado', { como: est })
    expect(estado.cuerpo.sancion).toBeNull()
    expect(notificacionesDe(est).map((n) => n.titulo)).toContain(
      'Ya podés volver a pedir'
    )
  })

  it('cada persona ve su historial, sin quien la puso', async () => {
    const est = await crearUsuario('estudiante')
    await crearSancion(est, { tipo: 'alerta', hasta: undefined })
    await crearSancion(est)
    const r = await llamar('GET', '/sanciones/mi-historial', { como: est })
    expect(r.cuerpo.historial).toHaveLength(2)
    expect(r.cuerpo.historial[0].creadaPor).toBeUndefined()
  })
})

describe('API: permisos', () => {
  it('nadie que no sea admin puede alertar, sancionar o levantar', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: PASADO, estado: 'no_recogido' })
    const s = await crearSancion(est)
    const personal = [
      est,
      await crearUsuario('soda'),
      await crearUsuario('profesor'),
      // Aunque le pongan el permiso a mano, no es del rol admin.
      await crearUsuario('administrativo', {
        permisos: ['sanciones.gestionar'],
      }),
    ]
    const intentos = [
      ['GET', '/sanciones/no-recogidos'],
      ['POST', `/sanciones/no-recogidos/${p.codigo}/alertar`],
      ['POST', `/sanciones/no-recogidos/${p.codigo}/descartar`],
      ['GET', '/sanciones/usuarios'],
      ['GET', `/sanciones/usuario/${est._id}`],
      ['POST', '/sanciones'],
      ['POST', `/sanciones/${s._id}/levantar`],
    ]
    for (const como of personal) {
      for (const [metodo, ruta] of intentos) {
        const r = await llamar(metodo, ruta, {
          como,
          cuerpo: {
            usuarioId: String(est._id),
            razon: 'x',
            duracion: 'permanente',
          },
        })
        expect(r.estado, `${como.rol} ${metodo} ${ruta}`).toBe(403)
      }
    }
    // Nada cambio.
    expect(col('sanciones').docs).toHaveLength(1)
    expect(notificacionesDe(est)).toHaveLength(0)
  })

  it('sin sesion responde 401', async () => {
    const r = await llamar('POST', '/sanciones', { cuerpo: {} })
    expect(r.estado).toBe(401)
  })

  it('un admin no se puede sancionar a si mismo', async () => {
    const admin = await crearUsuario('admin')
    const r = await llamar('POST', '/sanciones', {
      como: admin,
      cuerpo: { usuarioId: String(admin._id), razon: 'Prueba', duracion: '1d' },
    })
    expect(r.estado).toBe(400)
  })
})
