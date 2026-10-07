/**
 * Datos de ejemplo para la presentacion de CitX.
 *
 * No se usan nombres de personas reales. La distribucion de lugares es
 * verosimil pero inventada: no hay un plano oficial del campus.
 */
import { DIAS_LECTIVOS, LECCIONES } from '../compartido/jornada.js'

export const CUENTAS_DEMO = [
  {
    nombre: 'Estudiante de prueba',
    correo: 'estudiante@citx.demo',
    contrasena: 'Estudiante2026',
    rol: 'estudiante',
    seccion: '10-1',
  },
  {
    nombre: 'Profesora de prueba',
    correo: 'profesor@citx.demo',
    contrasena: 'Profesor2026',
    rol: 'profesor',
    seccion: null,
  },
  {
    nombre: 'Personal administrativo de prueba',
    correo: 'administrativo@citx.demo',
    contrasena: 'Personal2026',
    rol: 'administrativo',
    seccion: null,
  },
  {
    nombre: 'Administración CIT',
    correo: 'admin@citx.demo',
    contrasena: 'Admin2026',
    rol: 'admin',
    seccion: null,
  },
  {
    nombre: 'Soda Armonía',
    correo: 'soda@citx.demo',
    contrasena: 'Soda2026',
    rol: 'soda',
    seccion: null,
  },
]

