<script setup>
import { ref } from 'vue'
import { Eye, EyeOff, CircleAlert } from 'lucide-vue-next'

defineProps({
  id: { type: String, required: true },
  etiqueta: { type: String, default: 'Contraseña' },
  error: { type: String, default: '' },
  ayuda: { type: String, default: '' },
  autocompletar: { type: String, default: 'current-password' },
  placeholder: { type: String, default: '' },
})
const modelo = defineModel({ type: String, default: '' })
const visible = ref(false)
</script>

<template>
  <div class="campo">
    <label class="campo__etiqueta" :for="id">{{ etiqueta }}</label>
    <div class="contrasena">
      <input
        :id="id"
        v-model="modelo"
        class="campo__control"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocompletar"
        :placeholder="placeholder"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="
          [error ? `${id}-error` : '', ayuda ? `${id}-ayuda` : '']
            .join(' ')
            .trim() || undefined
        "
        spellcheck="false"
      />
      <button
        type="button"
        class="contrasena__ver"
        :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <component :is="visible ? EyeOff : Eye" :size="20" aria-hidden="true" />
      </button>
    </div>
    <p v-if="ayuda && !error" :id="`${id}-ayuda`" class="campo__ayuda">
      {{ ayuda }}
    </p>
    <p v-if="error" :id="`${id}-error`" class="campo__error">
      <CircleAlert :size="16" aria-hidden="true" />
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.contrasena {
  position: relative;
}

.contrasena .campo__control {
  padding-right: calc(var(--objetivo-tactil) + var(--e-2));
}

.contrasena__ver {
  position: absolute;
  top: 50%;
  right: 2px;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: var(--objetivo-tactil);
  height: var(--objetivo-tactil);
  border-radius: var(--radio-md);
  color: var(--texto-tenue);
}

.contrasena__ver:hover {
  color: var(--texto);
}
</style>
