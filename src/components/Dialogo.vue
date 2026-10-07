<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

/**
 * Ventana sobre la pagina. En celular sube desde abajo como una hoja; en
 * pantallas grandes aparece centrada. Se cierra con Escape, con la X o
 * tocando afuera, y devuelve el foco a donde estaba.
 */
const props = defineProps({
  abierto: { type: Boolean, default: false },
  titulo: { type: String, required: true },
  descripcion: { type: String, default: '' },
  ancho: { type: String, default: '32rem' },
  /** 'hoja' sube desde abajo en celular; 'centro' siempre centrado. */
  modo: { type: String, default: 'hoja' },
  /** Para confirmaciones que se abren sobre otra ventana. */
  encima: { type: Boolean, default: false },
})
const emit = defineEmits(['cerrar'])

const panel = ref(null)
const id = `dialogo-${Math.random().toString(36).slice(2, 8)}`
let focoAnterior = null

function enfocables() {
  return [
    ...(panel.value?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []),
  ]
}

function alTeclear(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('cerrar')
    return
  }
  if (e.key !== 'Tab') return
  const lista = enfocables()
  if (!lista.length) return
  const primero = lista[0]
  const ultimo = lista[lista.length - 1]
  if (e.shiftKey && document.activeElement === primero) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault()
    primero.focus()
  }
}

watch(
  () => props.abierto,
  async (abierto) => {
    if (abierto) {
      focoAnterior = document.activeElement
      document.body.style.overflow = 'hidden'
      await nextTick()
      const primero =
        panel.value?.querySelector('[autofocus]') ??
        enfocables()[1] ??
        enfocables()[0]
      primero?.focus()
    } else {
      document.body.style.overflow = ''
      focoAnterior?.focus?.()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialogo">
      <div
        v-if="abierto"
        class="fondo"
        :class="[`fondo--${modo}`, { 'fondo--encima': encima }]"
        @mousedown.self="emit('cerrar')"
        @keydown="alTeclear"
      >
        <div
          ref="panel"
          class="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`${id}-titulo`"
          :aria-describedby="descripcion ? `${id}-desc` : undefined"
          :style="{ '--ancho': ancho }"
        >
          <header class="panel__encabezado">
            <div>
              <h2 :id="`${id}-titulo`" class="panel__titulo">{{ titulo }}</h2>
              <p
                v-if="descripcion"
                :id="`${id}-desc`"
                class="panel__descripcion"
              >
                {{ descripcion }}
              </p>
            </div>
            <button
              type="button"
              class="boton-icono"
              aria-label="Cerrar"
              @click="emit('cerrar')"
            >
              <X :size="22" aria-hidden="true" />
            </button>
          </header>
          <div class="panel__cuerpo">
            <slot />
          </div>
          <footer v-if="$slots.pie" class="panel__pie">
            <slot name="pie" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fondo {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(13, 17, 23, 0.5);
}

.fondo--encima {
  z-index: calc(var(--z-modal) + 10);
}

.fondo--centro {
  align-items: center;
  padding: var(--e-4);
}

.panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--ancho);
  max-height: min(92dvh, 52rem);
  background: var(--fondo-elevado);
  border-radius: var(--radio-xl) var(--radio-xl) 0 0;
  box-shadow: var(--sombra-4);
  padding-bottom: env(safe-area-inset-bottom);
}

.fondo--centro .panel {
  border-radius: var(--radio-xl);
}

.panel__encabezado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--e-3);
  padding: var(--e-5) var(--e-3) var(--e-3) var(--e-5);
}

.panel__titulo {
  font-size: var(--txt-xl);
  padding-top: var(--e-2);
}

.panel__descripcion {
  margin-top: var(--e-1);
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.panel__cuerpo {
  padding: var(--e-2) var(--e-5) var(--e-5);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.panel__pie {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--e-3);
  padding: var(--e-4) var(--e-5);
  border-top: 1px solid var(--borde);
}

.dialogo-enter-active,
.dialogo-leave-active {
  transition: opacity var(--dur-media) var(--curva);
}

.dialogo-enter-active .panel,
.dialogo-leave-active .panel {
  transition: transform var(--dur-media) var(--curva);
}

.dialogo-enter-from,
.dialogo-leave-to {
  opacity: 0;
}

.dialogo-enter-from .panel,
.dialogo-leave-to .panel {
  transform: translateY(40px);
}

.fondo--centro.dialogo-enter-from .panel,
.fondo--centro.dialogo-leave-to .panel {
  transform: scale(0.96);
}

@media (min-width: 768px) {
  .fondo {
    align-items: center;
    padding: var(--e-6);
  }

  .panel {
    border-radius: var(--radio-xl);
  }

  .dialogo-enter-from .panel,
  .dialogo-leave-to .panel {
    transform: scale(0.96);
  }
}
</style>
