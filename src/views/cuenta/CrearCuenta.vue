<script setup>
import { computed, ref, nextTick } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  GraduationCap,
  BadgeCheck,
  ArrowRight,
  UserPlus,
  KeyRound,
} from 'lucide-vue-next'
import PantallaEntrada from '@/components/estructura/PantallaEntrada.vue'
import Campo from '@/components/formularios/Campo.vue'
import CampoContrasena from '@/components/formularios/CampoContrasena.vue'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { usarErrores, opcionesSeccion } from '@/lib/errores'
import { SECCIONES, NOMBRE_NIVEL, NOMBRE_ROL } from '@compartido/permisos.js'

const auth = useAuth()
const avisos = useAvisos()
const router = useRouter()
const { errores, limpiar, mostrar } = usarErrores()

/**
 * Las cuentas de estudiante se crean libremente. El personal (profesores,
 * administrativos y soda) necesita un codigo de invitacion que entrega la
 * administracion: asi nadie puede hacerse pasar por profesor.
 */
const tipos = [
  {
    valor: 'estudiante',
    texto: 'Estudiante',
    detalle: 'De sétimo a duodécimo.',
    icono: GraduationCap,
  },
  {
    valor: 'personal',
    texto: 'Personal del colegio',
    detalle:
      'Profesores, administrativos y soda. Necesitás un código de invitación.',
    icono: BadgeCheck,
  },
]

const paso = ref(1)
const formulario = ref({
  tipo: '',
  nombre: '',
  correo: '',
  contrasena: '',
  seccion: '',
  codigo: '',
})
const enviando = ref(false)
const tituloPaso = ref(null)

const opciones = opcionesSeccion(SECCIONES, NOMBRE_NIVEL)
const esEstudiante = computed(() => formulario.value.tipo === 'estudiante')

const fuerza = computed(() => {
  const c = formulario.value.contrasena
  if (!c) return null
  let puntos = 0
  if (c.length >= 8) puntos++
  if (c.length >= 12) puntos++
  if (/[a-z]/.test(c) && /[A-Z]/.test(c)) puntos++
  if (/\d/.test(c)) puntos++
  if (/[^a-zA-Z0-9]/.test(c)) puntos++
  if (puntos <= 2) return { nivel: 1, texto: 'Débil' }
  if (puntos <= 3) return { nivel: 2, texto: 'Aceptable' }
  return { nivel: 3, texto: 'Fuerte' }
})

async function continuar() {
  if (!formulario.value.tipo) {
    errores.tipo = 'Elegí una opción para seguir.'
    return
  }
  limpiar()
  paso.value = 2
  await nextTick()
  tituloPaso.value?.focus()
}

function alEscribirCodigo(e) {
  formulario.value.codigo = e.target.value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 20)
}

function validar() {
  limpiar()
  const f = formulario.value
  if (f.nombre.trim().length < 2) errores.nombre = 'Escribí tu nombre completo.'
  if (!/^\S+@\S+\.\S+$/.test(f.correo.trim()))
    errores.correo =
      'Ese correo no parece válido. Revisá que tenga @ y un dominio.'
  if (f.contrasena.length < 8)
    errores.contrasena = 'La contraseña necesita al menos 8 caracteres.'
  else if (!/[a-zA-Z]/.test(f.contrasena) || !/\d/.test(f.contrasena))
    errores.contrasena = 'Usá al menos una letra y un número.'
  if (esEstudiante.value && !f.seccion)
    errores.seccion = 'Elegí tu sección de la lista.'
  if (!esEstudiante.value && f.codigo.replace(/[^A-Z0-9]/g, '').length < 8) {
    errores.codigo = 'Escribí el código completo que te dio la administración.'
  }
  return Object.keys(errores).length === 0
}

