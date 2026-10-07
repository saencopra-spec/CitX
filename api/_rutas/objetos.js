import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import {
  ok,
  creado,
  leerCuerpo,
  noExiste,
  conflicto,
  malaPeticion,
} from '../_lib/respuesta.js'
import { requerir, idValido } from '../_lib/sesion.js'
import { campoFoto, guardarFotoSiEsNueva } from '../_lib/imagenes.js'
import { notificar } from '../_lib/notificar.js'
import { puede } from '../../compartido/permisos.js'

const ESTADOS_OBJETO = ['disponible', 'entregado']

const esquemaObjeto = z.object({
  titulo: z.string().trim().min(3, 'Decí qué objeto es.').max(60),
  descripcion: z
    .string()
    .trim()
    .min(5, 'Describí color, marca o algo que ayude a reconocerlo.')
    .max(400),
  lugar: z.string().trim().min(2, 'Decí dónde se encontró.').max(80),
  encontradoEl: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí la fecha en que se encontró.'),
  estado: z.enum(ESTADOS_OBJETO).default('disponible'),
  foto: campoFoto,
})

function publico(o, extra = {}) {
  return {
    id: String(o._id),
    titulo: o.titulo,
    descripcion: o.descripcion,
    lugar: o.lugar,
    encontradoEl: o.encontradoEl,
    estado: o.estado,
    foto: o.foto ?? null,
    ...extra,
  }
}

registrar('GET', '/objetos', async ({ req, res, query }) => {
  const usuario = await requerir(req)
  const objetos = await col(COLECCIONES.objetosPerdidos)
  const gestiona = puede(usuario.rol, 'objetos.gestionar')
  const filtro = gestiona && query.todos === '1' ? {} : { estado: 'disponible' }
  const lista = await objetos
    .find(filtro)
    .sort({ encontradoEl: -1, creadoEn: -1 })
    .limit(200)
    .toArray()

  // Marcamos cuales ya reclamo este usuario, para no ofrecer el boton dos veces.
  const solicitudes = await col(COLECCIONES.solicitudesObjetos)
  const mias = await solicitudes
    .find(
      { usuarioId: String(usuario._id) },
      { projection: { objetoId: 1, estado: 1 } }
    )
    .toArray()
  const reclamados = new Map(mias.map((s) => [s.objetoId, s.estado]))

  ok(res, {
    objetos: lista.map((o) =>
      publico(o, { miSolicitud: reclamados.get(String(o._id)) ?? null })
    ),
  })
})

registrar('POST', '/objetos', async ({ req, res }) => {
  await requerir(req, 'objetos.gestionar')
  const datos = esquemaObjeto.parse(await leerCuerpo(req))
  const objeto = {
    ...datos,
    foto: await guardarFotoSiEsNueva(datos.foto),
    creadoEn: new Date(),
  }
  const objetos = await col(COLECCIONES.objetosPerdidos)
  const { insertedId } = await objetos.insertOne(objeto)
  creado(res, { objeto: publico({ ...objeto, _id: insertedId }) })
})

registrar('PUT', '/objetos/:id', async ({ req, res, params }) => {
  await requerir(req, 'objetos.gestionar')
  const datos = esquemaObjeto.parse(await leerCuerpo(req))
  const objetos = await col(COLECCIONES.objetosPerdidos)
  const r = await objetos.findOneAndUpdate(
    { _id: idValido(params.id) },
    { $set: { ...datos, foto: await guardarFotoSiEsNueva(datos.foto) } },
    { returnDocument: 'after' }
  )
  if (!r) throw noExiste('Ese objeto ya no existe.')
  ok(res, { objeto: publico(r) })
})

registrar('DELETE', '/objetos/:id', async ({ req, res, params }) => {
  await requerir(req, 'objetos.gestionar')
  const objetos = await col(COLECCIONES.objetosPerdidos)
  const id = idValido(params.id)
  await objetos.deleteOne({ _id: id })
  const solicitudes = await col(COLECCIONES.solicitudesObjetos)
  await solicitudes.deleteMany({ objetoId: String(id) })
  ok(res, { listo: true })
})

