<script setup>
import { useAvisos } from '@/stores/avisos'
import {
  CircleCheck,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from 'lucide-vue-next'

const avisos = useAvisos()

const iconos = {
  exito: CircleCheck,
  error: CircleAlert,
  aviso: TriangleAlert,
  info: Info,
}

function ejecutarAccion(aviso) {
  aviso.accion?.alPulsar()
  avisos.cerrar(aviso.id)
}
</script>

<template>
  <div class="pila" role="region" aria-label="Avisos">
    <TransitionGroup name="aviso">
      <div
        v-for="aviso in avisos.lista"
        :key="aviso.id"
        class="aviso"
        :class="`aviso--${aviso.tipo}`"
        role="status"
        aria-live="polite"
      >
        <component
          :is="iconos[aviso.tipo]"
          :size="20"
          aria-hidden="true"
          class="aviso__icono"
        />
        <p class="aviso__texto">{{ aviso.mensaje }}</p>
        <button
          v-if="aviso.accion"
          type="button"
          class="aviso__accion"
          @click="ejecutarAccion(aviso)"
        >
          {{ aviso.accion.texto }}
        </button>
        <button
          type="button"
          class="aviso__cerrar"
          :aria-label="`Cerrar aviso: ${aviso.mensaje}`"
          @click="avisos.cerrar(aviso.id)"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.pila {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(
    var(--alto-barra-inferior) + env(safe-area-inset-bottom) + var(--e-4)
  );
  z-index: var(--z-aviso);
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  width: min(100% - 2rem, 30rem);
  pointer-events: none;
}

.aviso {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  padding: var(--e-3) var(--e-3) var(--e-3) var(--e-4);
  background: var(--gris-900);
  color: #ffffff;
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-4);
  pointer-events: auto;
}

:root[data-tema='oscuro'] .aviso {
  background: var(--superficie-3);
  border: 1px solid var(--borde);
}

.aviso__icono {
  flex-shrink: 0;
}

.aviso--exito .aviso__icono {
  color: #6ee7a0;
}
.aviso--error .aviso__icono {
  color: #ff9d9d;
}
.aviso--aviso .aviso__icono {
  color: #ffd27a;
}
.aviso--info .aviso__icono {
  color: var(--turquesa-200);
}

.aviso__texto {
  flex: 1;
  font-size: var(--txt-sm);
  line-height: var(--alto-normal);
}

.aviso__accion {
  flex-shrink: 0;
  padding: var(--e-2) var(--e-3);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--turquesa-200);
  border-radius: var(--radio-sm);
  background: rgba(255, 255, 255, 0.1);
}

.aviso__accion:hover {
  background: rgba(255, 255, 255, 0.18);
}

.aviso__cerrar {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radio-pildora);
  color: rgba(255, 255, 255, 0.75);
}

.aviso__cerrar:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.aviso-enter-active {
  transition:
    opacity var(--dur-media) var(--curva),
    transform var(--dur-media) var(--curva);
}

.aviso-leave-active {
  transition:
    opacity var(--dur-rapida) var(--curva),
    transform var(--dur-rapida) var(--curva);
}

.aviso-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.97);
}

.aviso-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

.aviso-move {
  transition: transform var(--dur-media) var(--curva);
}

@media (min-width: 768px) {
  .pila {
    left: auto;
    right: var(--e-6);
    transform: none;
    bottom: var(--e-6);
    width: 24rem;
  }
}
</style>
