<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import LogoCitx from './LogoCitx.vue'
import { entradaEscalonada } from '@/lib/movimiento'

/**
 * Marco de las pantallas para entrar y crear cuenta. En celular es una sola
 * columna; en computadora se suma un panel con la marca a la izquierda.
 */
defineProps({
  titulo: { type: String, required: true },
})

const router = useRouter()
const raiz = ref(null)

function volver() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'empieza' })
}

onMounted(() => entradaEscalonada(raiz.value))
</script>

<template>
  <div ref="raiz" class="entrada-pantalla">
    <aside class="marca-lateral" aria-hidden="true">
      <LogoCitx :tamano="120" con-nombre alternativo="" />
      <p class="marca-lateral__lema">
        El mapa del campus, la guía del colegio y la soda, en el mismo lugar.
      </p>
      <p class="marca-lateral__pie">
        Complejo Educativo CIT · La Asunción de Belén, Heredia
      </p>
    </aside>

    <main class="formulario-zona">
      <div class="formulario-zona__barra">
        <button
          type="button"
          class="boton-icono"
          aria-label="Volver"
          @click="volver"
        >
          <ArrowLeft :size="22" aria-hidden="true" />
        </button>
      </div>

      <div class="formulario-zona__contenido">
        <div data-entra class="logo-movil">
          <LogoCitx :tamano="72" con-nombre alternativo="CitX" />
        </div>
        <h1 data-entra class="titulo titulo-manuscrito">{{ titulo }}</h1>
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.entrada-pantalla {
  min-height: 100dvh;
  background: var(--fondo-elevado);
}

.marca-lateral {
  display: none;
}

.formulario-zona {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: env(safe-area-inset-top) var(--margen-lateral)
    calc(var(--e-8) + env(safe-area-inset-bottom));
}

.formulario-zona__barra {
  padding-top: var(--e-2);
  margin-left: calc(var(--e-3) * -1);
}

.formulario-zona__contenido {
  width: 100%;
  max-width: 25rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.logo-movil {
  display: flex;
  justify-content: center;
  padding-bottom: var(--e-2);
}

.titulo {
  font-size: var(--txt-xl);
}

@media (min-width: 1024px) {
  .entrada-pantalla {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  }

  .marca-lateral {
    position: sticky;
    top: 0;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--e-6);
    padding: var(--e-12);
    background: var(--marino-700);
    color: #ffffff;
  }

  .marca-lateral :deep(.marca__nombre) {
    color: #ffffff;
  }

  .marca-lateral__lema {
    max-width: 22ch;
    font-family: var(--fuente-titulo);
    font-size: var(--txt-2xl);
    line-height: 1.3;
  }

  .marca-lateral__pie {
    margin-top: auto;
    font-size: var(--txt-sm);
    color: var(--marino-100);
  }

  .logo-movil {
    display: none;
  }

  .formulario-zona__contenido {
    margin-block: auto;
  }

  .titulo {
    font-size: var(--txt-3xl);
  }
}
</style>
