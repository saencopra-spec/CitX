<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Sun,
  Moon,
  MonitorSmartphone,
  LogOut,
  RotateCcw,
  Volume2,
  Bell,
  UserRound,
  KeyRound,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/EncabezadoPagina.vue'
import Dialogo from '@/components/Dialogo.vue'
import Campo from '@/components/Campo.vue'
import CampoContrasena from '@/components/CampoContrasena.vue'
import { useConfiguracion } from '@/stores/configuracion'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { usarErrores, opcionesSeccion } from '@/lib/errores'
import { leerEnVoz, vozDisponible } from '@/lib/voz'
import {
  notificacionesSoportadas,
  permisoNotificaciones,
  pedirPermisoNotificaciones,
} from '@/lib/avisosNavegador'
import { entradaEscalonada } from '@/lib/movimiento'
import { SECCIONES, NOMBRE_NIVEL } from '@compartido/permisos.js'

const configuracion = useConfiguracion()
const auth = useAuth()
const avisos = useAvisos()
const confirmar = useConfirmar()
const router = useRouter()
const raiz = ref(null)

const a = computed(() => configuracion.ajustes)

function cambiar(clave, valor) {
  configuracion.cambiar(clave, valor, auth.haySesion)
}

const temas = [
  { valor: 'claro', texto: 'Claro', icono: Sun },
  { valor: 'oscuro', texto: 'Oscuro', icono: Moon },
  { valor: 'sistema', texto: 'Como el teléfono', icono: MonitorSmartphone },
]

const tamanos = [
  { valor: 'normal', texto: 'Normal', escala: 1 },
  { valor: 'grande', texto: 'Grande', escala: 1.125 },
  { valor: 'mas-grande', texto: 'Más grande', escala: 1.25 },
  { valor: 'enorme', texto: 'Enorme', escala: 1.4 },
]

const daltonismos = [
  { valor: 'ninguno', texto: 'Sin filtro' },
  { valor: 'protanopia', texto: 'Protanopia', detalle: 'Cuesta ver el rojo.' },
  {
    valor: 'deuteranopia',
    texto: 'Deuteranopia',
    detalle: 'Cuesta ver el verde.',
  },
  {
    valor: 'tritanopia',
    texto: 'Tritanopia',
    detalle: 'Cuesta ver el azul y el amarillo.',
  },
]

const movimientos = [
  { valor: 'sistema', texto: 'Como el teléfono' },
  { valor: 'si', texto: 'Reducir' },
  { valor: 'no', texto: 'Normal' },
]

/** Interruptores sencillos: clave, titulo y explicacion de una linea. */
const interruptores = [
  {
    clave: 'altoContraste',
    titulo: 'Alto contraste',
    explica:
      'Pone el texto más oscuro y los bordes más marcados para leer mejor con mucha luz o poca vista.',
  },
  {
    clave: 'dislexia',
    titulo: 'Letra para dislexia',
    explica:
      'Cambia a una letra donde cada carácter se distingue mejor y no se confunden la b y la d.',
  },
  {
    clave: 'botonesGrandes',
    titulo: 'Botones más grandes',
    explica:
      'Agranda los botones y las zonas que se tocan, por si cuesta atinarles con el dedo.',
  },
  {
    clave: 'lecturaVoz',
    titulo: 'Leer en voz alta',
    explica:
      'Muestra un botón para que el teléfono lea en voz alta lo que hay en la pantalla.',
    disponible: vozDisponible,
  },
]

// Notificaciones del navegador
const permiso = ref(permisoNotificaciones())
async function activarNotificaciones() {
  permiso.value = await pedirPermisoNotificaciones()
  if (permiso.value === 'granted')
    avisos.exito('Listo. Te avisaremos cuando tu pedido esté listo.')
  else if (permiso.value === 'denied')
    avisos.aviso(
      'El navegador bloqueó las notificaciones. Podés activarlas en los ajustes del navegador.'
    )
}

// Perfil
const editandoPerfil = ref(false)
const perfil = ref({ nombre: '', seccion: '' })
const perfilErrores = usarErrores()
function abrirPerfil() {
  perfil.value = {
    nombre: auth.usuario.nombre,
    seccion: auth.usuario.seccion ?? '',
  }
  perfilErrores.limpiar()
  editandoPerfil.value = true
}
const guardandoPerfil = ref(false)
async function guardarPerfil() {
  guardandoPerfil.value = true
  try {
    await auth.actualizarPerfil({
      nombre: perfil.value.nombre,
      seccion: perfil.value.seccion || null,
    })
    editandoPerfil.value = false
    avisos.exito('Guardamos tus datos.')
  } catch (e) {
    perfilErrores.mostrar(e, { aviso: !e.campos })
  } finally {
    guardandoPerfil.value = false
  }
}