export const PRODUCTOS = [
  // Desayunos
  {
    nombre: 'Gallo pinto con huevo',
    categoria: 'desayunos',
    precio: 1800,
    descripcion:
      'Gallo pinto recién hecho, huevo al gusto, natilla y una tortilla.',
    // Foto: James Diggans, CC BY 2.0 (Wikimedia Commons).
    foto: '/fotos/gallo-pinto.webp',
    estrellas: [5, 5, 4, 5],
  },
  {
    nombre: 'Tostadas francesas con banano',
    categoria: 'desayunos',
    precio: 1700,
    descripcion:
      'Dos tostadas francesas con banano, arándanos y un toque de miel.',
    foto: '/fotos/tostadas-francesas.webp',
    estrellas: [5, 4, 4],
  },
  {
    nombre: 'Tostada de aguacate y huevo',
    categoria: 'desayunos',
    precio: 1600,
    descripcion:
      'Pan integral tostado, aguacate majado, huevo duro y semillas.',
    foto: '/fotos/tostada-aguacate.webp',
    estrellas: [4, 4, 5],
  },
  {
    nombre: 'Huevo frito sobre pan integral',
    categoria: 'desayunos',
    precio: 1200,
    descripcion: 'Huevo frito con yema suave sobre pan integral de la casa.',
    foto: '/fotos/huevo-pan-integral.webp',
    estrellas: [4, 3, 4],
  },
  {
    nombre: 'Yogur con fresas y granola',
    categoria: 'desayunos',
    precio: 1100,
    descripcion: 'Yogur natural con fresas de la huerta y granola crujiente.',
    foto: '/fotos/yogur-fresas.webp',
    estrellas: [5, 4],
  },
  {
    nombre: 'Plato de frutas',
    categoria: 'desayunos',
    precio: 1300,
    descripcion: 'Papaya, piña, banano y fresas picadas, según la temporada.',
    foto: '/fotos/bowl-frutas.webp',
    estrellas: [4, 5, 4],
  },
  // Almuerzos
  {
    nombre: 'Casado con pollo',
    categoria: 'almuerzos',
    precio: 3300,
    descripcion:
      'Arroz, frijoles, pollo en salsa, ensalada verde, picadillo del día y plátano maduro.',
    foto: '/fotos/casado-pollo.webp',
    estrellas: [5, 4, 4, 5, 4],
  },
  {
    nombre: 'Pasta en salsa de tomate',
    categoria: 'almuerzos',
    precio: 2600,
    descripcion: 'Pasta corta en salsa de tomate casera con queso rallado.',
    foto: '/fotos/pasta-tomate.webp',
    estrellas: [4, 4, 3],
  },
  {
    nombre: 'Hamburguesa de res con papas',
    categoria: 'almuerzos',
    precio: 3200,
    descripcion:
      'Torta de res a la plancha, queso, lechuga, tomate y papas a la francesa.',
    foto: '/fotos/hamburguesa.webp',
    estrellas: [5, 5, 4, 4],
  },
  {
    nombre: 'Ensalada de pollo',
    categoria: 'almuerzos',
    precio: 2800,
    descripcion:
      'Lechuga, pollo a la plancha, maíz dulce, huevo y aderezo de la casa.',
    foto: '/fotos/ensalada-pollo.webp',
    estrellas: [4, 4],
  },
  {
    nombre: 'Arroz con camarones',
    categoria: 'almuerzos',
    precio: 3500,
    descripcion:
      'Arroz con camarones y vegetales, acompañado de ensalada. Solo los viernes.',
    foto: '/fotos/arroz-camarones.webp',
    estrellas: [5, 4, 5],
  },
  {
    nombre: 'Pollo frito con ensalada',
    categoria: 'almuerzos',
    precio: 2900,
    descripcion: 'Dos piezas de pollo frito, ensalada de repollo y tortilla.',
    foto: '/fotos/pollo-frito.webp',
    estrellas: [4, 5, 4],
  },
  // Bebidas
  {
    nombre: 'Café con leche',
    categoria: 'bebidas',
    precio: 700,
    descripcion:
      'Café chorreado con leche caliente. Pedilo con o sin azúcar en la nota.',
    foto: '/fotos/cafe-leche.webp',
    estrellas: [5, 4, 5],
  },
  {
    nombre: 'Té frío de limón',
    categoria: 'bebidas',
    precio: 600,
    descripcion: 'Té negro frío con limón, hecho en la soda. Vaso de 400 ml.',
    foto: '/fotos/te-frio.webp',
    estrellas: [4, 4, 4],
  },
  {
    nombre: 'Jugo de naranja natural',
    categoria: 'bebidas',
    precio: 900,
    descripcion: 'Naranjas exprimidas al momento, sin azúcar añadida.',
    foto: '/fotos/jugo-naranja.webp',
    estrellas: [5, 5],
  },
  {
    nombre: 'Batido de fresa',
    categoria: 'bebidas',
    precio: 1100,
    descripcion: 'Fresas de la huerta Armonía, en agua o en leche.',
    foto: '/fotos/batido-fresa.webp',
    estrellas: [5, 4, 4],
  },
  {
    nombre: 'Limonada con hierbabuena',
    categoria: 'bebidas',
    precio: 700,
    descripcion: 'Limonada fría con hojas de hierbabuena de la huerta.',
    foto: '/fotos/limonada-hierbabuena.webp',
    estrellas: [4, 5],
  },
  {
    nombre: 'Batido de banano',
    categoria: 'bebidas',
    precio: 1000,
    descripcion: 'Banano maduro con leche y un poco de canela.',
    foto: '/fotos/batido-banano.webp',
    estrellas: [4, 4],
    disponible: false,
  },
  // Snacks
  {
    nombre: 'Galleta de chocolate',
    categoria: 'snacks',
    precio: 500,
    descripcion:
      'Galleta grande con trozos de chocolate, horneada en la mañana.',
    foto: '/fotos/galletas-chocolate.webp',
    estrellas: [5, 5, 4],
  },
  {
    nombre: 'Dona con chispas',
    categoria: 'snacks',
    precio: 700,
    descripcion: 'Dona cubierta de chocolate con chispas de colores.',
    foto: '/fotos/dona.webp',
    estrellas: [4, 3, 4],
  },
  {
    nombre: 'Helado de cono',
    categoria: 'snacks',
    precio: 600,
    descripcion:
      'Helado de vainilla o fresa en cono. Pedí el sabor en la nota.',
    foto: '/fotos/helado-cono.webp',
    estrellas: [5, 4],
  },
  {
    nombre: 'Sandía en trozos',
    categoria: 'snacks',
    precio: 500,
    descripcion: 'Vasito de sandía fría picada.',
    foto: '/fotos/sandia.webp',
    estrellas: [4],
  },
  {
    nombre: 'Porción de pizza',
    categoria: 'snacks',
    precio: 1300,
    descripcion: 'Porción de pizza de jamón y queso, recién salida del horno.',
    foto: '/fotos/pizza-porcion.webp',
    estrellas: [4, 5, 4, 4],
  },
  {
    nombre: 'Sándwich tostado de jamón y queso',
    categoria: 'snacks',
    precio: 1200,
    descripcion: 'Pan blanco tostado con jamón, queso derretido y mayonesa.',
    foto: '/fotos/sandwich-tostado.webp',
    estrellas: [4, 4, 3],
  },
]