/** "Es mio": crea una solicitud que la administracion revisa en el panel. */
registrar('POST', '/objetos/:id/reclamar', async ({ req, res, params }) => {
  const usuario = await requerir(req)
  const { mensaje } = z
    .object({
      mensaje: z
        .string()
        .trim()
        .min(
          5,
          'Contanos algo que solo el dueño sabría (una marca, un sticker, qué tenía adentro).'
        )
        .max(300),
    })
    .parse(await leerCuerpo(req))

  const objetos = await col(COLECCIONES.objetosPerdidos)
  const objeto = await objetos.findOne({ _id: idValido(params.id) })
  if (!objeto) throw noExiste('Ese objeto ya no está en la lista.')
  if (objeto.estado !== 'disponible')
    throw malaPeticion('Ese objeto ya fue entregado.')

  const solicitudes = await col(COLECCIONES.solicitudesObjetos)
  const yaExiste = await solicitudes.findOne({
    objetoId: String(objeto._id),
    usuarioId: String(usuario._id),
  })
  if (yaExiste) throw conflicto('Ya enviaste una solicitud por este objeto.')

  await solicitudes.insertOne({
    objetoId: String(objeto._id),
    objetoTitulo: objeto.titulo,
    usuarioId: String(usuario._id),
    usuarioNombre: usuario.nombre,
    usuarioSeccion: usuario.seccion ?? null,
    usuarioCorreo: usuario.correo,
    mensaje,
    estado: 'pendiente',
    creadoEn: new Date(),
  })
  creado(res, { listo: true })
})

registrar('GET', '/objetos/solicitudes', async ({ req, res }) => {
  await requerir(req, 'objetos.gestionar')
  const solicitudes = await col(COLECCIONES.solicitudesObjetos)
  const lista = await solicitudes
    .find({})
    .sort({ estado: -1, creadoEn: -1 })
    .limit(200)
    .toArray()
  ok(res, {
    solicitudes: lista.map((s) => ({
      id: String(s._id),
      objetoId: s.objetoId,
      objetoTitulo: s.objetoTitulo,
      usuarioNombre: s.usuarioNombre,
      usuarioSeccion: s.usuarioSeccion,
      usuarioCorreo: s.usuarioCorreo,
      mensaje: s.mensaje,
      estado: s.estado,
      creadoEn: s.creadoEn,
    })),
  })
})

/** Aprobar entrega el objeto a esa persona; rechazar solo cierra la solicitud. */
registrar('PATCH', '/objetos/solicitudes/:id', async ({ req, res, params }) => {
  await requerir(req, 'objetos.gestionar')
  const { estado } = z
    .object({ estado: z.enum(['aprobada', 'rechazada']) })
    .parse(await leerCuerpo(req))
  const solicitudes = await col(COLECCIONES.solicitudesObjetos)
  const solicitud = await solicitudes.findOne({ _id: idValido(params.id) })
  if (!solicitud) throw noExiste('Esa solicitud ya no existe.')
  if (solicitud.estado !== 'pendiente')
    throw malaPeticion('Esa solicitud ya se resolvió.')

  await solicitudes.updateOne(
    { _id: solicitud._id },
    { $set: { estado, resueltaEn: new Date() } }
  )

  if (estado === 'aprobada') {
    const objetos = await col(COLECCIONES.objetosPerdidos)
    await objetos.updateOne(
      { _id: idValido(solicitud.objetoId) },
      { $set: { estado: 'entregado' } }
    )
    // Las demas solicitudes por el mismo objeto quedan rechazadas.
    const otras = await solicitudes
      .find({
        objetoId: solicitud.objetoId,
        estado: 'pendiente',
        _id: { $ne: solicitud._id },
      })
      .toArray()
    await solicitudes.updateMany(
      { _id: { $in: otras.map((o) => o._id) } },
      { $set: { estado: 'rechazada', resueltaEn: new Date() } }
    )
    await notificar([solicitud.usuarioId], {
      titulo: `Tu solicitud por "${solicitud.objetoTitulo}" fue aprobada`,
      cuerpo: 'Pasá a la dirección a retirarlo con tu carné.',
      enlace: '/guia/objetos-perdidos',
      tipo: 'objeto',
    })
    if (otras.length) {
      await notificar(
        otras.map((o) => o.usuarioId),
        {
          titulo: `"${solicitud.objetoTitulo}" ya fue entregado`,
          cuerpo:
            'Se le entregó a otra persona. Si creés que es un error, pasá a la dirección.',
          enlace: '/guia/objetos-perdidos',
          tipo: 'objeto',
        }
      )
    }
  } else {
    await notificar([solicitud.usuarioId], {
      titulo: `Tu solicitud por "${solicitud.objetoTitulo}" no fue aprobada`,
      cuerpo: 'Si de verdad es tuyo, pasá a la dirección para conversarlo.',
      enlace: '/guia/objetos-perdidos',
      tipo: 'objeto',
    })
  }
  ok(res, { listo: true })
})
