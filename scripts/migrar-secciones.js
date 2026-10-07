/**
 * Migración única: renombra secciones numéricas a letras en la base de datos.
 *
 * Convierte: 7-1 → 7-A, 7-2 → 7-B, ... (1→A, 2→B, 3→C, 4→D, 5→E, 6→F)
 * Elimina cualquier sección que no tenga letra correspondiente según el
 * conteo real del colegio (ej: 12-4, 12-5, 12-6 no existen realmente).
 * También actualiza el campo `seccion` de usuarios que tengan formato viejo.
 *
 * Uso: node --experimental-vm-modules scripts/migrar-secciones.js
 *   o:  npm run migrar-secciones   (si lo agregás en package.json)
 */
import 'dotenv/config'
import { bd, cerrar, COLECCIONES } from '../api/_lib/db.js'

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F']
const LETRAS_POR_NIVEL = { 7: 5, 8: 6, 9: 5, 10: 5, 11: 5, 12: 3 }

/** Convierte '10-2' en '10-B'. Devuelve null si no tiene letra equivalente. */
function migrarSeccion(vieja) {
  const m = /^(\d+)-(\d+)$/.exec(vieja)
  if (!m) return null // ya es letra o formato raro
  const nivel = Number(m[1])
  const num = Number(m[2])
  const maxLetras = LETRAS_POR_NIVEL[nivel]
  if (!maxLetras || num < 1 || num > maxLetras) return null
  return `${nivel}-${LETRAS[num - 1]}`
}

async function main() {
  const base = await bd()
  const horarios = base.collection(COLECCIONES.horarios)
  const usuarios = base.collection(COLECCIONES.usuarios)

  // ── Horarios ──────────────────────────────────────────────────────────────
  const todos = await horarios.find({}).toArray()
  console.log(`\nHorarios en la base: ${todos.length}`)

  let renombrados = 0
  let borrados = 0
  let yaCorrectos = 0

  for (const doc of todos) {
    const nueva = migrarSeccion(doc.seccion)
    if (nueva === null && /[A-F]/.test(doc.seccion)) {
      // Ya tiene formato de letra, no tocar
      yaCorrectos++
      console.log(`  ✓ ${doc.seccion} — ya está bien`)
      continue
    }
    if (nueva === null) {
      // No tiene equivalente en el nuevo esquema → borrar
      await horarios.deleteOne({ _id: doc._id })
      borrados++
      console.log(`  ✗ ${doc.seccion} — borrado (sin equivalente en letras)`)
      continue
    }
    // Hay equivalente → renombrar (con cuidado: si ya existe la versión en letra, borrar la vieja)
    const existe = await horarios.findOne({ seccion: nueva })
    if (existe) {
      await horarios.deleteOne({ _id: doc._id })
      borrados++
      console.log(`  ✗ ${doc.seccion} — borrado (ya existe ${nueva})`)
    } else {
      await horarios.updateOne({ _id: doc._id }, { $set: { seccion: nueva } })
      renombrados++
      console.log(`  → ${doc.seccion} renombrado a ${nueva}`)
    }
  }

  console.log(`\nHorarios: ${renombrados} renombrados, ${borrados} borrados, ${yaCorrectos} ya correctos.`)

  // ── Usuarios con sección numérica ─────────────────────────────────────────
  const usersViejos = await usuarios
    .find({ seccion: /^\d+-\d+$/ })
    .toArray()
  console.log(`\nUsuarios con sección numérica: ${usersViejos.length}`)

  let usersActualizados = 0
  let usersSinEquivalente = 0

  for (const u of usersViejos) {
    const nueva = migrarSeccion(u.seccion)
    if (nueva) {
      await usuarios.updateOne({ _id: u._id }, { $set: { seccion: nueva } })
      usersActualizados++
      console.log(`  → ${u.correo}: ${u.seccion} → ${nueva}`)
    } else {
      // Sección inválida: limpiarla (mejor que dejar una sección que no existe)
      await usuarios.updateOne({ _id: u._id }, { $set: { seccion: null } })
      usersSinEquivalente++
      console.log(`  ⚠ ${u.correo}: ${u.seccion} sin equivalente → seccion: null`)
    }
  }

  console.log(`\nUsuarios: ${usersActualizados} actualizados, ${usersSinEquivalente} sin equivalente (seccion → null).`)
  console.log('\nMigración completa.')
}

main()
  .catch((e) => {
    console.error('Error en la migración:', e.message)
    process.exitCode = 1
  })
  .finally(() => cerrar())
