import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES, asegurarIndices } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  conflicto,
  demasiados,
  ErrorHttp,
} from '../_lib/respuesta.js'
import {
  ponerCookie,
  borrarCookie,
  usuarioDeSesion,
  usuarioPublico,
  requerir,
  ipDe,
} from '../_lib/sesion.js'
import { SECCIONES } from '../../compartido/permisos.js'
import { canjear } from '../_lib/invitaciones.js'

const correo = z
  .string({ error: 'Escribí tu correo.' })
  .trim()
  .toLowerCase()
  .min(1, 'Escribí tu correo.')
  .max(120, 'Ese correo es demasiado largo.')
  .email('Ese correo no parece válido. Revisá que tenga @ y un dominio.')

const contrasenaNueva = z
  .string({ error: 'Escribí una contraseña.' })
  .min(8, 'La contraseña necesita al menos 8 caracteres.')
  .max(72, 'La contraseña no puede pasar de 72 caracteres.')
  .refine(
    (c) => /[a-zA-Z]/.test(c) && /\d/.test(c),
    'Usá al menos una letra y un número.'
  )

const nombre = z
  .string({ error: 'Escribí tu nombre.' })
  .trim()
  .min(2, 'Escribí tu nombre completo.')
  .max(80, 'El nombre es demasiado largo.')

/**
 * Registro publico: cualquiera puede crear una cuenta de estudiante. Para ser
 * personal (profesor, administrativo, soda o administrador) hace falta un
 * codigo de invitacion que genera la administracion.
 */
const esquemaRegistro = z
  .object({
    nombre,
    correo,
    contrasena: contrasenaNueva,
    seccion: z.string().optional().nullable(),
    codigo: z.string().trim().max(40).optional().nullable(),
  })
  .superRefine((d, ctx) => {
    if (!d.codigo && !SECCIONES.includes(d.seccion ?? '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['seccion'],
        message: 'Elegí tu sección de la lista.',
      })
    }
  })

const esquemaEntrar = z.object({
  correo,
  contrasena: z
    .string({ error: 'Escribí tu contraseña.' })
    .min(1, 'Escribí tu contraseña.')
    .max(200),
})

const esquemaPerfil = z.object({
  nombre,
  seccion: z.string().optional().nullable(),
})

const esquemaContrasena = z.object({
  actual: z.string().min(1, 'Escribí tu contraseña actual.'),
  nueva: contrasenaNueva,
})

let _hashFalso = null
async function hashFalso() {
  if (!_hashFalso) _hashFalso = await bcrypt.hash('cuenta-que-no-existe', 10)
  return _hashFalso
}

const MAX_INTENTOS = 5
const VENTANA_MINUTOS = 15

/** Frena a quien intenta adivinar contrasenas: 5 intentos cada 15 minutos. */
async function revisarIntentos(llave) {
  const intentos = await col(COLECCIONES.intentosEntrada)
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60 * 1000)
  const cantidad = await intentos.countDocuments({
    llave,
    creadoEn: { $gte: desde },
  })
  if (cantidad >= MAX_INTENTOS) {
    throw demasiados(
      `Hubo demasiados intentos fallidos. Esperá ${VENTANA_MINUTOS} minutos y probá de nuevo.`
    )
  }
}

async function anotarIntento(llave) {
  const intentos = await col(COLECCIONES.intentosEntrada)
  await intentos.insertOne({ llave, creadoEn: new Date() })
}

async function limpiarIntentos(llave) {
  const intentos = await col(COLECCIONES.intentosEntrada)
  await intentos.deleteMany({ llave })
}

registrar('POST', '/auth/registro', async ({ req, res }) => {
  const datos = esquemaRegistro.parse(await leerCuerpo(req))
  await asegurarIndices()
  const usuarios = await col(COLECCIONES.usuarios)

  if (await usuarios.findOne({ correo: datos.correo })) {
    throw conflicto('Ya existe una cuenta con ese correo.', {
      correo: 'Ya existe una cuenta con ese correo. Probá iniciar sesión.',
    })
  }

  const usuario = {
    nombre: datos.nombre,
    correo: datos.correo,
    hash: await bcrypt.hash(datos.contrasena, 10),
    rol: 'estudiante',
    seccion: datos.seccion ?? null,
    favoritos: [],
    configuracion: null,
    activo: true,
    versionSesion: 0,
    creadoEn: new Date(),
  }

  let invitacion = null
  if (datos.codigo) {
    invitacion = await canjear(datos.codigo, ipDe(req), usuario)
    usuario.rol = invitacion.rol
    usuario.seccion = null
    if (Array.isArray(invitacion.permisos))
      usuario.permisos = invitacion.permisos
    usuario.invitadoPor = invitacion.creadoPorNombre
  }

  let insertedId
  try {
    ;({ insertedId } = await usuarios.insertOne(usuario))
  } catch (e) {
    // Si no se pudo crear la cuenta, se devuelve el uso del codigo.
    if (invitacion) {
      const invitaciones = await col(COLECCIONES.invitaciones)
      await invitaciones.updateOne(
        { _id: invitacion._id },
        { $inc: { usos: -1 }, $pull: { usadoPor: { correo: usuario.correo } } }
      )
    }
    throw e
  }
  usuario._id = insertedId

  if (invitacion) {
    const invitaciones = await col(COLECCIONES.invitaciones)
    await invitaciones.updateOne(
      { _id: invitacion._id, 'usadoPor.correo': usuario.correo },
      { $set: { 'usadoPor.$.id': String(insertedId) } }
    )
  }

  ponerCookie(req, res, usuario)
  creado(res, { usuario: usuarioPublico(usuario) })
})