/** Eventos con fechas cercanas al dia en que se corre el script. */
export const EVENTOS = [
  {
    dias: 1,
    hora: '10:00',
    titulo: 'Charla: uso responsable de redes sociales',
    descripcion:
      'Bienestar estudiantil conversa sobre privacidad, ciberacoso y cómo cuidarse en redes. Traé tus preguntas.',
    lugarClave: 'secundaria',
    todos: false,
    secciones: ['7-1', '7-2', '7-3', '8-1', '8-2', '8-3', '9-1', '9-2', '9-3'],
    imagen: null,
  },
  {
    dias: 2,
    hora: '08:00',
    titulo: 'ExpoTécnica CIT 2026',
    descripcion:
      'Las especialidades presentan sus proyectos en El Chirel. Hay jurado externo y la entrada es libre para familias.',
    lugarClave: 'el-chirel',
    todos: true,
    secciones: [],
    imagen: '/fotos/portada-guia.webp',
  },
  {
    dias: 3,
    hora: '13:20',
    titulo: 'Torneo interseccional de fútbol sala',
    descripcion:
      'Arrancan los cuartos de final. Cada sección puede llevar a su barra, con respeto.',
    lugarClave: 'deportes',
    todos: true,
    secciones: [],
    imagen: '/fotos/lugar-canchas.webp',
  },
  {
    dias: 6,
    hora: '09:20',
    titulo: 'Visita a Armonía',
    descripcion:
      'Recorrido por el proyecto de agricultura orgánica con la profesora de ciencias. Usá zapato cerrado y traé repelente.',
    lugarClave: 'armonia',
    todos: false,
    secciones: ['10-1', '10-2'],
    imagen: null,
  },
  {
    dias: 8,
    hora: '10:00',
    titulo: 'Simulacro de evacuación',
    descripcion:
      'Al sonar la alarma, salí con calma con tu sección y seguí al profesor hasta la cancha natural.',
    lugarClave: 'cancha-natural',
    todos: true,
    secciones: [],
    imagen: null,
  },
  {
    dias: 9,
    hora: '12:40',
    titulo: 'Taller de primeros auxilios',
    descripcion:
      'La enfermería enseña RCP básico y qué hacer ante desmayos, cortadas y quemaduras.',
    lugarClave: 'enfermeria',
    todos: false,
    secciones: ['10-1', '11-1', '11-2'],
    imagen: '/fotos/lugar-enfermeria.webp',
  },
  {
    dias: 14,
    hora: '08:00',
    titulo: 'Feria vocacional de especialidades',
    descripcion:
      'Noveno conoce las ocho especialidades técnicas antes de elegir. Cada especialidad tiene un stand.',
    lugarClave: 'el-chirel',
    todos: false,
    secciones: ['9-1', '9-2', '9-3', '9-4', '9-5', '9-6'],
    imagen: null,
  },
]

