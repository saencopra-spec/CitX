import { describe, it, expect } from 'vitest'
import { colones, calcularTotal, contarUnidades } from '../compartido/dinero.js'
import {
  pasaLuhn,
  marcaTarjeta,
  validarTarjeta,
  vencimientoValido,
  formatearNumeroTarjeta,
  comprobanteSinpeValido,
  TARJETA_PRUEBA,
} from '../compartido/pagos.js'
import {
  puede,
  permisosDe,
  seccionValida,
  SECCIONES,
} from '../compartido/permisos.js'
import { LUGARES_CIT, CATEGORIAS, LIENZO } from '../compartido/campus.js'
import { generarCodigoInvitacion, huella } from '../api/_lib/invitaciones.js'
import { estadoEnfermeria } from '../compartido/enfermeria.js'
import { partesCR, horaLegible, sumarDias } from '../compartido/hora.js'
import {
  franjasDeRetiro,
  franjaValida,
  bloqueActual,
} from '../compartido/jornada.js'
import {
  cambioDeEstadoPermitido,
  siguienteEstado,
  generarCodigo,
  codigoValido,
  codigoDesdeQR,
  textoQR,
} from '../compartido/pedidos.js'
import { coincide, normalizar } from '../compartido/texto.js'

/** Crea un Date a partir de una hora de Costa Rica (UTC-6). */
const cr = (texto) => new Date(`${texto}:00-06:00`)

describe('Montos y totales', () => {
  it('formatea colones con espacio de miles', () => {
    expect(colones(3300)).toBe('₡3 300')
    expect(colones(600)).toBe('₡600')
    expect(colones(1250000)).toBe('₡1 250 000')
    expect(colones(0)).toBe('₡0')
  })

  it('calcula el total del carrito', () => {
    const items = [
      { precio: 3300, cantidad: 2 },
      { precio: 600, cantidad: 3 },
    ]
    expect(calcularTotal(items)).toBe(8400)
    expect(contarUnidades(items)).toBe(5)
  })

  it('ignora cantidades negativas, decimales raros y datos invalidos', () => {
    expect(calcularTotal([{ precio: 1000, cantidad: -2 }])).toBe(0)
    expect(calcularTotal([{ precio: '1500', cantidad: '2' }])).toBe(3000)
    expect(calcularTotal([{ precio: 1000, cantidad: 1.9 }])).toBe(1000)
    expect(calcularTotal(null)).toBe(0)
    expect(calcularTotal([])).toBe(0)
  })
})

describe('Validacion de tarjeta', () => {
  it('acepta la tarjeta de prueba', () => {
    expect(pasaLuhn(TARJETA_PRUEBA.numero)).toBe(true)
    expect(marcaTarjeta(TARJETA_PRUEBA.numero)).toBe('visa')
  })

  it('rechaza numeros que no pasan Luhn', () => {
    expect(pasaLuhn('4242 4242 4242 4241')).toBe(false)
    expect(pasaLuhn('1234')).toBe(false)
  })

  it('detecta la marca', () => {
    expect(marcaTarjeta('5555 5555 5555 4444')).toBe('mastercard')
    expect(marcaTarjeta('2223 0031 2200 3222')).toBe('mastercard')
    expect(marcaTarjeta('3782 822463 10005')).toBe('amex')
    expect(marcaTarjeta('6011 1111 1111 1117')).toBe(null)
  })

  it('formatea el numero por grupos', () => {
    expect(formatearNumeroTarjeta('4242424242424242')).toBe(
      '4242 4242 4242 4242'
    )
    expect(formatearNumeroTarjeta('378282246310005')).toBe('3782 822463 10005')
  })

  it('valida el vencimiento contra la fecha actual', () => {
    const hoy = cr('2026-10-06T10:00')
    expect(vencimientoValido('10/26', hoy)).toBe(true)
    expect(vencimientoValido('09/26', hoy)).toBe(false)
    expect(vencimientoValido('13/27', hoy)).toBe(false)
    expect(vencimientoValido('1227', hoy)).toBe(false)
  })

  it('devuelve errores por campo', () => {
    const hoy = cr('2026-10-06T10:00')
    expect(
      validarTarjeta(
        {
          numero: TARJETA_PRUEBA.numero,
          titular: 'Ana Prueba',
          vencimiento: '12/30',
          cvv: '123',
        },
        hoy
      )
    ).toEqual({})

    const errores = validarTarjeta(
      {
        numero: '4242 4242 4242 4241',
        titular: '',
        vencimiento: '01/20',
        cvv: '12',
      },
      hoy
    )
    expect(Object.keys(errores).sort()).toEqual(
      ['cvv', 'numero', 'titular', 'vencimiento'].sort()
    )
  })

  it('pide 4 digitos de CVV en American Express', () => {
    const hoy = cr('2026-10-06T10:00')
    const base = {
      numero: '3782 822463 10005',
      titular: 'Ana Prueba',
      vencimiento: '12/30',
    }
    expect(validarTarjeta({ ...base, cvv: '123' }, hoy).cvv).toBeTruthy()
    expect(validarTarjeta({ ...base, cvv: '1234' }, hoy)).toEqual({})
  })

  it('valida el comprobante SINPE', () => {
    expect(comprobanteSinpeValido('20261006123456')).toBe(true)
    expect(comprobanteSinpeValido('123')).toBe(false)
    expect(comprobanteSinpeValido('abc123456')).toBe(false)
  })
})

