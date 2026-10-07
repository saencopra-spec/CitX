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
import { ROLES_REGISTRO, SECCIONES } from '../../compartido/permisos.js'

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

const esquemaRegistro = z
  .object({
    nombre,
    correo,
    contrasena: contrasenaNueva,
    rol: z.enum(ROLES_REGISTRO, {
      error: 'Elegí si sos estudiante, profesor o personal administrativo.',
    }),
    seccion: z.string().optional().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.rol === 'estudiante' && !SECCIONES.includes(d.seccion ?? '')) {
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
    rol: datos.rol,
    seccion: datos.rol === 'estudiante' ? datos.seccion : null,
    favoritos: [],
    configuracion: null,
    activo: true,
    creadoEn: new Date(),
  }
  const { insertedId } = await usuarios.insertOne(usuario)
  usuario._id = insertedId

  ponerCookie(req, res, usuario)
  creado(res, { usuario: usuarioPublico(usuario) })
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
  const usuarios = await col(COLECCIONES.usuarios)
  await usuarios.updateOne(
    { _id: usuario._id },
    { $set: { hash: await bcrypt.hash(datos.nueva, 10) } }
  )
  ok(res, { listo: true })
})