export const MATERIAS = [
  // Especialidades tecnicas (10.° a 12.°)
  {
    tipo: 'especialidad',
    clave: 'ciberseguridad',
    nombre: 'Ciberseguridad',
    descripcion:
      'Aprendés a proteger redes, equipos y datos: configuración segura de sistemas, detección de vulnerabilidades, respuesta ante incidentes y la parte legal y ética del oficio.',
  },
  {
    tipo: 'especialidad',
    clave: 'inteligencia-artificial',
    nombre: 'Inteligencia Artificial',
    descripcion:
      'Programación en Python, manejo y análisis de datos, y modelos de aprendizaje automático aplicados a problemas reales, siempre con una mirada crítica sobre su uso.',
  },
  {
    tipo: 'especialidad',
    clave: 'electronica-industrial',
    nombre: 'Electrónica Industrial',
    descripcion:
      'Circuitos eléctricos y electrónicos, sensores, controladores lógicos programables (PLC) y mantenimiento de equipo industrial, con énfasis en la seguridad eléctrica.',
  },
  {
    tipo: 'especialidad',
    clave: 'desarrollo-software',
    nombre: 'Desarrollo de Aplicaciones de Software',
    descripcion:
      'Diseño y programación de aplicaciones web y móviles, bases de datos, control de versiones y trabajo en equipo con metodologías ágiles, como se hace en la industria.',
  },
  {
    tipo: 'especialidad',
    clave: 'gestion-calidad',
    nombre: 'Gestión de la Calidad',
    descripcion:
      'Sistemas de gestión basados en normas como ISO 9001, control estadístico de procesos, auditorías internas y mejora continua en empresas de bienes y servicios.',
  },
  {
    tipo: 'especialidad',
    clave: 'administracion',
    nombre: 'Administración',
    descripcion:
      'Funcionamiento de una empresa: contabilidad básica, talento humano, mercadeo, servicio al cliente y herramientas de oficina para la gestión diaria.',
  },
  {
    tipo: 'especialidad',
    clave: 'logistica',
    nombre: 'Logística y Distribución',
    descripcion:
      'Cómo llegan los productos de un lugar a otro: inventarios, bodegas, transporte, cadena de abastecimiento y los trámites del comercio internacional.',
  },
  {
    tipo: 'especialidad',
    clave: 'diseno-grafico',
    nombre: 'Diseño Gráfico Multimedia',
    descripcion:
      'Diseño gráfico, ilustración digital, fotografía, edición de video y animación para comunicar ideas en medios impresos y digitales.',
  },
  // Talleres exploratorios (7.° a 9.°)
  {
    tipo: 'taller',
    clave: 'dibujo-tic',
    nombre: 'Dibujo Artístico y TIC',
    descripcion:
      'Dibujo a mano y herramientas digitales para crear ilustraciones y presentaciones.',
  },
  {
    tipo: 'taller',
    clave: 'gestion-empresarial',
    nombre: 'Gestión Empresarial',
    descripcion:
      'Primeros pasos para emprender: ideas de negocio, costos y atención al cliente.',
  },
  {
    tipo: 'taller',
    clave: 'montajes-electricos',
    nombre: 'Montajes Eléctricos',
    descripcion:
      'Instalaciones eléctricas básicas y uso seguro de herramientas y medidores.',
  },
  {
    tipo: 'taller',
    clave: 'robotica',
    nombre: 'Robótica',
    descripcion:
      'Armado y programación de robots sencillos con sensores y motores.',
  },
  // Materias academicas
  {
    tipo: 'academica',
    clave: 'espanol',
    nombre: 'Español',
    descripcion: 'Lectura, redacción y análisis de obras literarias.',
  },
  {
    tipo: 'academica',
    clave: 'matematicas',
    nombre: 'Matemáticas',
    descripcion: 'Álgebra, geometría, funciones y estadística.',
  },
  {
    tipo: 'academica',
    clave: 'ciencias',
    nombre: 'Ciencias',
    descripcion: 'Biología, física y química integradas, de 7.° a 9.°.',
  },
  {
    tipo: 'academica',
    clave: 'biologia',
    nombre: 'Biología',
    descripcion: 'Ciencias de la vida, de 10.° a 12.°.',
  },
  {
    tipo: 'academica',
    clave: 'fisica',
    nombre: 'Física',
    descripcion: 'Movimiento, energía y electricidad, de 10.° a 12.°.',
  },
  {
    tipo: 'academica',
    clave: 'quimica',
    nombre: 'Química',
    descripcion: 'Materia y sus cambios, de 10.° a 12.°.',
  },
  {
    tipo: 'academica',
    clave: 'estudios-sociales',
    nombre: 'Estudios Sociales',
    descripcion: 'Historia y geografía de Costa Rica y del mundo.',
  },
  {
    tipo: 'academica',
    clave: 'civica',
    nombre: 'Educación Cívica',
    descripcion: 'Derechos, deberes y participación ciudadana.',
  },
  {
    tipo: 'academica',
    clave: 'ingles',
    nombre: 'Inglés',
    descripcion: 'Comunicación oral y escrita, con énfasis en conversación.',
  },
  {
    tipo: 'academica',
    clave: 'portugues',
    nombre: 'Portugués',
    descripcion:
      'Segunda lengua extranjera: comunicación básica y cultura lusófona.',
  },
  {
    tipo: 'academica',
    clave: 'educacion-fisica',
    nombre: 'Educación Física',
    descripcion: 'Deporte, natación y hábitos de vida saludable.',
  },
  {
    tipo: 'academica',
    clave: 'artes',
    nombre: 'Artes Plásticas',
    descripcion: 'Expresión artística con distintas técnicas y materiales.',
  },
  {
    tipo: 'academica',
    clave: 'musica',
    nombre: 'Educación Musical',
    descripcion: 'Lenguaje musical, canto e instrumentos.',
  },
  {
    tipo: 'academica',
    clave: 'orientacion',
    nombre: 'Orientación',
    descripcion: 'Autoconocimiento, convivencia y proyecto de vida.',
  },
]

