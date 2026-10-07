<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  LogOut,
  RotateCcw,
  Volume2,
  Bell,
  UserRound,
  KeyRound,
  ChevronDown,
  Accessibility,
  Palette,
  BadgeCheck,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Campo from '@/components/formularios/Campo.vue'
import CampoContrasena from '@/components/formularios/CampoContrasena.vue'
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
  { valor: 'sistema', texto: 'Automático (como tu dispositivo)' },
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
]

const tamanos = [
  { valor: 'normal', texto: 'Normal' },
  { valor: 'grande', texto: 'Grande' },
  { valor: 'mas-grande', texto: 'Más grande' },
  { valor: 'enorme', texto: 'Enorme' },
]

const daltonismos = [
  { valor: 'ninguno', texto: 'Sin filtro' },
  { valor: 'protanopia', texto: 'Protanopia (cuesta ver el rojo)' },
  { valor: 'deuteranopia', texto: 'Deuteranopia (cuesta ver el verde)' },
  { valor: 'tritanopia', texto: 'Tritanopia (cuesta ver azul y amarillo)' },
]

const movimientos = [
  { valor: 'sistema', texto: 'Automático (como tu dispositivo)' },
  { valor: 'si', texto: 'Reducir animaciones' },
  { valor: 'no', texto: 'Animaciones normales' },
]

/** Interruptores de las opciones avanzadas, con una linea que explica para que sirven. */
const interruptores = [
  {
    clave: 'altoContraste',
    titulo: 'Alto contraste',
    explica: 'Texto más oscuro y bordes más marcados.',
  },
  {
    clave: 'dislexia',
    titulo: 'Letra para dislexia',
    explica: 'Letras que se distinguen mejor entre sí.',
  },
  {
    clave: 'botonesGrandes',
    titulo: 'Botones más grandes',
    explica: 'Más fácil atinarle con el dedo.',
  },
  {
    clave: 'lecturaVoz',
    titulo: 'Leer en voz alta',
    explica: 'Aparece un botón que lee la pantalla.',
    disponible: vozDisponible,
  },
]

/** Cuantas opciones avanzadas estan activas, para mostrarlo sin abrir la seccion. */
const activasAvanzadas = computed(
  () =>
    interruptores.filter((i) => a.value[i.clave]).length +
    (a.value.daltonismo !== 'ninguno' ? 1 : 0) +
    (a.value.reducirMovimiento !== 'sistema' ? 1 : 0)
)

