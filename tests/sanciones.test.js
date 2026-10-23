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
import { puede, PERMISOS_POR_ROL } from '../compartido/permisos.js'
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
  it('por defecto solo el rol admin puede alertar, sancionar o levantar', () => {
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

  it('se le puede asignar a alguien del personal', () => {
    const soda = { rol: 'soda', permisos: ['sanciones.gestionar'] }
    expect(puede(soda, 'sanciones.gestionar')).toBe(true)
  })

  it('no viene con el rol de la soda', () => {
    expect(PERMISOS_POR_ROL.soda).not.toContain('sanciones.gestionar')
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

    const h = await llamar('GET', '/sanciones/historial?tipo=sanciones', {
      como: admin,
    })
    const estados = Object.fromEntries(
      h.cuerpo.registros.map((s) => [s.id, s.estado])
    )
    expect(estados[String(vieja._id)]).toBe('reemplazada')
    expect(estados[r.cuerpo.sancion.id]).toBe('activa')
    const nueva = h.cuerpo.registros.find((s) => s.id === r.cuerpo.sancion.id)
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
  it('sin el permiso nadie puede alertar, sancionar o levantar', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: PASADO, estado: 'no_recogido' })
    const s = await crearSancion(est)
    const personal = [
      est,
      await crearUsuario('soda'),
      await crearUsuario('profesor'),
      // Permisos ajustados a mano, pero sin el de sanciones.
      await crearUsuario('administrativo', {
        permisos: ['anuncios.publicar', 'objetos.gestionar'],
      }),
    ]
    const intentos = [
      ['GET', '/sanciones/no-recogidos'],
      ['POST', `/sanciones/no-recogidos/${p.codigo}/alertar`],
      ['POST', `/sanciones/no-recogidos/${p.codigo}/descartar`],
      ['GET', '/sanciones/usuarios'],
      ['GET', '/sanciones/historial'],
      ['POST', '/sanciones/alertas'],
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

  it('alguien del personal con el permiso asignado lo usa sin ser admin', async () => {
    const est = await crearUsuario('estudiante')
    const p = await crearPedido(est, { fecha: PASADO, estado: 'no_recogido' })
    const soda = await crearUsuario('soda', {
      permisos: ['pedidos.gestionar', 'sanciones.gestionar'],
    })
    const lista = await llamar('GET', '/sanciones/no-recogidos', { como: soda })
    expect(lista.estado).toBe(200)
    expect(lista.cuerpo.pedidos.map((x) => x.codigo)).toContain(p.codigo)
    const r = await llamar('POST', '/sanciones', {
      como: soda,
      cuerpo: {
        usuarioId: String(est._id),
        razon: 'No recogió',
        duracion: '1d',
        pedidoCodigo: p.codigo,
      },
    })
    expect(r.estado).toBe(201)
    const levantar = await llamar(
      'POST',
      `/sanciones/${r.cuerpo.sancion.id}/levantar`,
      { como: soda }
    )
    expect(levantar.estado).toBe(200)
    // Una cuenta de la soda con los permisos normales sigue sin poder.
    const normal = await crearUsuario('soda')
    const no = await llamar('GET', '/sanciones/historial', { como: normal })
    expect(no.estado).toBe(403)
  })
})

// ---------------------------------------------------------------------------

describe('API: buscador, alertas sin pedido e historial', () => {
  it('el buscador muestra todas las cuentas de a 20, con el total', async () => {
    const admin = await crearUsuario('admin', { nombre: 'Zulema Admin' })
    for (let i = 0; i < 23; i++) {
      await crearUsuario('estudiante', {
        nombre: `Estudiante ${String(i).padStart(2, '0')}`,
      })
    }
    await crearUsuario('soda', { nombre: 'Soda Armonía' })
    const p1 = await llamar('GET', '/sanciones/usuarios', { como: admin })
    expect(p1.estado).toBe(200)
    expect(p1.cuerpo.total).toBe(25)
    expect(p1.cuerpo.porPagina).toBe(20)
    expect(p1.cuerpo.usuarios).toHaveLength(20)
    const p2 = await llamar('GET', '/sanciones/usuarios?pagina=2', {
      como: admin,
    })
    expect(p2.cuerpo.usuarios).toHaveLength(5)
    const nombres = [...p1.cuerpo.usuarios, ...p2.cuerpo.usuarios].map(
      (u) => u.nombre
    )
    expect(new Set(nombres).size).toBe(25)
    expect(nombres).toContain('Soda Armonía')
    // La busqueda recorre toda la base, no solo la pagina que se ve.
    const b = await llamar('GET', '/sanciones/usuarios?buscar=22', {
      como: admin,
    })
    expect(b.cuerpo.total).toBe(1)
    expect(b.cuerpo.usuarios[0].nombre).toBe('Estudiante 22')
  })

  it('alertar sin pedido guarda quien y cuando, avisa y no bloquea', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    const r = await llamar('POST', '/sanciones/alertas', {
      como: admin,
      cuerpo: { usuarioId: String(est._id), razon: 'Hizo fila doble' },
    })
    expect(r.estado).toBe(201)
    expect(r.cuerpo.alerta.tipo).toBe('alerta')
    expect(r.cuerpo.alerta.pedidoCodigo).toBeNull()
    expect(r.cuerpo.alerta.creadaPor.nombre).toBe(admin.nombre)
    expect(r.cuerpo.alerta.creadaEn).toBeTruthy()
    expect(notificacionesDe(est)[0].cuerpo).toContain('Hizo fila doble')
    const estado = await llamar('GET', '/sanciones/mi-estado', { como: est })
    expect(estado.cuerpo.sancion).toBeNull()

    const sinRazon = await llamar('POST', '/sanciones/alertas', {
      como: admin,
      cuerpo: { usuarioId: String(est._id), razon: ' ' },
    })
    expect(sinRazon.estado).toBe(400)
    const aSiMismo = await llamar('POST', '/sanciones/alertas', {
      como: admin,
      cuerpo: { usuarioId: String(admin._id), razon: 'Prueba' },
    })
    expect(aSiMismo.estado).toBe(400)
  })

  it('el historial junta alertas, sanciones y descartes con sus filtros', async () => {
    const admin = await crearUsuario('admin', { nombre: 'Ana Admin' })
    const est = await crearUsuario('estudiante', { nombre: 'Beto' })
    const p1 = await crearPedido(est, { fecha: PASADO, estado: 'no_recogido' })
    const p2 = await crearPedido(est, { fecha: PASADO, estado: 'no_recogido' })
    await crearSancion(est, { creadaEn: new Date(Date.now() - DIA) })
    await crearSancion(est, {
      hasta: new Date(Date.now() - 1000),
      creadaEn: new Date(Date.now() - 2 * DIA),
    })
    await llamar('POST', `/sanciones/no-recogidos/${p1.codigo}/alertar`, {
      como: admin,
    })
    await new Promise((listo) => setTimeout(listo, 5))
    await llamar('POST', `/sanciones/no-recogidos/${p2.codigo}/descartar`, {
      como: admin,
    })

    const ver = (tipo) =>
      llamar('GET', `/sanciones/historial?tipo=${tipo}`, { como: admin })

    const todos = await ver('todos')
    expect(todos.cuerpo.total).toBe(4)
    expect(todos.cuerpo.registros.map((r) => r.tipo)).toEqual([
      'descarte',
      'alerta',
      'sancion',
      'sancion',
    ])
    const descarte = todos.cuerpo.registros[0]
    expect(descarte.pedidoCodigo).toBe(p2.codigo)
    expect(descarte.usuarioNombre).toBe('Beto')
    expect(descarte.creadaPor.nombre).toBe('Ana Admin')
    expect(descarte.creadaEn).toBeTruthy()

    expect((await ver('alertas')).cuerpo.total).toBe(1)
    expect((await ver('sanciones')).cuerpo.total).toBe(2)
    expect((await ver('descartados')).cuerpo.total).toBe(1)
    const activas = await ver('activas')
    expect(activas.cuerpo.total).toBe(1)
    expect(activas.cuerpo.registros[0].estado).toBe('activa')
  })

  it('el historial se pagina de a 20 mezclando las dos colecciones', async () => {
    const admin = await crearUsuario('admin')
    const est = await crearUsuario('estudiante')
    const minuto = 60 * 1000
    for (let i = 0; i < 15; i++) {
      await crearSancion(est, {
        tipo: 'alerta',
        hasta: undefined,
        creadaEn: new Date(Date.now() - (2 * i + 1) * minuto),
      })
      const p = await crearPedido(est, { fecha: PASADO, estado: 'no_recogido' })
      // Descartes intercalados en el tiempo con las alertas.
      await col('pedidos').updateOne(
        { codigo: p.codigo },
        {
          $set: {
            caso: {
              resolucion: 'descartado',
              por: { id: String(admin._id), nombre: admin.nombre },
              en: new Date(Date.now() - 2 * i * minuto),
            },
          },
        }
      )
    }
    const p1 = await llamar('GET', '/sanciones/historial', { como: admin })
    const p2 = await llamar('GET', '/sanciones/historial?pagina=2', {
      como: admin,
    })
    expect(p1.cuerpo.total).toBe(30)
    expect(p1.cuerpo.registros).toHaveLength(20)
    expect(p2.cuerpo.registros).toHaveLength(10)
    const fechas = [...p1.cuerpo.registros, ...p2.cuerpo.registros].map((r) =>
      new Date(r.creadaEn).getTime()
    )
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a))
    expect(new Set(fechas).size).toBe(30)
  })
})