describe('Permisos por rol', () => {
  it('admin y soda entran al panel; estudiante y profesor no', () => {
    expect(puede('admin', 'panel.entrar')).toBe(true)
    expect(puede('soda', 'panel.entrar')).toBe(true)
    expect(puede('soda', 'pedidos.gestionar')).toBe(true)
    expect(puede('soda', 'reportes.ver')).toBe(true)
    expect(puede('estudiante', 'panel.entrar')).toBe(false)
    expect(puede('profesor', 'panel.entrar')).toBe(false)
    expect(puede('estudiante', 'pedidos.gestionar')).toBe(false)
  })

  it('el personal administrativo entra al panel para anuncios y objetos', () => {
    expect(puede('administrativo', 'panel.entrar')).toBe(true)
    expect(puede('administrativo', 'anuncios.publicar')).toBe(true)
    expect(puede('administrativo', 'objetos.gestionar')).toBe(true)
    expect(puede('administrativo', 'usuarios.gestionar')).toBe(false)
  })

  it('profesores y admin publican eventos; estudiantes y soda no', () => {
    expect(puede('profesor', 'eventos.publicar')).toBe(true)
    expect(puede('admin', 'eventos.publicar')).toBe(true)
    expect(puede('estudiante', 'eventos.publicar')).toBe(false)
    expect(puede('soda', 'eventos.publicar')).toBe(false)
  })

  it('usuarios e invitaciones son solo del administrador', () => {
    expect(puede('admin', 'usuarios.gestionar')).toBe(true)
    for (const rol of ['soda', 'profesor', 'administrativo', 'estudiante']) {
      expect(puede(rol, 'usuarios.gestionar')).toBe(false)
    }
    // Aunque alguien intente darselo en su lista de permisos, no aplica.
    expect(
      puede(
        {
          rol: 'administrativo',
          permisos: ['usuarios.gestionar'],
        },
        'usuarios.gestionar'
      )
    ).toBe(false)
  })

  it('respeta los permisos ajustados de cada persona', () => {
    const secretaria = {
      rol: 'administrativo',
      permisos: ['objetos.gestionar'],
    }
    expect(puede(secretaria, 'objetos.gestionar')).toBe(true)
    expect(puede(secretaria, 'anuncios.publicar')).toBe(false)
    expect(puede(secretaria, 'panel.entrar')).toBe(true)
    const profeDeHorarios = {
      rol: 'profesor',
      permisos: ['eventos.publicar', 'horarios.editar'],
    }
    expect(puede(profeDeHorarios, 'horarios.editar')).toBe(true)
    expect(puede(profeDeHorarios, 'panel.entrar')).toBe(true)
    const sinNada = { rol: 'soda', permisos: [] }
    expect(puede(sinNada, 'pedidos.gestionar')).toBe(false)
    expect(puede(sinNada, 'panel.entrar')).toBe(false)
  })

  it('un estudiante nunca tiene permisos, aunque los traiga en la lista', () => {
    expect(
      permisosDe({ rol: 'estudiante', permisos: ['pedidos.gestionar'] })
    ).toEqual([])
  })

  it('niega acciones desconocidas o roles inventados', () => {
    expect(puede('admin', 'algo.inventado')).toBe(false)
    expect(puede('superusuario', 'panel.entrar')).toBe(false)
    expect(puede(undefined, 'panel.entrar')).toBe(false)
    expect(puede(null, 'pedidos.gestionar')).toBe(false)
  })

  it('las secciones van de 7-1 a 12-6', () => {
    expect(SECCIONES).toHaveLength(36)
    expect(seccionValida('10-1')).toBe(true)
    expect(seccionValida('13-1')).toBe(false)
    expect(seccionValida('Contraseña...')).toBe(false)
  })
})

