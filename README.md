# CitX

CitX es la aplicación web del Complejo Educativo CIT (La Asunción de Belén, Heredia, Costa Rica). Reúne en un solo lugar tres cosas que hoy se resuelven preguntando o haciendo fila:

- **Mapa interactivo** del campus, con búsqueda, filtros, lugares favoritos y áreas restringidas.
- **Guía digital**: próximos eventos, horario de clases, especialidades técnicas, objetos perdidos, recordatorios y enfermería.
- **Soda Armonía**: menú, carrito, pago simulado, código QR para retirar y estado del pedido en vivo.

Además tiene un **panel de administración** para la dirección y para el personal de la soda, y opciones de **accesibilidad** (tamaño de letra, alto contraste, modo oscuro, letra para dislexia, filtros para daltonismo, botones grandes y lectura en voz alta).

Proyecto de Desafío STEAM, categoría TIC aplicada a la informática, ExpoTécnica 2026.

- **Autores:** Sven Wengler Castrillo, Franco Sáenz Prado y Javier Alejandro Martínez Iriarte.
- **Tutor:** Sergio Marín Morales.
- Colegio Técnico Profesional CIT, CORVEC Heredia.

En producción: https://citx.vercel.app

## Tecnologías y por qué

| Parte         | Tecnología                                           | Por qué                                                                                            |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Interfaz      | Vue 3 con `<script setup>`, Vite, Vue Router y Pinia | Componentes claros y fáciles de explicar; Vite compila en segundos.                                |
| Lenguaje      | JavaScript                                           | Es el que el equipo domina y puede defender frente al jurado.                                      |
| Estilos       | CSS propio con variables                             | Control total del diseño y de los modos de accesibilidad, sin el aspecto genérico de un framework. |
| Animación     | GSAP y transiciones de Vue                           | Movimiento suave que se apaga si la persona pide reducir el movimiento.                            |
| Iconos        | lucide-vue-next                                      | Iconos livianos y consistentes.                                                                    |
| Servidor      | Vercel Functions (Node)                              | Se publica junto con la página, sin servidor que mantener.                                         |
| Base de datos | MongoDB Atlas (gratis) con el driver oficial         | Guarda documentos parecidos a los objetos de JavaScript.                                           |
| Sesión        | bcryptjs + JWT en cookie `httpOnly`                  | La contraseña nunca se guarda en texto plano y JavaScript del navegador no puede leer la sesión.   |
| Validación    | zod                                                  | Cada dato que llega al servidor se revisa, con mensajes en español.                                |
| Código QR     | qrcode                                               | Se genera en el teléfono, sin servicios externos.                                                  |
| Calidad       | ESLint, Prettier y Vitest                            | El código sigue un mismo estilo y la lógica crítica tiene pruebas.                                 |
| Instalable    | vite-plugin-pwa                                      | Se instala en el celular y el mapa abre aunque la señal sea mala.                                  |

### Decisiones que vale la pena conocer

- **Una sola función en `/api`.** El plan gratuito de Vercel cuenta cada archivo de `/api` como una función y permite pocas. Por eso `api/index.js` es la única entrada y adentro hay un enrutador (`api/_lib/enrutador.js`). Los módulos viven en `api/_rutas/`: el guion bajo hace que Vercel no los cuente.
- **Lógica compartida.** La carpeta `compartido/` tiene las reglas que usan tanto la app como el servidor: horas de Costa Rica, jornada y recreos, colones, validación de tarjetas, permisos por rol y estados del pedido. Así una regla se escribe una sola vez.
- **Horas siempre en Costa Rica.** El servidor de Vercel está en UTC; todas las fechas se calculan con la zona `America/Costa_Rica`.
- **Pedidos "en vivo" sin WebSockets.** Vercel no mantiene conexiones abiertas, así que la pantalla del pedido pregunta cada 5 segundos y deja de preguntar cuando la pestaña no está visible.
- **Fotos subidas desde el panel.** El navegador las comprime a unos 200 KB antes de enviarlas y se guardan en MongoDB.

## Cómo correrlo en la computadora

Necesitás Node.js 20 o más nuevo.

```bash
npm install
cp .env.example .env      # y llená MONGODB_URI y JWT_SECRET
npm run seed              # carga los datos de ejemplo y las cuentas de demostración
npx vercel dev            # levanta la página y la API juntas en http://localhost:3000
```

Solo la interfaz, sin API: `npm run dev`.

Otros comandos:

| Comando         | Para qué                                                                                |
| --------------- | --------------------------------------------------------------------------------------- |
| `npm run build` | Compila la versión de producción.                                                       |
| `npm run lint`  | Revisa el estilo del código.                                                            |
| `npm test`      | Corre las pruebas (totales, tarjetas, permisos, enfermería, horas, pedidos).            |
| `npm run seed`  | Carga o renueva los datos de ejemplo. Con `-- --limpiar-pedidos` también borra pedidos. |
| `npm run fotos` | Descarga de nuevo las fotos libres de Unsplash a `public/fotos`.                        |

## Variables de entorno

| Variable       | Qué es                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| `MONGODB_URI`  | Cadena de conexión de MongoDB Atlas (`mongodb+srv://...`).              |
| `MONGODB_DB`   | Nombre de la base. Por defecto `citx`.                                  |
| `JWT_SECRET`   | Clave larga y aleatoria para firmar las sesiones. Mínimo 32 caracteres. |
| `APP_TIMEZONE` | `America/Costa_Rica`.                                                   |

En local van en `.env` (que no se sube al repositorio). En Vercel se configuran en Settings, Environment Variables, o con `vercel env add`.

## Deploy

El proyecto está enlazado con Vercel (`citx`). Para publicar:

```bash
npx vercel deploy --prod
```

`vercel.json` reescribe `/api/*` hacia la función única y cualquier otra dirección hacia `index.html`, para que recargar una página de la app no dé error 404. También agrega encabezados de seguridad.

En MongoDB Atlas, el acceso de red tiene `0.0.0.0/0`: significa que se aceptan conexiones desde cualquier dirección de internet. Hace falta porque los servidores de Vercel cambian de dirección; la base sigue protegida por usuario y contraseña.

## Cuentas de demostración

| Rol                       | Correo                   | Contraseña     |
| ------------------------- | ------------------------ | -------------- |
| Estudiante (sección 10-1) | estudiante@citx.demo     | Estudiante2026 |
| Profesora                 | profesor@citx.demo       | Profesor2026   |
| Personal administrativo   | administrativo@citx.demo | Personal2026   |
| Administración            | admin@citx.demo          | Admin2026      |
| Soda                      | soda@citx.demo           | Soda2026       |

En la pantalla de inicio de sesión hay un botón "Cuentas para probar CitX" que llena el formulario con cualquiera de ellas.

**Pago de prueba:** tarjeta `4242 4242 4242 4242`, vence `12/30`, CVV `123`. La tarjeta `4000 0000 0000 0002` simula un rechazo del banco. En SINPE sirve cualquier comprobante de 6 a 25 dígitos. Ningún pago cobra dinero real.

Los lugares del mapa, el menú, los horarios y los eventos son datos de ejemplo: no existe un plano oficial del campus y los nombres de las cuentas no son de personas reales. Las fotos son de Unsplash, de uso libre.

## Cómo presentarlo en la Expo (3 minutos)

Lleven dos dispositivos: un celular con la cuenta de estudiante y una tablet o computadora con la cuenta de la soda.

1. **El problema (20 s).** Estudiantes nuevos no encuentran los lugares, se enteran tarde de los eventos y pierden el recreo haciendo fila en la soda.
2. **Mapa (40 s).** En el celular, escriban "enfermería" en el buscador: el mapa hace zoom y aparece su información y horario. Muestren el filtro de áreas restringidas y guarden un favorito con la estrella.
3. **Soda en vivo (70 s).** Agreguen un casado y un café al carrito, elijan la hora de retiro y paguen con la tarjeta de prueba. Muestren el código y el QR. En la tablet de la soda, el pedido aparece solo (con sonido); toquen "Empezar a preparar" y luego "Marcar como listo". En el celular, la línea de tiempo avanza y aparece el aviso de que está listo. En la tablet, escaneen el QR y entreguen.
4. **Guía (30 s).** Abran Clases: el horario resalta la lección en curso. Pasen por Próximos eventos y Enfermería, que dice si está abierta según la hora de Costa Rica.
5. **Accesibilidad (20 s).** En la rueda de configuración, suban el tamaño de letra a "Enorme", activen el modo oscuro y la lectura en voz alta.
6. **Cierre (20 s).** Mencionen que la administración maneja todo desde el panel sin saber de tecnología, y que la app se instala en el celular como cualquier otra.

Si falla internet, el mapa y la guía siguen abriendo; los pedidos muestran un aviso claro.
