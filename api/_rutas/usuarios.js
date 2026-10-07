import bcrypt from 'bcryptjs'
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
import { ROLES, SECCIONES } from '../../compartido/permisos.js'

registrar('GET', '/usuarios', async ({ req, res, query }) => {
  await requerir(req, 'usuarios.gestionar')
  const usuarios = await col(COLECCIONES.usuarios)
  const filtro = {}
  if (query.rol && ROLES.includes(query.rol)) filtro.rol = query.rol
  if (query.buscar) {
    const texto = String(query.buscar)
      .slice(0, 60)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filtro.$or = [
      { nombre: { $regex: texto, $options: 'i' } },
      { correo: { $regex: texto, $options: 'i' } },
    ]
  }
  const lista = await usuarios
    .find(filtro, { projection: { hash: 0, configuracion: 0 } })
    .sort({ creadoEn: -1 })
    .limit(200)
    .toArray()
  ok(res, {
    usuarios: lista.map((u) => ({
      ...usuarioPublico(u),
      creadoEn: u.creadoEn,
    })),
  })
})

const esquemaCambio = z.object({
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional(),
  seccion: z.string().nullable().optional(),
})

registrar('PATCH', '/usuarios/:id', async ({ req, res, params }) => {
  const admin = await requerir(req, 'usuarios.gestionar')
  const datos = esquemaCambio.parse(await leerCuerpo(req))
  const id = idValido(params.id)

  if (
    String(id) === String(admin._id) &&
    (datos.activo === false || (datos.rol && datos.rol !== 'admin'))
  ) {
    throw malaPeticion(
      'No podés quitarte el acceso de administrador ni desactivar tu propia cuenta.'
    )
  }

  const usuarios = await col(COLECCIONES.usuarios)
  const actual = await usuarios.findOne({ _id: id })
  if (!actual) throw noExiste('Esa cuenta ya no existe.')

  const cambios = {}
  if (datos.activo !== undefined) cambios.activo = datos.activo
  if (datos.rol) {
    cambios.rol = datos.rol
    if (datos.rol !== 'estudiante') cambios.seccion = null
  }
  const rolFinal = cambios.rol ?? actual.rol
  if (rolFinal === 'estudiante') {
    const seccion = datos.seccion ?? actual.seccion
    if (!SECCIONES.includes(seccion ?? '')) {
      throw malaPeticion(
        'Para pasar a estudiante hay que elegir una sección.',
        {
          seccion: 'Elegí la sección.',
        }
      )
    }
    cambios.seccion = seccion
  }

  const r = await usuarios.findOneAndUpdate(
    { _id: id },
    { $set: cambios },
    { returnDocument: 'after' }
  )
  ok(res, { usuario: usuarioPublico(r) })
})

const esquemaNuevo = z.object({
  nombre: z.string().trim().min(2, 'Escribí el nombre.').max(80),
  correo: z.string().trim().toLowerCase().email('Ese correo no parece válido.'),
  contrasena: z.string().min(8, 'Al menos 8 caracteres.').max(72),
  rol: z.enum(ROLES),
  seccion: z.string().nullable().optional(),
})

/** Las cuentas de administracion y de la soda solo se crean desde aqui. */
registrar('POST', '/usuarios', async ({ req, res }) => {
  await requerir(req, 'usuarios.gestionar')
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
    creadoEn: new Date(),
  }
  const { insertedId } = await usuarios.insertOne(usuario)
  creado(res, { usuario: usuarioPublico({ ...usuario, _id: insertedId }) })
})