/** Especialidad de ejemplo de cada seccion de 10.° a 12.°. */
const ESPECIALIDAD_SECCION = {
  '10-1': 'Desarrollo de Software',
  '10-2': 'Ciberseguridad',
  '11-1': 'Inteligencia Artificial',
  '11-2': 'Electrónica Industrial',
  '12-1': 'Diseño Gráfico Multimedia',
  '12-2': 'Logística y Distribución',
}

const TALLER_SECCION = {
  '7-1': 'Robótica',
  '7-2': 'Dibujo Artístico y TIC',
  '8-1': 'Montajes Eléctricos',
  '9-1': 'Gestión Empresarial',
}

/**
 * Arma un horario semanal creible para una seccion: 11 lecciones por dia,
 * con las materias repartidas en bloques de dos lecciones seguidas.
 */
export function horarioDeEjemplo(seccion) {
  const nivel = Number(seccion.split('-')[0])
  const tecnica = ESPECIALIDAD_SECCION[seccion]
  const taller = TALLER_SECCION[seccion] ?? 'Robótica'
  const aulaBase = `${nivel === 7 || nivel === 8 || nivel === 9 ? 'S1' : 'S2'}-${seccion.replace('-', '')}`

  const bloques =
    nivel >= 10
      ? [
          ['Matemáticas', aulaBase],
          ['Español', aulaBase],
          [tecnica ?? 'Especialidad técnica', 'Lab 2'],
          ['Inglés', 'Idiomas 1'],
          ['Química', 'Lab ciencias'],
          [tecnica ?? 'Especialidad técnica', 'Lab 2'],
          ['Estudios Sociales', aulaBase],
          ['Física', 'Lab ciencias'],
          ['Portugués', 'Idiomas 2'],
          ['Educación Física', 'Canchas'],
          [tecnica ?? 'Especialidad técnica', 'Lab 3'],
          ['Biología', 'Lab ciencias'],
          ['Educación Cívica', aulaBase],
          ['Orientación', 'Bienestar'],
        ]
      : [
          ['Matemáticas', aulaBase],
          ['Español', aulaBase],
          ['Ciencias', 'Lab ciencias'],
          ['Inglés', 'Idiomas 1'],
          [taller, 'Talleres'],
          ['Estudios Sociales', aulaBase],
          ['Portugués', 'Idiomas 2'],
          ['Educación Física', 'Canchas'],
          ['Artes Plásticas', 'Artes'],
          ['Educación Musical', 'Música'],
          ['Educación Cívica', aulaBase],
          [taller, 'Talleres'],
          ['Orientación', 'Bienestar'],
          ['Matemáticas', aulaBase],
        ]

  const dias = {}
  DIAS_LECTIVOS.forEach((dia, d) => {
    const celdas = []
    let i = d * 3
    while (celdas.length < LECCIONES.length) {
      const [materia, aula] = bloques[i % bloques.length]
      celdas.push({ materia, aula })
      if (celdas.length < LECCIONES.length) celdas.push({ materia, aula })
      i++
    }
    dias[dia] = celdas
  })
  return { seccion, dias }
}

