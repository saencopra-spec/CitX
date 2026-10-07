import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok, leerCuerpo } from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'
import { HORARIO_ENFERMERIA } from '../../compartido/enfermeria.js'

const lista = (max) => z.array(z.string().trim().min(2).max(240)).max(max)

const esquema = z.object({
  servicios: lista(20),
  avisos: lista(10),
  emergencia: lista(10),
  extension: z.string().trim().max(40).default(''),
  abre: z.string().regex(/^\d{2}:\d{2}$/, 'Usá el formato HH:MM.'),
  cierra: z.string().regex(/^\d{2}:\d{2}$/, 'Usá el formato HH:MM.'),
})

registrar('GET', '/enfermeria', async ({ res }) => {
  const enfermeria = await col(COLECCIONES.enfermeria)
  const datos = await enfermeria.findOne(
    { clave: 'principal' },
    { projection: { _id: 0 } }
  )
  ok(res, {
    enfermeria: datos ?? {
      servicios: [],
      avisos: [],
      emergencia: [],
      extension: '',
      ...HORARIO_ENFERMERIA,
    },
  })
})

registrar('PUT', '/enfermeria', async ({ req, res }) => {
  await requerir(req, 'enfermeria.editar')
  const datos = esquema.parse(await leerCuerpo(req))
  const enfermeria = await col(COLECCIONES.enfermeria)
  await enfermeria.updateOne(
    { clave: 'principal' },
    { $set: { ...datos, clave: 'principal', actualizadoEn: new Date() } },
    { upsert: true }
  )
  ok(res, { enfermeria: datos })
})
