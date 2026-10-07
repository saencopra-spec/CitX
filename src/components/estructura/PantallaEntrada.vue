<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { ArrowLeft } from 'lucide-vue-next'
import LogoCitx from '@/components/marca/LogoCitx.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import CarruselFotos from '@/components/marca/CarruselFotos.vue'
import { sinMovimiento } from '@/lib/movimiento'

/**
 * Marco de las pantallas para entrar y crear cuenta: arriba (o a la
 * izquierda en computadora) fotos del colegio con el escudo, y el
 * formulario en una tarjeta que sube encima.
 */
defineProps({
  titulo: { type: String, required: true },
  bajada: { type: String, default: '' },
})

const router = useRouter()
const raiz = ref(null)

function volver() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'empieza' })
}

onMounted(() => {
  if (sinMovimiento() || !raiz.value) return
  const q = (s) => raiz.value.querySelectorAll(s)
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from(q('[data-escudo]'), {
      opacity: 0,
      scale: 0.7,
      rotate: -8,
      duration: 0.7,
    })
    .from(q('[data-logo]'), { opacity: 0, x: -14, duration: 0.5 }, '-=0.35')
    .from(q('[data-lema]'), { opacity: 0, y: 10, duration: 0.5 }, '-=0.25')
    .from(q('.tarjeta'), { y: 48, opacity: 0, duration: 0.65 }, 0.15)
    .from(
      q('.tarjeta [data-entra]'),
      { opacity: 0, y: 12, duration: 0.4, stagger: 0.06, clearProps: 'all' },
      0.4
    )
})
</script>

<template>
  <div ref="raiz" class="entrada-pantalla">
    <section class="portada">
      <CarruselFotos />
      <button type="button" class="volver" aria-label="Volver" @click="volver">
        <ArrowLeft :size="22" aria-hidden="true" />
      </button>
      <div class="portada__marca">
        <div class="portada__logos">
          <span data-escudo class="portada__escudo"
            ><EscudoCit :tamano="96"
          /></span>
          <span class="portada__linea" aria-hidden="true" />
          <span data-logo
            ><LogoCitx :tamano="72" con-nombre alternativo="CitX"
          /></span>
        </div>
        <p data-lema class="portada__lema">
          El mapa del campus, la guía del colegio y la soda, en el mismo lugar.
        </p>
        <p class="portada__pie">
          Complejo Educativo CIT · La Asunción de Belén, Heredia
        </p>
      </div>
    </section>

    <main class="tarjeta">
      <div class="tarjeta__contenido">
        <h1 data-entra class="titulo titulo-manuscrito">{{ titulo }}</h1>
        <p v-if="bajada" data-entra class="bajada">{{ bajada }}</p>
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.entrada-pantalla {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--fondo-elevado);
}

.portada {
  position: relative;
  min-height: max(36dvh, 250px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  color: #ffffff;
  overflow: hidden;
}

.volver {
  position: absolute;
  top: calc(var(--e-3) + env(safe-area-inset-top));
  left: var(--e-3);
  z-index: 2;
  display: grid;
  place-items: center;
  width: var(--objetivo-tactil);
  height: var(--objetivo-tactil);
  border-radius: 50%;
  background: rgba(13, 17, 23, 0.35);
  backdrop-filter: blur(6px);
  color: #ffffff;
}

.volver:hover {
  background: rgba(13, 17, 23, 0.55);
}

.portada__marca {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-2);
  padding: var(--e-8) var(--margen-lateral) calc(var(--e-10) + var(--e-4));
  text-align: center;
}

.portada__logos {
  display: flex;
  align-items: center;
  gap: var(--e-4);
  padding: var(--e-3) var(--e-5);
  border-radius: var(--radio-xl);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 30px rgba(13, 17, 23, 0.3);
}

.portada__escudo,
[data-logo] {
  display: inline-flex;
}

.portada__escudo :deep(.escudo) {
  height: 76px !important;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
}

[data-logo] :deep(.marca__bombilla) {
  height: 56px !important;
}

[data-logo] :deep(.marca__nombre) {
  color: var(--marino-600);
  font-size: 26px !important;
}

.portada__linea {
  width: 1px;
  height: 60px;
  background: var(--gris-300);
}

.portada__lema {
  max-width: 30ch;
  font-family: var(--fuente-titulo);
  font-size: var(--txt-md);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.portada__pie {
  display: none;
}

.tarjeta {
  position: relative;
  z-index: 2;
  flex: 1;
  margin-top: calc(var(--e-8) * -1);
  padding: var(--e-6) var(--margen-lateral)
    calc(var(--e-8) + env(safe-area-inset-bottom));
  background: var(--fondo-elevado);
  border-radius: var(--radio-xl) var(--radio-xl) 0 0;
  box-shadow: 0 -10px 30px rgba(13, 17, 23, 0.12);
}

.tarjeta__contenido {
  width: 100%;
  max-width: 25rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.titulo {
  font-size: var(--txt-2xl);
}

.bajada {
  margin-top: calc(var(--e-4) * -1);
  color: var(--texto-suave);
}

@media (min-width: 1024px) {
  .entrada-pantalla {
    display: grid;
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
  }

  .portada {
    position: sticky;
    top: 0;
    height: 100dvh;
    align-items: center;
  }

  .portada__marca {
    gap: var(--e-5);
    padding: var(--e-12);
  }

  .portada__escudo :deep(.escudo) {
    height: 120px !important;
  }

  [data-logo] :deep(.marca__bombilla) {
    height: 88px !important;
  }

  [data-logo] :deep(.marca__nombre) {
    font-size: 40px !important;
  }

  .portada__logos {
    padding: var(--e-5) var(--e-8);
  }

  .portada__linea {
    height: 100px;
  }

  .portada__lema {
    font-size: var(--txt-2xl);
    line-height: 1.3;
  }

  .portada__pie {
    display: block;
    margin-top: var(--e-6);
    font-size: var(--txt-sm);
    color: rgba(255, 255, 255, 0.8);
  }

  .tarjeta {
    display: flex;
    align-items: center;
    margin: 0;
    padding: var(--e-10) var(--e-10);
    border-radius: 0;
    box-shadow: none;
  }

  .titulo {
    font-size: var(--txt-3xl);
  }
}
</style>