describe('Codigos de invitacion', () => {
  it('tienen el formato CIT-XXXXX-XXXXX sin letras confusas', () => {
    for (let i = 0; i < 30; i++) {
      const c = generarCodigoInvitacion()
      expect(c).toMatch(/^CIT-[A-Z2-9]{5}-[A-Z2-9]{5}$/)
      expect(c.slice(4)).not.toMatch(/[01IOL]/)
    }
  })

  it('la huella no depende de mayusculas, espacios ni guiones', () => {
    const c = generarCodigoInvitacion()
    expect(huella(c)).toBe(huella(c.toLowerCase().replace(/-/g, ' ')))
    expect(huella(c)).not.toBe(huella(generarCodigoInvitacion()))
    expect(huella(c)).toHaveLength(64)
  })
})

describe('Lugares oficiales del mapa', () => {
  it('estan los 19 de la leyenda del CIT y la enfermeria', () => {
    const numeros = LUGARES_CIT.map((l) => l.numero)
      .filter(Boolean)
      .sort((a, b) => a - b)
    expect(numeros).toEqual(Array.from({ length: 19 }, (_, i) => i + 1))
    expect(LUGARES_CIT.some((l) => l.clave === 'enfermeria')).toBe(true)
  })

  it('cada pin cae dentro del mapa y con categoria conocida', () => {
    for (const l of LUGARES_CIT) {
      expect(l.x).toBeGreaterThanOrEqual(0)
      expect(l.x).toBeLessThanOrEqual(LIENZO.ancho)
      expect(l.y).toBeGreaterThanOrEqual(0)
      expect(l.y).toBeLessThanOrEqual(LIENZO.alto)
      expect(CATEGORIAS[l.categoria]).toBeTruthy()
    }
    expect(new Set(LUGARES_CIT.map((l) => l.clave)).size).toBe(
      LUGARES_CIT.length
    )
  })
})

describe('Enfermeria abierta o cerrada', () => {
  it('abierta un martes a media manana', () => {
    expect(estadoEnfermeria(cr('2026-10-06T10:00')).abierta).toBe(true)
  })

  it('abre justo a las 7:00 y cierra a las 3:30', () => {
    expect(estadoEnfermeria(cr('2026-10-06T06:59')).abierta).toBe(false)
    expect(estadoEnfermeria(cr('2026-10-06T07:00')).abierta).toBe(true)
    expect(estadoEnfermeria(cr('2026-10-06T15:29')).abierta).toBe(true)
    expect(estadoEnfermeria(cr('2026-10-06T15:30')).abierta).toBe(false)
  })

  it('avisa cuando esta por cerrar', () => {
    expect(estadoEnfermeria(cr('2026-10-06T15:10')).mensaje).toContain(
      '20 minutos'
    )
  })

  it('cerrada el fin de semana y el viernes en la tarde dice lunes', () => {
    expect(estadoEnfermeria(cr('2026-10-10T10:00')).abierta).toBe(false)
    expect(estadoEnfermeria(cr('2026-10-09T16:00')).mensaje).toContain(
      'el lunes'
    )
  })

  it('usa la hora de Costa Rica aunque la fecha venga en UTC', () => {
    // 20:00 UTC = 2:00 p. m. en Costa Rica: abierta.
    expect(estadoEnfermeria(new Date('2026-10-06T20:00:00Z')).abierta).toBe(
      true
    )
    // 22:00 UTC = 4:00 p. m. en Costa Rica: cerrada.
    expect(estadoEnfermeria(new Date('2026-10-06T22:00:00Z')).abierta).toBe(
      false
    )
  })
})