describe('API: usuarios', () => {
  it('lista las cuentas de a 20 con el total de coincidencias', async () => {
    const admin = await crearUsuario('admin')
    for (let i = 0; i < 21; i++) await crearUsuario('profesor')
    const p1 = await llamar('GET', '/usuarios', { como: admin })
    expect(p1.estado).toBe(200)
    expect(p1.cuerpo.usuarios).toHaveLength(20)
    expect(p1.cuerpo.coincidencias).toBe(22)
    expect(p1.cuerpo.total).toBe(22)
    const p2 = await llamar('GET', '/usuarios?pagina=2', { como: admin })
    expect(p2.cuerpo.usuarios).toHaveLength(2)
    const soloAdmin = await llamar('GET', '/usuarios?rol=admin', {
      como: admin,
    })
    expect(soloAdmin.cuerpo.coincidencias).toBe(1)
    expect(soloAdmin.cuerpo.total).toBe(22)
  })

  it('cambiar solo el nombre responde con la cuenta actualizada', async () => {
    const admin = await crearUsuario('admin')
    const profe = await crearUsuario('profesor')
    const r = await llamar('PATCH', `/usuarios/${profe._id}`, {
      como: admin,
      cuerpo: { nombre: 'Nombre Nuevo' },
    })
    expect(r.estado).toBe(200)
    expect(r.cuerpo.usuario.nombre).toBe('Nombre Nuevo')
  })

  it('acepta sanciones.gestionar como permiso ajustado', async () => {
    const admin = await crearUsuario('admin')
    const soda = await crearUsuario('soda')
    const r = await llamar('PATCH', `/usuarios/${soda._id}`, {
      como: admin,
      cuerpo: { permisos: ['pedidos.gestionar', 'sanciones.gestionar'] },
    })
    expect(r.estado).toBe(200)
    expect(r.cuerpo.usuario.permisos).toContain('sanciones.gestionar')
  })
})