const iniciales = computed(() =>
  (auth.usuario?.nombre ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
)

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

// Codigo de invitacion para quien ya tiene cuenta
const codigo = ref('')
const canjeando = ref(false)
async function canjearCodigo() {
  canjeando.value = true
  try {
    const usuario = await auth.canjear(codigo.value.trim().toUpperCase())
    codigo.value = ''
    avisos.exito(
      `Listo. Tu cuenta ahora es de ${auth.nombreRol.toLowerCase()}.`
    )
    if (auth.soloPanel) router.push(auth.inicioDe(usuario))
  } catch (e) {
    avisos.error(e.campos?.codigo ?? e.message)
  } finally {
    canjeando.value = false
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
      bajada="Se guarda en este dispositivo y en tu cuenta."
      :volver="auth.haySesion ? auth.inicioDe() : { name: 'empieza' }"
    />

    <div class="columna">
      <!-- Cuenta -->
      <section
        v-if="auth.haySesion"
        data-entra
        class="tarjeta-cuenta"
        aria-label="Tu cuenta"
      >
        <span class="avatar" aria-hidden="true">{{ iniciales }}</span>
        <div class="tarjeta-cuenta__datos">
          <p class="tarjeta-cuenta__nombre">{{ auth.usuario.nombre }}</p>
          <p class="tarjeta-cuenta__detalle">
            {{ auth.nombreRol
            }}<template v-if="auth.usuario.seccion">
              · {{ auth.usuario.seccion }}</template
            >
          </p>
          <p class="tarjeta-cuenta__detalle">{{ auth.usuario.correo }}</p>
        </div>
        <div class="tarjeta-cuenta__acciones">
          <button
            type="button"
            class="boton boton--contorno boton--pequeno"
            @click="abrirPerfil"
          >
            <UserRound :size="16" aria-hidden="true" /> Editar perfil
          </button>
          <button
            type="button"
            class="boton boton--contorno boton--pequeno"
            @click="cambiandoClave = true"
          >
            <KeyRound :size="16" aria-hidden="true" /> Contraseña
          </button>
        </div>
        <p
          v-if="auth.usuario.debeCambiarContrasena"
          class="nota nota--aviso tarjeta-cuenta__aviso"
        >
          <KeyRound :size="18" aria-hidden="true" />
          <span
            >Estás usando una contraseña temporal. Cambiala con el botón
            «Contraseña».</span
          >
        </p>
      </section>

      <!-- Lo esencial -->
      <section data-entra class="bloque" aria-labelledby="t-apariencia">
        <h2 id="t-apariencia" class="bloque__titulo">
          <Palette :size="18" aria-hidden="true" /> Apariencia
        </h2>
        <div class="fila">
          <label class="fila__texto" for="cfg-tema">
            <span class="fila__titulo">Tema</span>
            <span class="fila__explica"
              >Claro, oscuro o igual que tu dispositivo.</span
            >
          </label>
          <select
            id="cfg-tema"
            class="campo__control fila__control"
            :value="a.tema"
            @change="(e) => cambiar('tema', e.target.value)"
          >
            <option v-for="t in temas" :key="t.valor" :value="t.valor">
              {{ t.texto }}
            </option>
          </select>
        </div>
        <div class="fila">
          <label class="fila__texto" for="cfg-texto">
            <span class="fila__titulo">Tamaño del texto</span>
            <span class="fila__explica"
              >Agranda todas las letras de la app.</span
            >
          </label>
          <select
            id="cfg-texto"
            class="campo__control fila__control"
            :value="a.tamanoTexto"
            @change="(e) => cambiar('tamanoTexto', e.target.value)"
          >
            <option v-for="t in tamanos" :key="t.valor" :value="t.valor">
              {{ t.texto }}
            </option>
          </select>
        </div>
      </section>

      <!-- Opciones avanzadas -->
      <details data-entra class="desplegable">
        <summary>
          <Accessibility :size="18" aria-hidden="true" />
          <span class="desplegable__titulo"
            >Opciones avanzadas de accesibilidad</span
          >
          <span v-if="activasAvanzadas" class="etiqueta etiqueta--principal"
            >{{ activasAvanzadas }} activas</span
          >
          <ChevronDown
            :size="18"
            aria-hidden="true"
            class="desplegable__flecha"
          />
        </summary>
        <div class="desplegable__cuerpo">
          <div
            v-for="i in interruptores.filter((x) => x.disponible !== false)"
            :key="i.clave"
            class="fila"
          >
            <div class="fila__texto">
              <span :id="`o-${i.clave}`" class="fila__titulo">{{
                i.titulo
              }}</span>
              <span class="fila__explica">{{ i.explica }}</span>
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
            class="boton boton--texto boton--pequeno probar-voz"
            @click="
              leerEnVoz('Hola. Así suena la lectura en voz alta de CitX.')
            "
          >
            <Volume2 :size="16" aria-hidden="true" /> Probar la voz
          </button>
          <div class="fila">
            <label class="fila__texto" for="cfg-color">
              <span class="fila__titulo">Filtro para daltonismo</span>
              <span class="fila__explica"
                >Ajusta los colores. Nada depende solo del color.</span
              >
            </label>
            <select
              id="cfg-color"
              class="campo__control fila__control"
              :value="a.daltonismo"
              @change="(e) => cambiar('daltonismo', e.target.value)"
            >
              <option v-for="d in daltonismos" :key="d.valor" :value="d.valor">
                {{ d.texto }}
              </option>
            </select>
          </div>
          <div class="fila">
            <label class="fila__texto" for="cfg-mov">
              <span class="fila__titulo">Movimiento</span>
              <span class="fila__explica"
                >Quita las animaciones si te marean.</span
              >
            </label>
            <select
              id="cfg-mov"
              class="campo__control fila__control"
              :value="a.reducirMovimiento"
              @change="(e) => cambiar('reducirMovimiento', e.target.value)"
            >
              <option v-for="m in movimientos" :key="m.valor" :value="m.valor">
                {{ m.texto }}
              </option>
            </select>
          </div>
          <button
            type="button"
            class="boton boton--texto boton--pequeno"
            @click="restablecer"
          >
            <RotateCcw :size="16" aria-hidden="true" /> Volver a los ajustes de
            fábrica
          </button>
        </div>
      </details>

      <!-- Avisos del navegador -->
      <details
        v-if="notificacionesSoportadas && auth.haySesion"
        data-entra
        class="desplegable"
      >
        <summary>
          <Bell :size="18" aria-hidden="true" />
          <span class="desplegable__titulo">Avisos del navegador</span>
          <span
            class="etiqueta"
            :class="
              permiso === 'granted' ? 'etiqueta--exito' : 'etiqueta--neutra'
            "
          >
            {{
              permiso === 'granted'
                ? 'Activados'
                : permiso === 'denied'
                  ? 'Bloqueados'
                  : 'Apagados'
            }}
          </span>
          <ChevronDown
            :size="18"
            aria-hidden="true"
            class="desplegable__flecha"
          />
        </summary>
        <div class="desplegable__cuerpo">
          <p class="fila__explica">
            {{
              permiso === 'granted'
                ? 'Te avisamos cuando tu pedido esté listo, aunque estés en otra pestaña o app.'
                : permiso === 'denied'
                  ? 'El navegador los bloqueó. Se activan desde los ajustes del navegador.'
                  : 'Te avisamos cuando tu pedido esté listo, aunque estés en otra pestaña o app.'
            }}
          </p>
          <button
            v-if="permiso === 'default'"
            type="button"
            class="boton boton--accion boton--pequeno"
            @click="activarNotificaciones"
          >
            <Bell :size="16" aria-hidden="true" /> Activar avisos
          </button>
        </div>
      </details>

      <!-- Codigo de invitacion -->
      <details
        v-if="auth.usuario?.rol === 'estudiante'"
        data-entra
        class="desplegable"
      >
        <summary>
          <BadgeCheck :size="18" aria-hidden="true" />
          <span class="desplegable__titulo">¿Sos personal del colegio?</span>
          <ChevronDown
            :size="18"
            aria-hidden="true"
            class="desplegable__flecha"
          />
        </summary>
        <form
          class="desplegable__cuerpo"
          novalidate
          @submit.prevent="canjearCodigo"
        >
          <p class="fila__explica">
            Si la administración te dio un código de invitación, escribilo aquí.
          </p>
          <div class="canjear">
            <label class="solo-lectores" for="codigo-invitacion"
              >Código de invitación</label
            >
            <input
              id="codigo-invitacion"
              v-model="codigo"
              class="entrada canjear__entrada"
              autocomplete="off"
              autocapitalize="characters"
              placeholder="CIT-XXXXX-XXXXX"
              maxlength="20"
            />
            <button
              type="submit"
              class="boton boton--accion boton--pequeno"
              :disabled="canjeando || codigo.length < 8"
            >
              {{ canjeando ? 'Revisando...' : 'Usar código' }}
            </button>
          </div>
        </form>
      </details>

      <button
        v-if="auth.haySesion"
        data-entra
        type="button"
        class="boton boton--peligro boton--ancho salir"
        @click="salir"
      >
        <LogOut :size="18" aria-hidden="true" /> Cerrar sesión
      </button>
    </div>

    <footer class="pie-colegio">
      <EscudoCit :tamano="40" alternativo="" />
      <p>
        CitX · Complejo Educativo CIT<br />La Asunción de Belén, Heredia<br />
        <small>Foto del gallo pinto: James Diggans, CC BY 2.0.</small>
      </p>
    </footer>

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

.columna {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  max-width: 40rem;
}

.tarjeta-cuenta {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--e-3) var(--e-4);
  align-items: center;
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.avatar {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--marca);
  color: #ffffff;
  font-weight: var(--peso-extra);
  font-size: var(--txt-lg);
}

:root[data-tema='oscuro'] .avatar {
  color: var(--gris-950);
}

.tarjeta-cuenta__datos {
  min-width: 0;
}

.tarjeta-cuenta__nombre {
  font-weight: var(--peso-fuerte);
  font-size: var(--txt-md);
}

.tarjeta-cuenta__detalle {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  overflow-wrap: anywhere;
}

.tarjeta-cuenta__acciones,
.tarjeta-cuenta__aviso {
  grid-column: 1 / -1;
}

.tarjeta-cuenta__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}

.bloque,
.desplegable {
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.bloque {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
  padding: var(--e-5);
}

.bloque__titulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-md);
}