// Contrasena
const cambiandoClave = ref(false)
const clave = ref({ actual: '', nueva: '' })
const claveErrores = usarErrores()
const guardandoClave = ref(false)
async function guardarClave() {
  guardandoClave.value = true
  claveErrores.limpiar()
  try {
    await auth.cambiarContrasena(clave.value.actual, clave.value.nueva)
    cambiandoClave.value = false
    clave.value = { actual: '', nueva: '' }
    avisos.exito('Cambiamos tu contraseña.')
  } catch (e) {
    claveErrores.mostrar(e, { aviso: !e.campos })
  } finally {
    guardandoClave.value = false
  }
}

async function salir() {
  const si = await confirmar.preguntar({
    titulo: '¿Cerrar sesión?',
    mensaje:
      'Vas a tener que volver a escribir tu correo y contraseña para entrar.',
    aceptar: 'Cerrar sesión',
    peligro: false,
  })
  if (!si) return
  await auth.salir()
  avisos.info('Cerraste sesión.')
  router.replace({ name: 'empieza' })
}

async function restablecer() {
  const si = await confirmar.preguntar({
    titulo: '¿Volver a los ajustes de fábrica?',
    mensaje:
      'Se quitan el tema, el tamaño de letra y las demás opciones que cambiaste.',
    aceptar: 'Restablecer',
    peligro: false,
  })
  if (si) {
    configuracion.restablecer()
    avisos.exito('Ajustes restablecidos.')
  }
}

const opcionesSec = opcionesSeccion(SECCIONES, NOMBRE_NIVEL)

onMounted(() => entradaEscalonada(raiz.value))
</script>

