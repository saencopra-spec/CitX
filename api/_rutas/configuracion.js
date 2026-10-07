import { z } from 'zod'
import { registrar } from '../_lib/enrutador.js'
import { col, COLECCIONES } from '../_lib/db.js'
import { ok, leerCuerpo } from '../_lib/respuesta.js'
import { requerir } from '../_lib/sesion.js'

const esquema = z.object({
  tema: z.enum(['claro', 'oscuro', 'sistema']),
  tamanoTexto: z.enum(['normal', 'grande', 'mas-grande', 'enorme']),
  altoContraste: z.boolean(),
  reducirMovimiento: z.enum(['sistema', 'si', 'no']),
  dislexia: z.boolean(),
  daltonismo: z.enum(['ninguno', 'protanopia', 'deuteranopia', 'tritanopia']),
  botonesGrandes: z.boolean(),
  lecturaVoz: z.boolean(),
  sonidoPedidos: z.boolean(),
})

/** Guarda los ajustes de accesibilidad en la cuenta. */
registrar('PUT', '/configuracion', async ({ req, res }) => {
  const usuario = await requerir(req)
  const configuracion = esquema.parse(await leerCuerpo(req))
  const usuarios = await col(COLECCIONES.usuarios)
  await usuarios.updateOne({ _id: usuario._id }, { $set: { configuracion } })
  ok(res, { configuracion })
})
