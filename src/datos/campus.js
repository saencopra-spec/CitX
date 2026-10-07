/**
 * Geometria del mapa del campus (datos de ejemplo).
 *
 * La informacion de cada lugar (nombre, descripcion, horario, si es
 * restringido) vive en MongoDB y se edita desde el panel. Aqui solo queda la
 * forma de cada zona, ligada al lugar por su `clave`.
 *
 * El lienzo mide 1000 x 720. El norte queda arriba y la entrada abajo.
 */

export const LIENZO = { ancho: 1000, alto: 720 }

export const ZONAS = [
  // Franja norte: naturaleza y produccion
  {
    clave: 'bosque',
    etiqueta: 'El bosque',
    d: 'M40 70 Q60 32 120 36 L250 30 Q318 34 326 88 L330 160 Q324 196 280 198 L90 200 Q42 196 38 150 Z',
  },
  {
    clave: 'cacaotal',
    etiqueta: 'Cacaotal',
    x: 350,
    y: 38,
    w: 210,
    h: 160,
    r: 18,
  },
  {
    clave: 'armonia',
    etiqueta: 'Armonía',
    x: 580,
    y: 38,
    w: 200,
    h: 160,
    r: 18,
  },
  {
    clave: 'veterinaria',
    etiqueta: 'Veterinaria',
    x: 800,
    y: 52,
    w: 170,
    h: 132,
    r: 14,
  },

  // Franja central: aulas y servicios
  {
    clave: 'preescolar',
    etiqueta: 'Preescolar',
    x: 40,
    y: 240,
    w: 150,
    h: 100,
    r: 14,
  },
  {
    clave: 'primaria',
    etiqueta: 'Primaria',
    x: 40,
    y: 355,
    w: 150,
    h: 130,
    r: 14,
  },
  {
    clave: 'secundaria',
    etiqueta: 'Secundaria',
    x: 215,
    y: 240,
    w: 250,
    h: 110,
    r: 14,
  },
  {
    clave: 'laboratorios',
    etiqueta: 'Laboratorios',
    x: 215,
    y: 365,
    w: 160,
    h: 120,
    r: 14,
  },
  {
    clave: 'talleres',
    etiqueta: 'Talleres',
    x: 390,
    y: 365,
    w: 75,
    h: 120,
    r: 12,
  },
  {
    clave: 'plaza',
    etiqueta: 'Plaza central',
    x: 490,
    y: 240,
    w: 170,
    h: 155,
    r: 60,
  },
  { clave: 'soda', etiqueta: 'Soda', x: 490, y: 410, w: 85, h: 75, r: 12 },
  {
    clave: 'enfermeria',
    etiqueta: 'Enfermería',
    x: 585,
    y: 410,
    w: 75,
    h: 75,
    r: 12,
  },
  {
    clave: 'bienestar',
    etiqueta: 'Bienestar',
    x: 685,
    y: 240,
    w: 110,
    h: 85,
    r: 12,
  },
  {
    clave: 'zona-recreativa',
    etiqueta: 'Zona de descanso',
    x: 685,
    y: 340,
    w: 110,
    h: 145,
    r: 22,
  },
  {
    clave: 'canchas',
    etiqueta: 'Canchas',
    x: 815,
    y: 230,
    w: 160,
    h: 150,
    r: 12,
  },
  {
    clave: 'piscina',
    etiqueta: 'Piscina',
    x: 815,
    y: 395,
    w: 160,
    h: 90,
    r: 12,
  },

  // Franja sur: administracion y acceso
  {
    clave: 'parqueo',
    etiqueta: 'Parqueo',
    x: 40,
    y: 530,
    w: 230,
    h: 150,
    r: 14,
  },
  {
    clave: 'direccion',
    etiqueta: 'Dirección',
    x: 300,
    y: 530,
    w: 150,
    h: 85,
    r: 12,
  },
  { clave: 'bodega', etiqueta: 'Bodega', x: 300, y: 630, w: 150, h: 50, r: 10 },
  {
    clave: 'coordinacion',
    etiqueta: 'Coordinación',
    x: 470,
    y: 530,
    w: 130,
    h: 85,
    r: 12,
  },
  {
    clave: 'entrada',
    etiqueta: 'Entrada',
    x: 470,
    y: 630,
    w: 130,
    h: 50,
    r: 10,
  },
  {
    clave: 'transporte',
    etiqueta: 'Transporte',
    x: 620,
    y: 530,
    w: 175,
    h: 150,
    r: 14,
  },
  {
    clave: 'cuarto-electrico',
    etiqueta: 'Cuarto eléctrico',
    x: 815,
    y: 530,
    w: 160,
    h: 70,
    r: 10,
  },
  {
    clave: 'bicicletas',
    etiqueta: 'Bicicletas',
    x: 815,
    y: 615,
    w: 160,
    h: 65,
    r: 10,
  },
]

/** Centro aproximado de cada zona, para la etiqueta y para hacer zoom. */
export function centroDe(zona) {
  if (zona.d) {
    const numeros = zona.d.match(/-?\d+(\.\d+)?/g).map(Number)
    const xs = numeros.filter((_, i) => i % 2 === 0)
    const ys = numeros.filter((_, i) => i % 2 === 1)
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
  }
  return { x: zona.x + zona.w / 2, y: zona.y + zona.h / 2 }
}

/** Caja que rodea la zona. */
export function cajaDe(zona) {
  if (zona.d) {
    const numeros = zona.d.match(/-?\d+(\.\d+)?/g).map(Number)
    const xs = numeros.filter((_, i) => i % 2 === 0)
    const ys = numeros.filter((_, i) => i % 2 === 1)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
  }
  return { x: zona.x, y: zona.y, w: zona.w, h: zona.h }
}

export const CATEGORIAS = {
  academico: { nombre: 'Aulas y laboratorios', corto: 'Académico' },
  servicios: { nombre: 'Servicios al estudiante', corto: 'Servicios' },
  alimentacion: { nombre: 'Comida', corto: 'Comida' },
  deporte: { nombre: 'Deporte', corto: 'Deporte' },
  naturaleza: { nombre: 'Naturaleza y producción', corto: 'Naturaleza' },
  administracion: { nombre: 'Administración', corto: 'Administración' },
  acceso: { nombre: 'Entrada y transporte', corto: 'Acceso' },
}
