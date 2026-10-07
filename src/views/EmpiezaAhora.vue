<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import gsap from 'gsap'
import { Mail } from 'lucide-vue-next'
import LogoCitx from '@/components/LogoCitx.vue'
import { useAvisos } from '@/stores/avisos'
import { useConfiguracion } from '@/stores/configuracion'

const avisos = useAvisos()
const configuracion = useConfiguracion()
const raiz = ref(null)

/**
 * Google y Facebook todavia no estan conectados. En vez de un boton muerto,
 * avisamos con claridad para que nadie se quede esperando.
 */
function proximamente(servicio) {
  avisos.aviso(
    `Entrar con ${servicio} todavía no está disponible. Por ahora usá tu correo.`
  )
}

onMounted(() => {
  if (configuracion.movimientoReducido) return
  gsap.from(raiz.value.querySelectorAll('[data-entra]'), {
    opacity: 0,
    y: 16,
    duration: 0.5,
    stagger: 0.07,
    ease: 'power2.out',
  })
})
</script>

<template>
  <main ref="raiz" class="empieza">
    <header data-entra class="empieza__marca">
      <LogoCitx :tamano="92" con-nombre alternativo="CitX" />
    </header>

    <div class="empieza__cuerpo">
      <h1 data-entra class="empieza__titulo titulo-manuscrito">
        ¡Empieza ahora!
      </h1>

      <div class="empieza__botones">
        <button
          data-entra
          type="button"
          class="boton boton--principal boton--ancho boton--grande"
          @click="proximamente('Google')"
        >
          <svg
            class="empieza__logo-externo"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#EA4335"
              d="M12 5.04c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.44 15.24.4 12 .4 7.31.4 3.26 3.09 1.28 7l3.99 3.1C6.22 7.25 8.87 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.86 3c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29a7.1 7.1 0 0 1 0-4.58L1.28 6.6a11.96 11.96 0 0 0 0 10.8l3.99-3.11z"
            />
            <path
              fill="#34A853"
              d="M12 23.6c3.24 0 5.96-1.07 7.93-2.91l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.21-6.73-5.06l-3.99 3.11C3.26 20.91 7.31 23.6 12 23.6z"
            />
          </svg>
          Iniciar con Google
        </button>

        <RouterLink
          data-entra
          :to="{ name: 'entrar' }"
          class="boton boton--principal boton--ancho boton--grande"
        >
          <Mail :size="20" aria-hidden="true" />
          Iniciar con correo
        </RouterLink>

        <button
          data-entra
          type="button"
          class="boton boton--principal boton--ancho boton--grande"
          @click="proximamente('Facebook')"
        >
          <svg
            class="empieza__logo-externo"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#1877F2"
              d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.956.93-1.956 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"
            />
          </svg>
          Iniciar con Facebook
        </button>
      </div>

      <p data-entra class="empieza__pie">
        ¿Todavía no tenés cuenta?
        <RouterLink :to="{ name: 'registro' }" class="empieza__enlace">
          Crear cuenta
        </RouterLink>
      </p>
    </div>

    <footer data-entra class="empieza__nota">
      <RouterLink :to="{ name: 'configuracion' }" class="empieza__ajustes">
        Ajustes de accesibilidad
      </RouterLink>
    </footer>
  </main>
</template>

<style scoped>
.empieza {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100dvh;
  padding: var(--e-10) var(--margen-lateral)
    calc(var(--e-6) + env(safe-area-inset-bottom));
  background: var(--fondo-elevado);
}

.empieza__marca {
  padding-block: var(--e-6) var(--e-4);
}

.empieza__cuerpo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-6);
  width: 100%;
  max-width: 24rem;
  margin-block: auto;
}

.empieza__titulo {
  font-size: var(--txt-2xl);
  text-align: center;
}

.empieza__botones {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
  width: 100%;
}

.empieza__logo-externo {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  background: #ffffff;
  border-radius: var(--radio-pildora);
  padding: 1px;
}

.empieza__pie {
  font-family: var(--fuente-titulo);
  font-size: var(--txt-base);
  color: var(--texto-suave);
  text-align: center;
}

.empieza__enlace {
  display: inline-block;
  color: var(--accion);
  font-weight: var(--peso-semi);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.empieza__nota {
  padding-top: var(--e-6);
}

.empieza__ajustes {
  display: inline-flex;
  align-items: center;
  min-height: var(--objetivo-tactil);
  padding-inline: var(--e-3);
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
  text-decoration: none;
}

.empieza__ajustes:hover {
  color: var(--texto);
  text-decoration: underline;
}

@media (min-width: 768px) {
  .empieza__titulo {
    font-size: var(--txt-3xl);
  }
}
</style>