/**
 * Alguien que ya tiene cuenta (por ejemplo, un profesor que se registro como
 * estudiante) puede usar un codigo para pasar a personal.
 */
registrar('POST', '/auth/canjear', async ({ req, res }) => {
  const usuario = await requerir(req)
  const { codigo } = z
    .object({ codigo: z.string().trim().min(4).max(40) })
    .parse(await leerCuerpo(req))
  const invitacion = await canjear(codigo, ipDe(req), usuario)
  const cambios = {
    rol: invitacion.rol,
    seccion: null,
    invitadoPor: invitacion.creadoPorNombre,
  }
  const operacion = { $set: cambios }
  if (Array.isArray(invitacion.permisos)) cambios.permisos = invitacion.permisos
  else operacion.$unset = { permisos: '' }
  const usuarios = await col(COLECCIONES.usuarios)
  await usuarios.updateOne({ _id: usuario._id }, operacion)
  const actualizado = await usuarios.findOne({ _id: usuario._id })
  ok(res, { usuario: usuarioPublico(actualizado) })
})

registrar('POST', '/auth/entrar', async ({ req, res }) => {
  const datos = esquemaEntrar.parse(await leerCuerpo(req))
  await asegurarIndices()
  const llave = `${ipDe(req)}|${datos.correo}`
  await revisarIntentos(llave)

  const usuarios = await col(COLECCIONES.usuarios)
  const usuario = await usuarios.findOne({ correo: datos.correo })

  // Comparamos aunque no exista el usuario, para que la respuesta tarde lo
  // mismo y no se pueda averiguar que correos estan registrados.
  const hash = usuario?.hash ?? (await hashFalso())
  const coincide = await bcrypt.compare(datos.contrasena, hash)

  if (!usuario || !coincide) {
    await anotarIntento(llave)
    throw new ErrorHttp(401, 'El correo o la contraseña no coinciden.')
  }
  if (usuario.activo === false) {
    throw new ErrorHttp(
      403,
      'Esta cuenta está desactivada. Hablá con la administración del colegio.'
    )
  }

  await limpiarIntentos(llave)
  await usuarios.updateOne(
    { _id: usuario._id },
    { $set: { ultimoIngreso: new Date() } }
  )
  ponerCookie(req, res, usuario)
  ok(res, { usuario: usuarioPublico(usuario) })
})

registrar('POST', '/auth/salir', async ({ req, res }) => {
  borrarCookie(req, res)
  ok(res, { listo: true })
})

registrar('GET', '/auth/yo', async ({ req, res }) => {
  if (!process.env.MONGODB_URI) return ok(res, { usuario: null })
  const usuario = await usuarioDeSesion(req)
  ok(res, { usuario: usuarioPublico(usuario) })
})

registrar('PUT', '/auth/perfil', async ({ req, res }) => {
  const usuario = await requerir(req)
  const datos = esquemaPerfil.parse(await leerCuerpo(req))
  const cambios = { nombre: datos.nombre }

  if (usuario.rol === 'estudiante') {
    if (!SECCIONES.includes(datos.seccion ?? '')) {
      throw new ErrorHttp(400, 'Revisá los datos del formulario.', {
        seccion: 'Elegí tu sección de la lista.',
      })
    }
    cambios.seccion = datos.seccion
  }

  const usuarios = await col(COLECCIONES.usuarios)
  await usuarios.updateOne({ _id: usuario._id }, { $set: cambios })
  ok(res, { usuario: usuarioPublico({ ...usuario, ...cambios }) })
})

registrar('PUT', '/auth/contrasena', async ({ req, res }) => {
  const usuario = await requerir(req)
  const datos = esquemaContrasena.parse(await leerCuerpo(req))
  if (!(await bcrypt.compare(datos.actual, usuario.hash))) {
    throw new ErrorHttp(400, 'Revisá los datos del formulario.', {
      actual: 'La contraseña actual no es correcta.',
    })
  }
  // Cambiar la contrasena cierra la sesion en los demas dispositivos.
  const usuarios = await col(COLECCIONES.usuarios)
  const versionSesion = (usuario.versionSesion ?? 0) + 1
  await usuarios.updateOne(
    { _id: usuario._id },
    {
      $set: { hash: await bcrypt.hash(datos.nueva, 10), versionSesion },
      $unset: { debeCambiarContrasena: '' },
    }
  )
  ponerCookie(req, res, { ...usuario, versionSesion })
  ok(res, { listo: true })
})
