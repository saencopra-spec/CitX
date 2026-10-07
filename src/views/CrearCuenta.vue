<script setup>
import { computed, ref, nextTick } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  GraduationCap,
  Presentation,
  Briefcase,
  ArrowRight,
  UserPlus,
} from 'lucide-vue-next'
import PantallaEntrada from '@/components/PantallaEntrada.vue'
import Campo from '@/components/Campo.vue'
import CampoContrasena from '@/components/CampoContrasena.vue'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { usarErrores, opcionesSeccion } from '@/lib/errores'
import { SECCIONES, NOMBRE_NIVEL } from '@compartido/permisos.js'

const auth = useAuth()
const avisos = useAvisos()
const router = useRouter()
const { errores, limpiar, mostrar } = usarErrores()

const tipos = [
  {
    valor: 'estudiante',
    texto: 'Estudiante',
    detalle: 'De sétimo a duodécimo.',
    icono: GraduationCap,
  },
  {
    valor: 'profesor',
    texto: 'Profesor',
    detalle: 'Podés publicar eventos y recordatorios.',
    icono: Presentation,
  },
  {
    valor: 'administrativo',
    texto: 'Personal administrativo',
    detalle: 'Dirección, secretaría y demás personal.',
    icono: Briefcase,
  },
]

const paso = ref(1)
const formulario = ref({
  rol: '',
  nombre: '',
  correo: '',
  contrasena: '',
  seccion: '',
})
const enviando = ref(false)
const tituloPaso = ref(null)

const opciones = opcionesSeccion(SECCIONES, NOMBRE_NIVEL)
const esEstudiante = computed(() => formulario.value.rol === 'estudiante')

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
  if (!formulario.value.rol) {
    errores.rol = 'Elegí una opción para seguir.'
    return
  }
  limpiar()
  paso.value = 2
  await nextTick()
  tituloPaso.value?.focus()
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
  return Object.keys(errores).length === 0
}

async function enviar() {
  if (!validar()) return
  enviando.value = true
  try {
    const f = formulario.value
    await auth.registrar({
      rol: f.rol,
      nombre: f.nombre.trim(),
      correo: f.correo.trim(),
      contrasena: f.contrasena,
      seccion: esEstudiante.value ? f.seccion : null,
    })
    avisos.exito(`Cuenta creada. Bienvenido a CitX, ${auth.nombreCorto}.`)
    router.replace({ name: 'menu' })
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <PantallaEntrada titulo="Crear cuenta en CitX">
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
          :aria-describedby="errores.rol ? 'rol-error' : undefined"
        >
          <legend class="tipos__pregunta">
            ¿Sos estudiante, profesor o personal administrativo?
          </legend>
          <label
            v-for="t in tipos"
            :key="t.valor"
            class="tipo"
            :class="{ 'es-elegido': formulario.rol === t.valor }"
          >
            <input
              v-model="formulario.rol"
              type="radio"
              name="rol"
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
        <p v-if="errores.rol" id="rol-error" class="campo__error" role="alert">
          {{ errores.rol }}
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
            tipos.find((t) => t.valor === formulario.rol)?.texto.toLowerCase()
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
