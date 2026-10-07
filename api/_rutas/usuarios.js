import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES, asegurarIndices } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  noExiste,
  malaPeticion,
  conflicto,
} from '../_lib/respuesta.js'
import { requerir, idValido, usuarioPublico } from '../_lib/sesion.js'
import { anotar } from '../_lib/bitacora.js'
import {
  generarCodigoInvitacion,
  huella,
  invitacionPublica,
  validarDatosInvitacion,
} from '../_lib/invitaciones.js'
import {
  ROLES,
  ROLES_PERSONAL,
  SECCIONES,
  NOMBRE_ROL,
  PERMISOS,
  PERMISOS_ASIGNABLES,
} from '../../compartido/permisos.js'

function escaparRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function conDatosPanel(u) {
  return {
    ...usuarioPublico(u),
    creadoEn: u.creadoEn,
    ultimoIngreso: u.ultimoIngreso ?? null,
    invitadoPor: u.invitadoPor ?? null,
  }
}

/** No se puede dejar el colegio sin ningun administrador activo. */
async function esUltimoAdmin(usuarios, id) {
  const otros = await usuarios.countDocuments({
    rol: 'admin',
    activo: { $ne: false },
    _id: { $ne: id },
  })
  return otros === 0
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

registrar('GET', '/usuarios', async ({ req, res, query }) => {
  await requerir(req, 'usuarios.gestionar')
  const usuarios = await col(COLECCIONES.usuarios)
  const filtro = {}
  if (query.rol && ROLES.includes(query.rol)) filtro.rol = query.rol
  if (query.estado === 'activos') filtro.activo = { $ne: false }
  if (query.estado === 'desactivados') filtro.activo = false
  if (query.buscar) {
    const texto = escaparRegex(String(query.buscar).slice(0, 60))
    filtro.$or = [
      { nombre: { $regex: texto, $options: 'i' } },
      { correo: { $regex: texto, $options: 'i' } },
      { seccion: { $regex: `^${texto}`, $options: 'i' } },
    ]
  }
  const [lista, total, porRol] = await Promise.all([
    usuarios
      .find(filtro, { projection: { hash: 0, configuracion: 0 } })
      .sort({ creadoEn: -1 })
      .limit(500)
      .toArray(),
    usuarios.countDocuments({}),
    usuarios.aggregate([{ $group: { _id: '$rol', n: { $sum: 1 } } }]).toArray(),
  ])
  ok(res, {
    usuarios: lista.map(conDatosPanel),
    total,
    porRol: Object.fromEntries(porRol.map((r) => [r._id, r.n])),
  })
})

const esquemaCambio = z.object({
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional(),
  seccion: z.string().nullable().optional(),
  nombre: z.string().trim().min(2).max(80).optional(),
  /** Lista de permisos, o null para volver a los del rol. */
  permisos: z.array(z.enum(PERMISOS_ASIGNABLES)).nullable().optional(),
})

registrar('PATCH', '/usuarios/:id', async ({ req, res, params }) => {
  const admin = await requerir(req, 'usuarios.gestionar')
  const datos = esquemaCambio.parse(await leerCuerpo(req))
  const id = idValido(params.id)
  const esUnoMismo = String(id) === String(admin._id)

  if (
    esUnoMismo &&
    (datos.activo === false || (datos.rol && datos.rol !== 'admin'))
  ) {
    throw malaPeticion(
      'No podés quitarte el acceso de administrador ni desactivar tu propia cuenta.'
    )
  }

  const usuarios = await col(COLECCIONES.usuarios)
  const actual = await usuarios.findOne({ _id: id })
  if (!actual) throw noExiste('Esa cuenta ya no existe.')

  const quitaAdmin =
    actual.rol === 'admin' &&
    ((datos.rol && datos.rol !== 'admin') || datos.activo === false)
  if (quitaAdmin && (await esUltimoAdmin(usuarios, id))) {
    throw malaPeticion(
      'Tiene que quedar al menos una cuenta de administrador activa.'
    )
  }

  const set = {}
  const unset = {}
  const notas = []
  if (datos.nombre) set.nombre = datos.nombre
  if (datos.activo !== undefined) {
    set.activo = datos.activo
    notas.push(datos.activo ? 'activó la cuenta' : 'desactivó la cuenta')
  }
  if (datos.rol && datos.rol !== actual.rol) {
    set.rol = datos.rol
    // Al cambiar de rol se vuelve a los permisos de ese rol.
    unset.permisos = ''
    if (datos.rol !== 'estudiante') set.seccion = null
    notas.push(`rol: ${NOMBRE_ROL[actual.rol]} a ${NOMBRE_ROL[datos.rol]}`)
  }
  const rolFinal = set.rol ?? actual.rol
  if (rolFinal === 'estudiante') {
    const seccion = datos.seccion ?? actual.seccion
    if (!SECCIONES.includes(seccion ?? '')) {
      throw malaPeticion(
        'Para que sea estudiante hay que elegir una sección.',
        { seccion: 'Elegí la sección.' }
      )
    }
    set.seccion = seccion
  }
  if (datos.permisos !== undefined && !set.rol) {
    if (rolFinal === 'admin' || rolFinal === 'estudiante') {
      throw malaPeticion(
        'Los permisos solo se ajustan para profesores, personal administrativo y soda.'
      )
    }
    if (datos.permisos === null) {
      unset.permisos = ''
      notas.push('permisos: los del rol')
    } else {
      set.permisos = datos.permisos
      notas.push(
        `permisos: ${datos.permisos.map((p) => PERMISOS[p].nombre).join(', ') || 'ninguno'}`
      )
    }
  }
  // Si se desactiva o cambia el rol, se cierran sus sesiones abiertas.
  if (set.activo === false || set.rol)
    set.versionSesion = (actual.versionSesion ?? 0) + 1

  const operacion = {}
  if (Object.keys(set).length) operacion.$set = set
  if (Object.keys(unset).length) operacion.$unset = unset
  const r = Object.keys(operacion).length
    ? await usuarios.findOneAndUpdate({ _id: id }, operacion, {
        returnDocument: 'after',
      })
    : actual
  if (notas.length)
    await anotar(
      req,
      admin,
      'Cuenta modificada',
      `${actual.nombre} (${actual.correo}): ${notas.join('; ')}`
    )
  ok(res, { usuario: conDatosPanel(r) })
})

registrar('DELETE', '/usuarios/:id', async ({ req, res, params }) => {
  const admin = await requerir(req, 'usuarios.gestionar')
  const id = idValido(params.id)
  if (String(id) === String(admin._id))
    throw malaPeticion('No podés borrar tu propia cuenta.')
  const usuarios = await col(COLECCIONES.usuarios)
  const usuario = await usuarios.findOne({ _id: id })
  if (!usuario) throw noExiste('Esa cuenta ya no existe.')
  if (usuario.rol === 'admin' && (await esUltimoAdmin(usuarios, id))) {
    throw malaPeticion('No se puede borrar la última cuenta de administrador.')
  }

  const uid = String(id)
  // Se borran sus datos personales. Los pedidos se conservan para los
  // reportes de la soda, pero sin datos que identifiquen a la persona.
  await Promise.all([
    usuarios.deleteOne({ _id: id }),
    (await col(COLECCIONES.recordatorios)).deleteMany({ autorId: uid }),
    (await col(COLECCIONES.notificaciones)).deleteMany({ usuarioId: uid }),
    (await col(COLECCIONES.solicitudesObjetos)).deleteMany({ usuarioId: uid }),
    (await col(COLECCIONES.pedidos)).updateMany(
      { usuarioId: uid },
      {
        $set: {
          usuarioNombre: 'Cuenta borrada',
          usuarioSeccion: null,
          usuarioId: 'borrado',
        },
      }
    ),
  ])
  await anotar(
    req,
    admin,
    'Cuenta borrada',
    `${usuario.nombre} (${usuario.correo}), ${NOMBRE_ROL[usuario.rol]}`
  )
  ok(res, { listo: true })
})

/** Contrasena temporal para quien olvido la suya. Se muestra una sola vez. */
registrar(
  'POST',
  '/usuarios/:id/contrasena-temporal',
  async ({ req, res, params }) => {
    const admin = await requerir(req, 'usuarios.gestionar')
    const id = idValido(params.id)
    const usuarios = await col(COLECCIONES.usuarios)
    const usuario = await usuarios.findOne({ _id: id })
    if (!usuario) throw noExiste('Esa cuenta ya no existe.')

    const letras = 'abcdefghjkmnpqrstuvwxyz'
    let temporal = 'Cit'
    for (let i = 0; i < 5; i++) temporal += letras[randomInt(letras.length)]
    temporal += String(randomInt(1000, 9999))

    await usuarios.updateOne(
      { _id: id },
      {
        $set: {
          hash: await bcrypt.hash(temporal, 10),
          debeCambiarContrasena: true,
          versionSesion: (usuario.versionSesion ?? 0) + 1,
        },
      }
    )
    await anotar(
      req,
      admin,
      'Contraseña temporal',
      `${usuario.nombre} (${usuario.correo})`
    )
    ok(res, { contrasena: temporal })
  }
)

registrar(
  'POST',
  '/usuarios/:id/cerrar-sesiones',
  async ({ req, res, params }) => {
    const admin = await requerir(req, 'usuarios.gestionar')
    const id = idValido(params.id)
    const usuarios = await col(COLECCIONES.usuarios)
    const usuario = await usuarios.findOneAndUpdate(
      { _id: id },
      { $inc: { versionSesion: 1 } },
      { returnDocument: 'after' }
    )
    if (!usuario) throw noExiste('Esa cuenta ya no existe.')
    await anotar(
      req,
      admin,
      'Sesiones cerradas',
      `${usuario.nombre} (${usuario.correo})`
    )
    ok(res, { listo: true })
  }
)

const esquemaNuevo = z.object({
  nombre: z.string().trim().min(2, 'Escribí el nombre.').max(80),
  correo: z.string().trim().toLowerCase().email('Ese correo no parece válido.'),
  contrasena: z
    .string()
    .min(8, 'Al menos 8 caracteres.')
    .max(72)
    .refine(
      (c) => /[a-zA-Z]/.test(c) && /\d/.test(c),
      'Usá al menos una letra y un número.'
    ),
  rol: z.enum(ROLES),
  seccion: z.string().nullable().optional(),
})

/** Crear una cuenta directamente (por ejemplo, si la persona no tiene celular a mano). */
registrar('POST', '/usuarios', async ({ req, res }) => {
  const admin = await requerir(req, 'usuarios.gestionar')
  await asegurarIndices()
  const datos = esquemaNuevo.parse(await leerCuerpo(req))
  if (datos.rol === 'estudiante' && !SECCIONES.includes(datos.seccion ?? '')) {
    throw malaPeticion('Revisá los datos.', { seccion: 'Elegí la sección.' })
  }
  const usuarios = await col(COLECCIONES.usuarios)
  if (await usuarios.findOne({ correo: datos.correo })) {
    throw conflicto('Ya existe una cuenta con ese correo.', {
      correo: 'Ese correo ya está registrado.',
    })
  }
  const usuario = {
    nombre: datos.nombre,
    correo: datos.correo,
    hash: await bcrypt.hash(datos.contrasena, 10),
    rol: datos.rol,
    seccion: datos.rol === 'estudiante' ? datos.seccion : null,
    favoritos: [],
    configuracion: null,
    activo: true,
    versionSesion: 0,
    debeCambiarContrasena: true,
    invitadoPor: admin.nombre,
    creadoEn: new Date(),
  }
  const { insertedId } = await usuarios.insertOne(usuario)
  await anotar(
    req,
    admin,
    'Cuenta creada',
    `${usuario.nombre} (${usuario.correo}) como ${NOMBRE_ROL[usuario.rol]}`
  )
  creado(res, { usuario: conDatosPanel({ ...usuario, _id: insertedId }) })
})

// ---------------------------------------------------------------------------
// Invitaciones
// ---------------------------------------------------------------------------

registrar('GET', '/invitaciones', async ({ req, res }) => {
  await requerir(req, 'usuarios.gestionar')
  const invitaciones = await col(COLECCIONES.invitaciones)
  const lista = await invitaciones
    .find({})
    .sort({ creadoEn: -1 })
    .limit(200)
    .toArray()
  ok(res, { invitaciones: lista.map(invitacionPublica) })
})

const esquemaInvitacion = z.object({
  rol: z.enum(ROLES_PERSONAL, { error: 'Elegí el tipo de cuenta.' }),
  permisos: z.array(z.enum(PERMISOS_ASIGNABLES)).nullable().optional(),
  nota: z.string().trim().min(2, 'Escribí para quién es.').max(80),
  horas: z
    .number()
    .int()
    .min(1)
    .max(24 * 14)
    .default(48),
  usosMaximos: z.number().int().min(1).max(50).default(1),
})

registrar('POST', '/invitaciones', async ({ req, res }) => {
  const admin = await requerir(req, 'usuarios.gestionar')
  await asegurarIndices()
  const datos = esquemaInvitacion.parse(await leerCuerpo(req))
  validarDatosInvitacion(datos)
  if (datos.rol === 'admin') datos.permisos = null

  const codigo = generarCodigoInvitacion()
  const ahora = new Date()
  const invitacion = {
    hash: huella(codigo),
    // Solo los ultimos caracteres, para reconocerla en la lista.
    pista: `...${codigo.slice(-4)}`,
    rol: datos.rol,
    permisos: datos.permisos ?? null,
    nota: datos.nota,
    usos: 0,
    usosMaximos: datos.usosMaximos,
    usadoPor: [],
    revocada: false,
    venceEn: new Date(ahora.getTime() + datos.horas * 3600 * 1000),
    creadoEn: ahora,
    creadoPorId: String(admin._id),
    creadoPorNombre: admin.nombre,
  }
  const invitaciones = await col(COLECCIONES.invitaciones)
  const { insertedId } = await invitaciones.insertOne(invitacion)
  await anotar(
    req,
    admin,
    'Invitación creada',
    `${NOMBRE_ROL[datos.rol]} para ${datos.nota} (${invitacion.pista})`
  )
  creado(res, {
    codigo,
    invitacion: invitacionPublica({ ...invitacion, _id: insertedId }),
  })
})

registrar('DELETE', '/invitaciones/:id', async ({ req, res, params }) => {
  const admin = await requerir(req, 'usuarios.gestionar')
  const invitaciones = await col(COLECCIONES.invitaciones)
  const r = await invitaciones.findOneAndUpdate(
    { _id: idValido(params.id) },
    { $set: { revocada: true } },
    { returnDocument: 'after' }
  )
  if (!r) throw noExiste('Esa invitación ya no existe.')
  await anotar(req, admin, 'Invitación revocada', `${r.nota} (${r.pista})`)
  ok(res, { invitacion: invitacionPublica(r) })
})

// ---------------------------------------------------------------------------
// Bitacora
// ---------------------------------------------------------------------------

registrar('GET', '/bitacora', async ({ req, res, query }) => {
  await requerir(req, 'bitacora.ver')
  const bitacora = await col(COLECCIONES.bitacora)
  const filtro = {}
  if (query.buscar) {
    const texto = escaparRegex(String(query.buscar).slice(0, 60))
    filtro.$or = [
      { accion: { $regex: texto, $options: 'i' } },
      { detalle: { $regex: texto, $options: 'i' } },
      { usuarioNombre: { $regex: texto, $options: 'i' } },
    ]
  }
  const lista = await bitacora
    .find(filtro)
    .sort({ creadoEn: -1 })
    .limit(300)
    .toArray()
  ok(res, {
    registros: lista.map((r) => ({
      id: String(r._id),
      usuarioNombre: r.usuarioNombre,
      accion: r.accion,
      detalle: r.detalle,
      ip: r.ip,
      creadoEn: r.creadoEn,
    })),
  })
})
