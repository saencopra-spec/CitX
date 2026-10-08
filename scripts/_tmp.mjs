import { bd, cerrar, COLECCIONES } from '../api/_lib/db.js'
import { LUGARES_CIT } from '../compartido/campus.js'
const base = await bd()
const n = base.collection(COLECCIONES.notificaciones)
console.log('notif por tipo', JSON.stringify(await n.aggregate([{ $group: { _id: '$tipo', c: { $sum: 1 } } }]).toArray()))
console.log(JSON.stringify(await n.findOne({}, { projection: { _id: 0 } })))
const lug = base.collection(COLECCIONES.lugares)
for (const l of LUGARES_CIT) if (l.foto) { const r = await lug.updateOne({ clave: l.clave, foto: { $in: [null, ''] } }, { $set: { foto: l.foto } }); if (r.modifiedCount) console.log('foto', l.clave) }
await cerrar()