describe('Horas y jornada', () => {
  it('descompone la hora en Costa Rica', () => {
    const p = partesCR(new Date('2026-10-09T15:30:00Z'))
    expect(p.iso).toBe('2026-10-09')
    expect(p.hora).toBe(9)
    expect(p.nombreDia).toBe('viernes')
  })

  it('escribe las horas como en Costa Rica', () => {
    expect(horaLegible('07:00')).toBe('7:00 a. m.')
    expect(horaLegible('15:30')).toBe('3:30 p. m.')
    expect(horaLegible('12:00')).toBe('12:00 p. m.')
  })

  it('suma dias cruzando de mes', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01')
  })

  it('ofrece las franjas de retiro que todavia no pasaron', () => {
    const franjas = franjasDeRetiro(cr('2026-10-06T10:00'))
    expect(franjas.map((f) => f.clave)).toEqual(['almuerzo', 'recreo-tarde'])
    expect(franjas.every((f) => f.hoy)).toBe(true)
  })

  it('pasa al siguiente dia lectivo cuando ya no hay franjas', () => {
    const viernesTarde = franjasDeRetiro(cr('2026-10-09T15:00'))
    expect(viernesTarde[0].fecha).toBe('2026-10-12')
    expect(viernesTarde).toHaveLength(3)
  })

  it('valida la franja elegida', () => {
    const ahora = cr('2026-10-06T10:00')
    expect(franjaValida('2026-10-06', 'almuerzo', ahora)).toBe(true)
    expect(franjaValida('2026-10-06', 'recreo-manana', ahora)).toBe(false)
  })

  it('reconoce la leccion en curso', () => {
    expect(bloqueActual(cr('2026-10-06T07:10')).numero).toBe(1)
    expect(bloqueActual(cr('2026-10-06T12:05')).clave).toBe('almuerzo')
    expect(bloqueActual(cr('2026-10-06T16:00'))).toBe(null)
  })
})

describe('Pedidos', () => {
  it('avanza de estado en orden', () => {
    expect(siguienteEstado('recibido')).toBe('preparacion')
    expect(siguienteEstado('entregado')).toBe(null)
    expect(cambioDeEstadoPermitido('recibido', 'preparacion')).toBe(true)
    expect(cambioDeEstadoPermitido('recibido', 'entregado')).toBe(false)
    expect(cambioDeEstadoPermitido('listo', 'preparacion')).toBe(true)
  })

  it('genera codigos cortos y legibles', () => {
    for (let i = 0; i < 50; i++) {
      const c = generarCodigo()
      expect(codigoValido(c)).toBe(true)
      expect(c).not.toMatch(/[01IOL]/)
    }
  })

  it('el QR lleva un enlace a la pagina de verificacion', () => {
    expect(textoQR('AB2CD', 'https://citx.vercel.app')).toBe(
      'https://citx.vercel.app/verificar/AB2CD'
    )
  })

  it('lee el codigo desde el QR, el formato viejo o escrito a mano', () => {
    expect(codigoDesdeQR(textoQR('AB2CD'))).toBe('AB2CD')
    expect(codigoDesdeQR('http://localhost:5173/verificar/ab2cd')).toBe('AB2CD')
    expect(codigoDesdeQR('CITX-PEDIDO:AB2CD')).toBe('AB2CD')
    expect(codigoDesdeQR(' ab2cd ')).toBe('AB2CD')
    expect(codigoDesdeQR('https://otra-cosa.com')).toBe(null)
    expect(codigoDesdeQR('https://citx.vercel.app/verificar/A0OI1')).toBe(null)
  })
})

describe('Busqueda sin tildes', () => {
  it('encuentra aunque falten tildes', () => {
    expect(normalizar('Enfermería')).toBe('enfermeria')
    expect(coincide('enfermeria', 'Enfermería')).toBe(true)
    expect(coincide('soda armonia', 'Soda Armonía', 'comida')).toBe(true)
    expect(coincide('piscina', 'Canchas')).toBe(false)
  })
})