export const SECCIONES_CON_HORARIO = [
  '7-1',
  '7-2',
  '8-1',
  '9-1',
  '10-1',
  '10-2',
  '11-1',
  '11-2',
  '12-1',
  '12-2',
]

export const OBJETOS = [
  {
    titulo: 'Audífonos negros de diadema',
    descripcion:
      'Audífonos inalámbricos negros, con un rayón en el lado derecho.',
    lugar: 'Área de juegos',
    diasAtras: 1,
    foto: '/fotos/objeto-audifonos.webp',
  },
  {
    titulo: 'Botella verde de metal',
    descripcion: 'Botella térmica verde mate, sin calcomanías.',
    lugar: 'Deportes',
    diasAtras: 2,
    foto: '/fotos/objeto-botella.webp',
  },
  {
    titulo: 'Mochila azul',
    descripcion:
      'Mochila azul oscuro con un parche amarillo al frente. Tiene cuadernos adentro.',
    lugar: 'Parqueo general',
    diasAtras: 2,
    foto: '/fotos/objeto-mochila.webp',
  },
  {
    titulo: 'Calculadora',
    descripcion: 'Calculadora de escritorio con rollo de papel.',
    lugar: 'Secundaria',
    diasAtras: 3,
    foto: '/fotos/objeto-calculadora.webp',
  },
  {
    titulo: 'Anteojos con marco café',
    descripcion: 'Anteojos de lectura con marco café y patas doradas.',
    lugar: 'Soda',
    diasAtras: 4,
    foto: '/fotos/objeto-anteojos.webp',
  },
  {
    titulo: 'Jacket de mezclilla',
    descripcion: 'Jacket azul de mezclilla con cuello de pana café, talla M.',
    lugar: 'El Chirel',
    diasAtras: 5,
    foto: '/fotos/objeto-jacket.webp',
  },
  {
    titulo: 'Reloj inteligente blanco',
    descripcion: 'Reloj con correa blanca de silicón. Está apagado.',
    lugar: 'Deportes',
    diasAtras: 6,
    foto: '/fotos/objeto-reloj.webp',
  },
]

export const ENFERMERIA = {
  clave: 'principal',
  abre: '07:00',
  cierra: '15:30',
  extension: 'Extensión 112 (número de ejemplo)',
  servicios: [
    'Primeros auxilios: golpes, cortadas, raspones y quemaduras leves.',
    'Control de presión arterial, temperatura y glicemia.',
    'Espacio para descansar si te sentís mal, mientras llaman a tu familia.',
    'Seguimiento de estudiantes con alergias, asma o diabetes.',
    'Charlas de salud y prevención para las secciones.',
  ],
  avisos: [
    'La enfermería no receta medicamentos. Si tomás alguno, tu familia debe avisar por escrito.',
    'Si te sentís mal en clase, pedile permiso al profesor y venite acompañado.',
  ],
  emergencia: [
    'Mantené la calma y avisá al profesor o al adulto más cercano.',
    'Si la persona no responde o no respira, llamen al 9-1-1 de inmediato.',
    'No muevan a la persona si se golpeó la cabeza, el cuello o la espalda.',
    'Manden a alguien a la enfermería o a la dirección para que llegue ayuda.',
    'Quedate con la persona hasta que llegue el personal de salud.',
  ],
}