async function enviar() {
  if (!validar()) return
  enviando.value = true
  try {
    const f = formulario.value
    const usuario = await auth.registrar({
      nombre: f.nombre.trim(),
      correo: f.correo.trim(),
      contrasena: f.contrasena,
      seccion: esEstudiante.value ? f.seccion : null,
      codigo: esEstudiante.value ? null : f.codigo,
    })
    avisos.exito(
      esEstudiante.value
        ? `Cuenta creada. Bienvenido a CitX, ${auth.nombreCorto}.`
        : `Cuenta creada como ${NOMBRE_ROL[usuario.rol].toLowerCase()}.`
    )
    router.replace(auth.inicioDe(usuario))
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <PantallaEntrada
    titulo="Crear cuenta en CitX"
    bajada="Tarda menos de un minuto."
  >
    <ol data-entra class="pasos" aria-label="Pasos">
      <li
        :class="{ 'es-actual': paso === 1 }"
        :aria-current="paso === 1 ? 'step' : undefined"
      >
        1. Quién sos
      </li>
      <li
        :class="{ 'es-actual': paso === 2 }"
        :aria-current="paso === 2 ? 'step' : undefined"
      >
        2. Tus datos
      </li>
    </ol>

    <Transition name="paso" mode="out-in">
      <form
        v-if="paso === 1"
        key="1"
        class="formulario"
        novalidate
        @submit.prevent="continuar"
      >
        <fieldset
          class="tipos"
          :aria-describedby="errores.tipo ? 'tipo-error' : undefined"
        >
          <legend class="tipos__pregunta">
            ¿Sos estudiante o personal del colegio?
          </legend>
          <label
            v-for="t in tipos"
            :key="t.valor"
            class="tipo"
            :class="{ 'es-elegido': formulario.tipo === t.valor }"
          >
            <input
              v-model="formulario.tipo"
              type="radio"
              name="tipo"
              :value="t.valor"
              class="solo-lectores"
            />
            <span class="tipo__icono" aria-hidden="true"
              ><component :is="t.icono" :size="22"
            /></span>
            <span class="tipo__textos">
              <strong>{{ t.texto }}</strong>
              <span>{{ t.detalle }}</span>
            </span>
            <span class="tipo__marca" aria-hidden="true" />
          </label>
        </fieldset>
        <p
          v-if="errores.tipo"
          id="tipo-error"
          class="campo__error"
          role="alert"
        >
          {{ errores.tipo }}
        </p>

        <button
          type="submit"
          class="boton boton--accion boton--ancho boton--grande"
        >
          Continuar
          <ArrowRight :size="20" aria-hidden="true" />
        </button>
        <p class="pie">
          ¿Ya tenés cuenta?
          <RouterLink :to="{ name: 'entrar' }">Iniciá sesión</RouterLink>
        </p>
      </form>

      <form
        v-else
        key="2"
        class="formulario"
        novalidate
        @submit.prevent="enviar"
      >
        <p ref="tituloPaso" tabindex="-1" class="elegido">
          Te estás registrando como
          <strong>{{
            esEstudiante ? 'estudiante' : 'personal del colegio'
          }}</strong
          >.
          <button
            type="button"
            class="boton boton--texto boton--pequeno"
            @click="paso = 1"
          >
            Cambiar
          </button>
        </p>

        <div v-if="!esEstudiante" class="campo">
          <label class="campo__etiqueta" for="codigo"
            >Código de invitación</label
          >
          <div class="codigo">
            <KeyRound :size="20" aria-hidden="true" />
            <input
              id="codigo"
              class="campo__control"
              :value="formulario.codigo"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="CIT-XXXXX-XXXXX"
              :aria-invalid="errores.codigo ? 'true' : undefined"
              aria-describedby="codigo-ayuda"
              @input="alEscribirCodigo"
            />
          </div>
          <p id="codigo-ayuda" class="campo__ayuda">
            Te lo da la administración del colegio. Sirve una sola vez y vence
            en pocos días.
          </p>
          <p v-if="errores.codigo" class="campo__error" role="alert">
            {{ errores.codigo }}
          </p>
        </div>

        <Campo
          id="nombre"
          v-model="formulario.nombre"
          etiqueta="Nombre completo"
          autocompletar="name"
          placeholder="Nombre y apellidos"
          :error="errores.nombre"
        />
        <Campo
          id="correo"
          v-model="formulario.correo"
          etiqueta="Correo"
          tipo="email"
          autocompletar="email"
          modo-teclado="email"
          placeholder="tu.correo@ejemplo.com"
          :error="errores.correo"
        />
        <div>
          <CampoContrasena
            id="contrasena"
            v-model="formulario.contrasena"
            autocompletar="new-password"
            ayuda="Al menos 8 caracteres, con letras y números."
            :error="errores.contrasena"
          />
          <p
            v-if="fuerza"
            class="fuerza"
            :data-nivel="fuerza.nivel"
            aria-live="polite"
          >
            <span class="fuerza__barra" aria-hidden="true"><span /></span>
            Seguridad: {{ fuerza.texto }}
          </p>
        </div>
        <Campo
          v-if="esEstudiante"
          id="seccion"
          v-model="formulario.seccion"
          etiqueta="Sección"
          tipo="select"
          vacio="Elegí tu sección"
          :opciones="opciones"
          ayuda="Por ejemplo 10-1. Sirve para mostrarte tu horario y los eventos de tu grupo."
          :error="errores.seccion"
        />

        <button
          type="submit"
          class="boton boton--accion boton--ancho boton--grande"
          :disabled="enviando"
        >
          <UserPlus :size="20" aria-hidden="true" />
          {{ enviando ? 'Creando cuenta...' : 'Crear cuenta' }}
        </button>
      </form>
    </Transition>
  </PantallaEntrada>
</template>

<style scoped>
.pasos {
  display: flex;
  gap: var(--e-4);
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

.pasos li {
  padding-bottom: var(--e-1);
  border-bottom: 2px solid transparent;
}

.pasos .es-actual {
  color: var(--texto);
  font-weight: var(--peso-semi);
  border-color: var(--principal);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.tipos {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  border: none;
  padding: 0;
}

.tipos__pregunta {
  margin-bottom: var(--e-3);
  font-weight: var(--peso-semi);
  font-size: var(--txt-md);
}

.tipo {
  display: flex;
  align-items: center;
  gap: var(--e-4);
  min-height: 64px;
  padding: var(--e-3) var(--e-4);
  border: 1.5px solid var(--borde-fuerte);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  cursor: pointer;
  transition:
    border-color var(--dur-rapida) var(--curva-suave),
    background-color var(--dur-rapida) var(--curva-suave);
}

.tipo:hover {
  border-color: var(--texto-tenue);
}

.tipo:has(input:focus-visible) {
  outline: 3px solid var(--foco);
  outline-offset: 2px;
}

.tipo.es-elegido {
  border-color: var(--principal);
  background: var(--principal-suave);
}

.tipo__icono {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radio-md);
  background: var(--superficie-3);
  color: var(--texto-suave);
}

.es-elegido .tipo__icono {
  background: var(--principal);
  color: var(--sobre-principal);
}

.tipo__textos {
  display: flex;
  flex-direction: column;
  flex: 1;
  line-height: 1.35;
}

.tipo__textos span {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.tipo__marca {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--borde-fuerte);
  transition: border-width var(--dur-rapida) var(--curva-suave);
}

.es-elegido .tipo__marca {
  border: 7px solid var(--principal);
}

.elegido {
  color: var(--texto-suave);
}

.elegido strong {
  color: var(--texto);
}

.codigo {
  position: relative;
}

.codigo svg {
  position: absolute;
  left: var(--e-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--texto-tenue);
}

.codigo .campo__control {
  padding-left: calc(var(--e-4) + 28px);
  font-family: var(--fuente-mono);
  letter-spacing: 0.06em;
}

.pie {
  text-align: center;
  color: var(--texto-suave);
}

.pie a {
  font-weight: var(--peso-semi);
}

.fuerza {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  margin-top: var(--e-2);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.fuerza__barra {
  width: 96px;
  height: 6px;
  border-radius: var(--radio-pildora);
  background: var(--superficie-3);
  overflow: hidden;
}

.fuerza__barra span {
  display: block;
  height: 100%;
  width: calc(var(--n) * 33.4%);
  border-radius: inherit;
  transition: width var(--dur-media) var(--curva);
}

.fuerza[data-nivel='1'] .fuerza__barra span {
  --n: 1;
  background: var(--error);
}
.fuerza[data-nivel='2'] .fuerza__barra span {
  --n: 2;
  background: var(--aviso);
}
.fuerza[data-nivel='3'] .fuerza__barra span {
  --n: 3;
  background: var(--exito);
}

.paso-enter-active,
.paso-leave-active {
  transition:
    opacity var(--dur-media) var(--curva),
    transform var(--dur-media) var(--curva);
}

.paso-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.paso-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