<template>
  <div ref="raiz" class="pagina configuracion">
    <EncabezadoPagina
      titulo="Configuración"
      bajada="Ajustá CitX a tu gusto. Se guarda en este teléfono y en tu cuenta."
      :volver="auth.haySesion ? { name: 'menu' } : { name: 'empieza' }"
    />

    <div class="columnas">
      <section data-entra class="bloque" aria-labelledby="t-apariencia">
        <h2 id="t-apariencia" class="subtitulo">Cómo se ve</h2>

        <div class="opcion">
          <div class="opcion__texto">
            <p id="o-tema" class="opcion__titulo">Tema</p>
            <p class="opcion__explica">
              El modo oscuro cansa menos la vista de noche y gasta menos
              batería.
            </p>
          </div>
          <div class="segmentos" role="group" aria-labelledby="o-tema">
            <button
              v-for="t in temas"
              :key="t.valor"
              type="button"
              :aria-pressed="a.tema === t.valor"
              @click="cambiar('tema', t.valor)"
            >
              <component :is="t.icono" :size="16" aria-hidden="true" />
              {{ t.texto }}
            </button>
          </div>
        </div>

        <div class="opcion">
          <div class="opcion__texto">
            <p id="o-texto" class="opcion__titulo">Tamaño del texto</p>
            <p class="opcion__explica">
              Agranda todas las letras de la app sin que nada se desacomode.
            </p>
          </div>
          <div class="tamanos" role="group" aria-labelledby="o-texto">
            <button
              v-for="t in tamanos"
              :key="t.valor"
              type="button"
              class="tamano"
              :aria-pressed="a.tamanoTexto === t.valor"
              @click="cambiar('tamanoTexto', t.valor)"
            >
              <span
                class="tamano__muestra"
                :style="{ fontSize: `${t.escala * 1.1}rem` }"
                aria-hidden="true"
                >Aa</span
              >
              <span>{{ t.texto }}</span>
            </button>
          </div>
        </div>

        <div class="opcion">
          <div class="opcion__texto">
            <p id="o-color" class="opcion__titulo">Filtro para daltonismo</p>
            <p class="opcion__explica">
              Ajusta los colores para quien los distingue distinto. Igual, en
              CitX nada depende solo del color: todo lleva texto o icono.
            </p>
          </div>
          <div class="lista-radio" role="radiogroup" aria-labelledby="o-color">
            <label v-for="d in daltonismos" :key="d.valor" class="radio">
              <input
                type="radio"
                name="daltonismo"
                :value="d.valor"
                :checked="a.daltonismo === d.valor"
                @change="cambiar('daltonismo', d.valor)"
              />
              <span>
                {{ d.texto }}
                <small v-if="d.detalle">{{ d.detalle }}</small>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section data-entra class="bloque" aria-labelledby="t-uso">
        <h2 id="t-uso" class="subtitulo">Lectura y uso</h2>

        <div
          v-for="i in interruptores.filter((x) => x.disponible !== false)"
          :key="i.clave"
          class="opcion opcion--fila"
        >
          <div class="opcion__texto">
            <p :id="`o-${i.clave}`" class="opcion__titulo">{{ i.titulo }}</p>
            <p class="opcion__explica">{{ i.explica }}</p>
          </div>
          <button
            type="button"
            role="switch"
            class="interruptor"
            :aria-checked="a[i.clave]"
            :aria-labelledby="`o-${i.clave}`"
            @click="cambiar(i.clave, !a[i.clave])"
          />
        </div>

        <button
          v-if="a.lecturaVoz && vozDisponible"
          type="button"
          class="boton boton--suave boton--pequeno probar-voz"
          @click="leerEnVoz('Hola. Así suena la lectura en voz alta de CitX.')"
        >
          <Volume2 :size="16" aria-hidden="true" /> Probar la voz
        </button>

        <div class="opcion">
          <div class="opcion__texto">
            <p id="o-mov" class="opcion__titulo">Movimiento</p>
            <p class="opcion__explica">
              Quita las animaciones si te marean o si el teléfono va lento.
            </p>
          </div>
          <div class="segmentos" role="group" aria-labelledby="o-mov">
            <button
              v-for="m in movimientos"
              :key="m.valor"
              type="button"
              :aria-pressed="a.reducirMovimiento === m.valor"
              @click="cambiar('reducirMovimiento', m.valor)"
            >
              {{ m.texto }}
            </button>
          </div>
        </div>

        <div
          v-if="notificacionesSoportadas && auth.haySesion"
          class="opcion opcion--fila"
        >
          <div class="opcion__texto">
            <p class="opcion__titulo">Avisos del teléfono</p>
            <p class="opcion__explica">
              {{
                permiso === 'granted'
                  ? 'Activados. Te avisamos cuando tu pedido esté listo aunque estés en otra app.'
                  : permiso === 'denied'
                    ? 'Bloqueados en el navegador. Se activan desde los ajustes del navegador.'
                    : 'Te avisamos cuando tu pedido esté listo aunque estés en otra app.'
              }}
            </p>
          </div>
          <button
            v-if="permiso === 'default'"
            type="button"
            class="boton boton--contorno boton--pequeno"
            @click="activarNotificaciones"
          >
            <Bell :size="16" aria-hidden="true" /> Activar
          </button>
        </div>

        <button
          type="button"
          class="boton boton--texto restablecer"
          @click="restablecer"
        >
          <RotateCcw :size="16" aria-hidden="true" /> Volver a los ajustes de
          fábrica
        </button>
      </section>

      <section
        v-if="auth.haySesion"
        data-entra
        class="bloque"
        aria-labelledby="t-cuenta"
      >
        <h2 id="t-cuenta" class="subtitulo">Tu cuenta</h2>
        <dl class="datos">
          <div>
            <dt>Nombre</dt>
            <dd>{{ auth.usuario.nombre }}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{{ auth.usuario.correo }}</dd>
          </div>
          <div>
            <dt>Tipo de cuenta</dt>
            <dd>{{ auth.nombreRol }}</dd>
          </div>
          <div v-if="auth.usuario.seccion">
            <dt>Sección</dt>
            <dd>{{ auth.usuario.seccion }}</dd>
          </div>
        </dl>
        <div class="fila-botones">
          <button
            type="button"
            class="boton boton--contorno"
            @click="abrirPerfil"
          >
            <UserRound :size="18" aria-hidden="true" /> Editar perfil
          </button>
          <button
            type="button"
            class="boton boton--contorno"
            @click="cambiandoClave = true"
          >
            <KeyRound :size="18" aria-hidden="true" /> Cambiar contraseña
          </button>
        </div>
        <button
          type="button"
          class="boton boton--peligro boton--ancho salir"
          @click="salir"
        >
          <LogOut :size="18" aria-hidden="true" /> Cerrar sesión
        </button>
      </section>
    </div>

    <Dialogo
      :abierto="editandoPerfil"
      titulo="Editar perfil"
      @cerrar="editandoPerfil = false"
    >
      <form
        id="form-perfil"
        class="formulario"
        novalidate
        @submit.prevent="guardarPerfil"
      >
        <Campo
          id="perfil-nombre"
          v-model="perfil.nombre"
          etiqueta="Nombre completo"
          autocompletar="name"
          :error="perfilErrores.errores.nombre"
        />
        <Campo
          v-if="auth.esEstudiante"
          id="perfil-seccion"
          v-model="perfil.seccion"
          etiqueta="Sección"
          tipo="select"
          vacio="Elegí tu sección"
          :opciones="opcionesSec"
          :error="perfilErrores.errores.seccion"
        />
      </form>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="editandoPerfil = false"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-perfil"
          class="boton boton--accion"
          :disabled="guardandoPerfil"
        >
          {{ guardandoPerfil ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </Dialogo>

    <Dialogo
      :abierto="cambiandoClave"
      titulo="Cambiar contraseña"
      @cerrar="cambiandoClave = false"
    >
      <form
        id="form-clave"
        class="formulario"
        novalidate
        @submit.prevent="guardarClave"
      >
        <CampoContrasena
          id="clave-actual"
          v-model="clave.actual"
          etiqueta="Contraseña actual"
          :error="claveErrores.errores.actual"
        />
        <CampoContrasena
          id="clave-nueva"
          v-model="clave.nueva"
          etiqueta="Contraseña nueva"
          autocompletar="new-password"
          ayuda="Al menos 8 caracteres, con letras y números."
          :error="claveErrores.errores.nueva"
        />
      </form>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="cambiandoClave = false"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-clave"
          class="boton boton--accion"
          :disabled="guardandoClave"
        >
          {{ guardandoClave ? 'Guardando...' : 'Cambiar contraseña' }}
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.configuracion {
  padding-bottom: var(--e-8);
}

.columnas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--e-5);
  align-items: start;
}