.fila {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-2) var(--e-4);
}

.fila__texto {
  display: flex;
  flex-direction: column;
  flex: 1 1 12rem;
  min-width: 0;
}

.fila__titulo {
  font-weight: var(--peso-semi);
}

.fila__explica {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.fila__control {
  flex: 0 1 15rem;
  min-width: 11rem;
  width: auto;
}

.desplegable summary {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  min-height: 56px;
  padding: var(--e-2) var(--e-5);
  cursor: pointer;
  list-style: none;
  font-weight: var(--peso-semi);
}

.desplegable summary::-webkit-details-marker {
  display: none;
}

.desplegable__titulo {
  flex: 1;
}

.desplegable__flecha {
  color: var(--texto-tenue);
  transition: transform var(--dur-media) var(--curva);
}

.desplegable[open] .desplegable__flecha {
  transform: rotate(180deg);
}

.desplegable__cuerpo {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--e-4);
  padding: var(--e-2) var(--e-5) var(--e-5);
  border-top: 1px solid var(--borde-sutil);
  padding-top: var(--e-4);
}

.desplegable__cuerpo > .boton {
  align-self: flex-start;
}

.probar-voz {
  margin-top: calc(var(--e-3) * -1);
}

.canjear {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}

.canjear__entrada {
  flex: 1 1 12rem;
  font-family: var(--fuente-mono);
  letter-spacing: 0.05em;
}

.salir {
  margin-top: var(--e-3);
}

.pie-colegio {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  margin-top: var(--e-8);
  color: var(--texto-tenue);
  font-size: var(--txt-sm);
  line-height: 1.4;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}
</style>
