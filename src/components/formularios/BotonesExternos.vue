<script setup>
import { useAvisos } from '@/stores/avisos'

/**
 * Entrar con Google o Facebook. Todavia no estan conectados: en vez de un
 * boton muerto, avisamos con claridad para que nadie se quede esperando.
 */
const avisos = useAvisos()

function proximamente(servicio) {
  avisos.aviso(
    `Entrar con ${servicio} todavía no está disponible. Por ahora usá tu correo.`
  )
}
</script>

<template>
  <div class="externos">
    <button
      type="button"
      class="boton boton--contorno boton--ancho"
      @click="proximamente('Google')"
    >
      <svg class="externos__logo" viewBox="0 0 24 24" aria-hidden="true">
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
      Google
    </button>
    <button
      type="button"
      class="boton boton--contorno boton--ancho"
      @click="proximamente('Facebook')"
    >
      <svg class="externos__logo" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.956.93-1.956 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"
        />
      </svg>
      Facebook
    </button>
  </div>
</template>

<style scoped>
.externos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--e-3);
}

.externos__logo {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
</style>
