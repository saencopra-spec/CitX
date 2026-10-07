/**
 * Descarga al proyecto las fotos que usa CitX.
 *
 * Todas son de Unsplash (https://unsplash.com/license): se pueden usar gratis,
 * tambien en proyectos comerciales, sin pedir permiso. Se guardan dentro de
 * public/fotos para no depender de enlaces externos.
 *
 * Uso: npm run fotos
 */
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'fotos'
)

/** nombre de archivo -> identificador de la foto en Unsplash */
export const FOTOS = {
  // Desayunos
  'tostadas-francesas': '1484723091739-30a097e8f929',
  'tostada-aguacate': '1541519227354-08fa5d50c44d',
  'huevo-pan-integral': '1525351484163-7529414344d8',
  'yogur-fresas': '1488477181946-6428a0291777',
  'bowl-frutas': '1490474418585-ba9bad8fd0ea',
  // Almuerzos
  'casado-pollo': '1547592180-85f173990554',
  'pasta-tomate': '1621996346565-e3dbc646d9a9',
  hamburguesa: '1568901346375-23c9450c58cd',
  'ensalada-pollo': '1546069901-ba9599a7e63c',
  'arroz-camarones': '1559847844-5315695dadae',
  'pollo-frito': '1626082927389-6cd097cdc6ec',
  // Bebidas
  'cafe-leche': '1509042239860-f550ce710b93',
  'te-frio': '1556679343-c7306c1976bc',
  'jugo-naranja': '1600271886742-f049cd451bba',
  'batido-fresa': '1497534446932-c925b458314e',
  'limonada-hierbabuena': '1513558161293-cdaf765ed2fd',
  'batido-banano': '1505252585461-04db1eb84625',
  // Snacks
  'galletas-chocolate': '1558961363-fa8fdf82db35',
  dona: '1551024601-bec78aea704b',
  'helado-cono': '1497034825429-c343d7c6a68f',
  sandia: '1587049352846-4a222e784d38',
  'pizza-porcion': '1565299624946-b28f40a0ae38',
  'sandwich-tostado': '1528735602780-2552fd46c7af',
  // Lugares y portadas
  'portada-guia': '1509062522246-3755977927d7',
  'portada-soda': '1504674900247-0877df9cc836',
  'lugar-bosque': '1448375240586-882707db888b',
  'lugar-aula': '1580582932707-520aed937b7b',
  'lugar-laboratorio': '1532094349884-543bc11b234d',
  'lugar-piscina': '1576013551627-0cc20b96c2a7',
  'lugar-canchas': '1546519638-68e109498ffc',
  'lugar-enfermeria': '1576091160550-2173dba999ef',
  'lugar-soda': '1453614512568-c4024d13c247',
  'lugar-taller': '1581091226825-a6a2a5aee158',
  // Objetos perdidos de ejemplo
  'objeto-audifonos': '1505740420928-5e560c06d30e',
  'objeto-reloj': '1523275335684-37898b6baf30',
  'objeto-mochila': '1553062407-98eeb64c6a62',
  'objeto-anteojos': '1574258495973-f010dfbb5371',
  'objeto-botella': '1602143407151-7111542de6e8',
  'objeto-jacket': '1611312449408-fcece27cdbb7',
  'objeto-calculadora': '1564939558297-fc396f18e5c7',
}

async function existe(ruta) {
  try {
    return (await stat(ruta)).size > 1000
  } catch {
    return false
  }
}

async function main() {
  await mkdir(raiz, { recursive: true })
  let nuevas = 0
  for (const [nombre, id] of Object.entries(FOTOS)) {
    const destino = join(raiz, `${nombre}.webp`)
    if (await existe(destino)) continue
    // Unsplash recorta y comprime en su servidor: bajamos solo lo necesario.
    const ancho = nombre.startsWith('portada') ? 900 : 640
    const alto = Math.round(ancho * 0.72)
    const url = `https://images.unsplash.com/photo-${id}?w=${ancho}&h=${alto}&fit=crop&q=62&fm=webp`
    const r = await fetch(url)
    if (!r.ok) {
      console.error(`No se pudo bajar ${nombre} (${r.status})`)
      continue
    }
    await writeFile(destino, Buffer.from(await r.arrayBuffer()))
    nuevas++
    console.log(`Lista: ${nombre}.webp`)
  }
  console.log(
    `Fotos nuevas: ${nuevas}. Total en la lista: ${Object.keys(FOTOS).length}.`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
