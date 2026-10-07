<script setup>
import { computed } from 'vue'
import { CircleAlert } from 'lucide-vue-next'

/**
 * Campo de formulario con etiqueta, ayuda y error junto al control.
 * tipo: text, email, number, date, time, textarea o select.
 */
const props = defineProps({
  id: { type: String, required: true },
  etiqueta: { type: String, required: true },
  tipo: { type: String, default: 'text' },
  error: { type: String, default: '' },
  ayuda: { type: String, default: '' },
  obligatorio: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  autocompletar: { type: String, default: undefined },
  opciones: { type: Array, default: () => [] },
  /** Texto de la opcion vacia del select. */
  vacio: { type: String, default: '' },
  maximo: { type: Number, default: undefined },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  modoTeclado: { type: String, default: undefined },
  filas: { type: Number, default: 3 },
})
const modelo = defineModel({ type: [String, Number, null], default: '' })

const descritoPor = computed(
  () =>
    [
      props.error ? `${props.id}-error` : '',
      props.ayuda ? `${props.id}-ayuda` : '',
    ]
      .join(' ')
      .trim() || undefined
)
</script>

<template>
  <div class="campo">
    <label class="campo__etiqueta" :for="id">
      {{ etiqueta
      }}<span v-if="obligatorio" class="campo__obligatorio" aria-hidden="true"
        >*</span
      >
    </label>

    <textarea
      v-if="tipo === 'textarea'"
      :id="id"
      v-model="modelo"
      class="campo__control"
      :rows="filas"
      :placeholder="placeholder"
      :maxlength="maximo"
      :required="obligatorio"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="descritoPor"
    />

    <select
      v-else-if="tipo === 'select'"
      :id="id"
      v-model="modelo"
      class="campo__control"
      :required="obligatorio"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="descritoPor"
    >
      <option v-if="vacio" value="" disabled>{{ vacio }}</option>
      <template v-for="op in opciones" :key="op.valor ?? op.grupo">
        <optgroup v-if="op.grupo" :label="op.grupo">
          <option v-for="o in op.opciones" :key="o.valor" :value="o.valor">
            {{ o.texto }}
          </option>
        </optgroup>
        <option v-else :value="op.valor">{{ op.texto }}</option>
      </template>
    </select>

    <input
      v-else
      :id="id"
      v-model="modelo"
      class="campo__control"
      :type="tipo"
      :placeholder="placeholder"
      :autocomplete="autocompletar"
      :maxlength="maximo"
      :min="min"
      :max="max"
      :inputmode="modoTeclado"
      :required="obligatorio"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="descritoPor"
    />

    <p v-if="ayuda" :id="`${id}-ayuda`" class="campo__ayuda">{{ ayuda }}</p>
    <p v-if="error" :id="`${id}-error`" class="campo__error">
      <CircleAlert :size="16" aria-hidden="true" />
      {{ error }}
    </p>
  </div>
</template>
