<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { LogIn, UserRound, ChevronDown, ArrowRight } from 'lucide-vue-next'
import PantallaEntrada from '@/components/estructura/PantallaEntrada.vue'
import Campo from '@/components/formularios/Campo.vue'
import CampoContrasena from '@/components/formularios/CampoContrasena.vue'
import RecuperarContrasena from '@/components/formularios/RecuperarContrasena.vue'
import BotonesExternos from '@/components/formularios/BotonesExternos.vue'
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
const masOpciones = ref(false)
const recuperando = ref(false)

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
      route.query.seguir.startsWith('/') &&
      !route.query.seguir.startsWith('//')
        ? route.query.seguir
        : null
    // La soda y objetos perdidos solo vuelven a paginas del panel (por
    // ejemplo, el QR de un pedido que escanearon antes de entrar).
    const seguirPanel = seguir && /^\/(admin|verificar)(\/|$)/.test(seguir)
    if (auth.soloPanel)
      router.replace(seguirPanel ? seguir : auth.inicioDe(usuario))
    else router.replace(seguir ?? { name: 'menu' })
  } catch (e) {
    if (e.campos) mostrar(e, { aviso: false })
    else errorGeneral.value = e.message
  } finally {
    enviando.value = false
  }
}

function comoInvitado() {
  auth.entrarComoInvitado()
  router.replace({ name: 'mapa' })
}
</script>

<template>
  <PantallaEntrada
    titulo="Iniciá sesión en CitX"
    bajada="Qué bueno verte de nuevo por el CIT."
  >
    <form class="formulario" novalidate @submit.prevent="enviar">
      <Transition name="error">
        <p v-if="errorGeneral" class="error-general" role="alert">
          {{ errorGeneral }}
        </p>
      </Transition>

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
      <div class="contrasena">
        <CampoContrasena
          id="contrasena"
          v-model="contrasena"
          :error="errores.contrasena"
        />
        <button type="button" class="olvide" @click="recuperando = true">
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <button
        type="submit"
        class="boton boton--accion boton--ancho boton--grande"
        :disabled="enviando"
      >
        <span v-if="enviando" class="girando" aria-hidden="true" />
        <LogIn v-else :size="20" aria-hidden="true" />
        {{ enviando ? 'Entrando...' : 'Iniciar sesión' }}
      </button>
    </form>

    <div class="opciones">
      <button
        type="button"
        class="opciones__alternar"
        :aria-expanded="masOpciones"
        aria-controls="mas-opciones"
        @click="masOpciones = !masOpciones"
      >
        <span class="opciones__linea" aria-hidden="true" />
        <Transition name="texto" mode="out-in">
          <span :key="String(masOpciones)">{{
            masOpciones ? 'Ocultar opciones' : 'Ver más opciones'
          }}</span>
        </Transition>
        <ChevronDown
          :size="16"
          class="opciones__flecha"
          :class="{ 'es-abierto': masOpciones }"
          aria-hidden="true"
        />
        <span class="opciones__linea" aria-hidden="true" />
      </button>

      <div
        id="mas-opciones"
        class="desplegable"
        :class="{ 'es-abierto': masOpciones }"
        :inert="!masOpciones"
      >
        <div>
          <div class="opciones__lista">
            <button
              type="button"
              class="invitado tocable"
              @click="comoInvitado"
            >
              <span class="invitado__icono" aria-hidden="true">
                <UserRound :size="20" />
              </span>
              <span class="invitado__textos">
                <strong>Entrar como invitado</strong>
                <span>Mirá el mapa y los eventos sin cuenta.</span>
              </span>
              <ArrowRight
                :size="18"
                class="invitado__flecha"
                aria-hidden="true"
              />
            </button>
            <BotonesExternos />
          </div>
        </div>
      </div>
    </div>

    <p class="pie">
      ¿No tenés cuenta?
      <RouterLink :to="{ name: 'registro', query: route.query }"
        >Crear cuenta</RouterLink
      >
    </p>

    <RecuperarContrasena
      :abierto="recuperando"
      :correo-inicial="correo"
      @cerrar="recuperando = false"
    />
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

.error-enter-active {
  animation: sacude calc(420ms * var(--mov)) var(--curva-salida);
}

.error-leave-active {
  transition: opacity calc(160ms * var(--mov)) ease;
}

.error-leave-to {
  opacity: 0;
}

@keyframes sacude {
  0% {
    opacity: 0;
    transform: translateX(0);
  }
  25% {
    opacity: 1;
    transform: translateX(-6px);
  }
  50% {
    transform: translateX(5px);
  }
  75% {
    transform: translateX(-3px);
  }
}

.contrasena {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.olvide {
  align-self: flex-end;
  min-height: 36px;
  padding-inline: var(--e-2);
  margin-right: calc(var(--e-2) * -1);
  border-radius: var(--radio-sm);
  color: var(--accion);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  transition: background-color var(--dur-rapida) ease;
}

.olvide:hover {
  background: var(--accion-suave);
}

.girando {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: girar 0.6s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

.opciones__alternar {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  width: 100%;
  min-height: var(--objetivo-tactil);
  color: var(--texto-suave);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  -webkit-tap-highlight-color: transparent;
}

.opciones__alternar:hover {
  color: var(--texto);
}

.opciones__linea {
  flex: 1;
  height: 1px;
  background: var(--borde);
}

.opciones__flecha {
  margin-left: calc(var(--e-2) * -1);
  transition: transform calc(360ms * var(--mov)) var(--curva);
}

.opciones__flecha.es-abierto {
  transform: rotate(180deg);
}

.opciones__lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding-top: var(--e-3);
}

.es-abierto .opciones__lista > * {
  animation: aparece calc(420ms * var(--mov)) var(--curva-salida) backwards;
}

.es-abierto .opciones__lista > :nth-child(2) {
  animation-delay: calc(70ms * var(--mov));
}

@keyframes aparece {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.invitado {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  width: 100%;
  padding: var(--e-3) var(--e-4);
  border-radius: var(--radio-lg);
  border: 1.5px dashed var(--principal-borde);
  background: var(--principal-suave);
  text-align: left;
}

.invitado__icono {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--fondo-elevado);
  color: var(--principal-fuerte);
}

.invitado__textos {
  display: flex;
  flex-direction: column;
  flex: 1;
  font-size: var(--txt-sm);
  line-height: 1.35;
}

.invitado__textos span {
  color: var(--texto-suave);
}

.invitado__flecha {
  color: var(--principal-fuerte);
  transition: transform var(--dur-media) var(--curva-salida);
}

.invitado:hover .invitado__flecha {
  transform: translateX(3px);
}

.texto-enter-active,
.texto-leave-active {
  transition:
    opacity calc(160ms * var(--mov)) ease,
    transform calc(200ms * var(--mov)) var(--curva-salida);
}

.texto-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.texto-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.pie {
  text-align: center;
  color: var(--texto-suave);
}

.pie a {
  font-weight: var(--peso-semi);
}
</style>
