<script setup>
import { nextTick, ref, watch } from 'vue'
import { Mail, ArrowRight, Info } from 'lucide-vue-next'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Campo from '@/components/formularios/Campo.vue'

/**
 * "Olvidé mi contraseña". Por ahora es solo visual: no manda ningun correo.
 * El envio real (con un servicio de correo) se conecta mas adelante; el
 * lugar para hacerlo es la funcion `enviar`.
 */
const props = defineProps({
  abierto: { type: Boolean, default: false },
  correoInicial: { type: String, default: '' },
})
const emit = defineEmits(['cerrar'])

const paso = ref('correo') // correo | enviando | listo
const correo = ref('')
const error = ref('')
const botonListo = ref(null)

watch(
  () => props.abierto,
  (abierto) => {
    if (abierto) {
      paso.value = 'correo'
      correo.value = props.correoInicial
      error.value = ''
    }
  }
)

function enviar() {
  error.value = ''
  const limpio = correo.value.trim()
  if (!limpio) {
    error.value = 'Escribí el correo de tu cuenta.'
    return
  }
  if (!/^\S+@\S+\.\S+$/.test(limpio)) {
    error.value = 'Ese correo no parece válido.'
    return
  }
  // Solo visual por ahora: simulamos el envio.
  paso.value = 'enviando'
  setTimeout(async () => {
    if (paso.value !== 'enviando') return
    paso.value = 'listo'
    // El boton de enviar desaparece: el foco pasa al de volver.
    await nextTick()
    setTimeout(() => botonListo.value?.focus(), 360)
  }, 1300)
}
</script>

<template>
  <Dialogo
    :abierto="abierto"
    titulo="Recuperar contraseña"
    ancho="27rem"
    @cerrar="emit('cerrar')"
  >
    <Transition name="paso" mode="out-in">
      <form
        v-if="paso !== 'listo'"
        key="correo"
        class="recuperar"
        novalidate
        @submit.prevent="enviar"
      >
        <div class="recuperar__ilustracion" aria-hidden="true">
          <span class="sobre" :class="{ 'es-enviando': paso === 'enviando' }">
            <Mail :size="30" />
          </span>
        </div>
        <p class="recuperar__texto">
          Escribí el correo con el que creaste tu cuenta y te mandamos un enlace
          para crear una contraseña nueva.
        </p>
        <Campo
          id="correo-recuperar"
          v-model="correo"
          etiqueta="Correo"
          tipo="email"
          autocompletar="email"
          modo-teclado="email"
          placeholder="tu.correo@ejemplo.com"
          :error="error"
        />
        <button
          type="submit"
          class="boton boton--accion boton--ancho boton--grande"
          :disabled="paso === 'enviando'"
        >
          <span v-if="paso === 'enviando'" class="girando" aria-hidden="true" />
          {{ paso === 'enviando' ? 'Enviando...' : 'Enviar enlace' }}
          <ArrowRight
            v-if="paso !== 'enviando'"
            :size="18"
            class="icono-avanza"
            aria-hidden="true"
          />
        </button>
      </form>

      <div v-else key="listo" class="recuperar recuperar--listo" role="status">
        <svg class="visto" viewBox="0 0 52 52" aria-hidden="true">
          <circle
            class="visto__circulo"
            cx="26"
            cy="26"
            r="23"
            pathLength="1"
          />
          <path
            class="visto__marca"
            d="M15 27 l7.5 7.5 L37 19"
            pathLength="1"
          />
        </svg>
        <h3 class="recuperar__titulo">Revisá tu correo</h3>
        <p class="recuperar__texto">
          Si <strong>{{ correo.trim() }}</strong> tiene una cuenta en CitX, te
          va a llegar un enlace para cambiar la contraseña.
        </p>
        <p class="nota">
          <Info :size="18" aria-hidden="true" />
          <span>
            El envío de correos se activa muy pronto. Mientras tanto, la
            administración del colegio puede darte una contraseña temporal.
          </span>
        </p>
        <button
          ref="botonListo"
          type="button"
          class="boton boton--principal boton--ancho"
          @click="emit('cerrar')"
        >
          Volver a iniciar sesión
        </button>
      </div>
    </Transition>
  </Dialogo>
</template>

<style scoped>
.recuperar {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.recuperar--listo {
  align-items: center;
  text-align: center;
}

.recuperar--listo .nota {
  text-align: left;
}

.recuperar__ilustracion {
  display: flex;
  justify-content: center;
  padding-block: var(--e-2);
}

.sobre {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--accion-suave);
  color: var(--accion);
  animation: sobre-flota calc(3s * var(--mov)) ease-in-out infinite;
}

.sobre.es-enviando {
  animation: sobre-vuela calc(1.3s * var(--mov)) var(--curva-mover) forwards;
}

@keyframes sobre-flota {
  50% {
    transform: translateY(-4px) rotate(-3deg);
  }
}

@keyframes sobre-vuela {
  40% {
    transform: translateY(4px) scale(0.95);
  }
  100% {
    transform: translate(60px, -40px) rotate(18deg) scale(0.6);
    opacity: 0;
  }
}

.recuperar__titulo {
  font-family: var(--fuente-titulo);
  font-size: var(--txt-xl);
  color: var(--texto-titulo);
}

.recuperar__texto {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
  line-height: var(--alto-amplio);
}

.girando {
  width: 16px;
  height: 16px;
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

.visto {
  width: 76px;
  height: 76px;
  margin-top: var(--e-2);
}

.visto__circulo {
  fill: var(--exito-fondo);
  stroke: var(--exito);
  stroke-width: 2.5;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: trazo calc(600ms * var(--mov)) var(--curva-mover) forwards;
}

.visto__marca {
  fill: none;
  stroke: var(--exito);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: trazo calc(420ms * var(--mov)) var(--curva-salida)
    calc(450ms * var(--mov)) forwards;
}

@keyframes trazo {
  to {
    stroke-dashoffset: 0;
  }
}

.paso-enter-active {
  transition:
    opacity calc(280ms * var(--mov)) var(--curva-salida),
    transform calc(340ms * var(--mov)) var(--curva-salida);
}

.paso-leave-active {
  transition: opacity calc(140ms * var(--mov)) ease;
}

.paso-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.paso-leave-to {
  opacity: 0;
}
</style>