.bloque {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
  padding: var(--e-5);
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
}

.opcion {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.opcion--fila {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-4);
}

.opcion__titulo {
  font-weight: var(--peso-semi);
}

.opcion__explica {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  max-width: 52ch;
}

.segmentos button {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
}

.tamanos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(4.75rem, 1fr));
  gap: var(--e-2);
}

.tamano {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: var(--e-1);
  min-height: 76px;
  padding: var(--e-2) var(--e-1);
  border: 1.5px solid var(--borde-fuerte);
  border-radius: var(--radio-md);
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
  color: var(--texto-suave);
  text-align: center;
}

.tamano__muestra {
  font-weight: var(--peso-fuerte);
  color: var(--texto);
  line-height: 1;
}

.tamano[aria-pressed='true'] {
  border-color: var(--principal);
  background: var(--principal-suave);
  color: var(--texto);
}

.lista-radio {
  display: grid;
  gap: var(--e-2);
}

.radio {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  min-height: var(--objetivo-tactil);
  padding: var(--e-2) var(--e-3);
  border-radius: var(--radio-md);
  border: 1.5px solid var(--borde);
  cursor: pointer;
}

.radio:has(input:checked) {
  border-color: var(--principal);
  background: var(--principal-suave);
}

.radio input {
  width: 20px;
  height: 20px;
  accent-color: var(--principal-fuerte);
  flex-shrink: 0;
}

.radio small {
  display: block;
  color: var(--texto-suave);
  font-size: var(--txt-xs);
}

.probar-voz {
  align-self: flex-start;
  margin-top: calc(var(--e-2) * -1);
}

.restablecer {
  align-self: flex-start;
}

.datos {
  display: grid;
  gap: var(--e-3);
}

.datos div {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--e-1) var(--e-3);
  padding-bottom: var(--e-3);
  border-bottom: 1px solid var(--borde-sutil);
}

.datos dt {
  color: var(--texto-suave);
}

.datos dd {
  margin: 0;
  font-weight: var(--peso-semi);
  overflow-wrap: anywhere;
}

.salir {
  margin-top: var(--e-2);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

@media (min-width: 1024px) {
  .columnas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .columnas > .bloque:last-child:nth-child(3) {
    grid-column: span 2;
  }
}
</style>
