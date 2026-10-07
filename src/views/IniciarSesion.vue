<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { LogIn, KeyRound } from 'lucide-vue-next'
import PantallaEntrada from '@/components/PantallaEntrada.vue'
import Campo from '@/components/Campo.vue'
import CampoContrasena from '@/components/CampoContrasena.vue'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { usarErrores } from '@/lib/errores'

const auth = useAuth()
const avisos = useAvisos()
const route = useRoute()
const router = useRouter()
const { errores, limpiar, mostrar } = usarErrores()

const correo = ref('')
const contrasena = ref('')
const enviando = ref(false)
const errorGeneral = ref('')

/** Cuentas para que el jurado de la Expo pruebe cada rol. */
const demos = [
  {
    rol: 'Estudiante (10-1)',
    correo: 'estudiante@citx.demo',
    contrasena: 'Estudiante2026',
  },
  {
    rol: 'Profesora',
    correo: 'profesor@citx.demo',
    contrasena: 'Profesor2026',
  },
  {
    rol: 'Personal administrativo',
    correo: 'administrativo@citx.demo',
    contrasena: 'Personal2026',
  },
  { rol: 'Administración', correo: 'admin@citx.demo', contrasena: 'Admin2026' },
  { rol: 'Soda', correo: 'soda@citx.demo', contrasena: 'Soda2026' },
]

function usarDemo(d) {
  correo.value = d.correo
  contrasena.value = d.contrasena
  limpiar()
  errorGeneral.value = ''
}

function validar() {
  limpiar()
  if (!correo.value.trim()) errores.correo = 'Escribí tu correo.'
  else if (!/^\S+@\S+\.\S+$/.test(correo.value.trim()))
    errores.correo = 'Ese correo no parece válido.'
  if (!contrasena.value) errores.contrasena = 'Escribí tu contraseña.'
  return Object.keys(errores).length === 0
}

async function enviar() {
  errorGeneral.value = ''
  if (!validar()) return
  enviando.value = true
  try {
    const usuario = await auth.entrar(correo.value.trim(), contrasena.value)
    avisos.exito(`Hola, ${auth.nombreCorto}.`)
    const seguir =
      typeof route.query.seguir === 'string' &&
      route.query.seguir.startsWith('/')
        ? route.query.seguir
        : null
    if (usuario.rol === 'soda') router.replace('/admin/pedidos')
    else router.replace(seguir ?? { name: 'menu' })
  } catch (e) {
    if (e.campos) mostrar(e, { aviso: false })
    else errorGeneral.value = e.message
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <PantallaEntrada titulo="Iniciá sesión en CitX">
    <form data-entra class="formulario" novalidate @submit.prevent="enviar">
      <p v-if="errorGeneral" class="error-general" role="alert">
        {{ errorGeneral }}
      </p>

      <Campo
        id="correo"
        v-model="correo"
        etiqueta="Correo"
        tipo="email"
        autocompletar="email"
        placeholder="tu.correo@ejemplo.com"
        modo-teclado="email"
        :error="errores.correo"
      />
      <CampoContrasena
        id="contrasena"
        v-model="contrasena"
        :error="errores.contrasena"
      />

      <button
        type="submit"
        class="boton boton--accion boton--ancho boton--grande"
        :disabled="enviando"
      >
        <LogIn :size="20" aria-hidden="true" />
        {{ enviando ? 'Entrando...' : 'Iniciar sesión' }}
      </button>

      <p class="pie">
        ¿No tenés cuenta?
        <RouterLink :to="{ name: 'registro' }">Crear cuenta</RouterLink>
      </p>
    </form>

    <details data-entra class="demos">
      <summary>
        <KeyRound :size="18" aria-hidden="true" />
        Cuentas para probar CitX
      </summary>
      <p class="demos__nota">
        Tocá una para llenar el formulario. Son cuentas de demostración.
      </p>
      <ul>
        <li v-for="d in demos" :key="d.correo">
          <button type="button" class="demos__boton" @click="usarDemo(d)">
            <strong>{{ d.rol }}</strong>
            <span>{{ d.correo }}</span>
          </button>
        </li>
      </ul>
    </details>
  </PantallaEntrada>
</template>

<style scoped>
.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.error-general {
  padding: var(--e-3) var(--e-4);
  border-radius: var(--radio-md);
  background: var(--error-fondo);
  color: var(--error);
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
}

.pie {
  text-align: center;
  color: var(--texto-suave);
}

.pie a {
  font-weight: var(--peso-semi);
}

.demos {
  border: 1px solid var(--borde);
  border-radius: var(--radio-md);
  background: var(--superficie-2);
}

.demos summary {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  min-height: var(--objetivo-tactil);
  padding: 0 var(--e-4);
  cursor: pointer;
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.demos__nota {
  padding: 0 var(--e-4) var(--e-2);
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

.demos ul {
  display: flex;
  flex-direction: column;
  padding: 0 var(--e-2) var(--e-2);
}

.demos__boton {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0 var(--e-3);
  min-height: var(--objetivo-tactil);
  padding: var(--e-2) var(--e-3);
  border-radius: var(--radio-sm);
  text-align: left;
  font-size: var(--txt-sm);
}

.demos__boton span {
  color: var(--texto-tenue);
}

.demos__boton:hover {
  background: var(--superficie-hover);
}
</style>
