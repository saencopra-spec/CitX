<script setup>
import { ref } from 'vue'
import { ImagePlus, Trash2, CircleAlert } from 'lucide-vue-next'
import { comprimirImagen } from '@/lib/imagenes'

/** Elegir una foto, comprimirla en el navegador y mostrar como queda. */
const props = defineProps({
  id: { type: String, required: true },
  etiqueta: { type: String, default: 'Foto' },
  error: { type: String, default: '' },
})
const modelo = defineModel({ type: String, default: null })

const procesando = ref(false)
const problema = ref('')
const peso = ref(0)

async function alElegir(e) {
  const archivo = e.target.files?.[0]
  e.target.value = ''
  if (!archivo) return
  problema.value = ''
  procesando.value = true
  try {
    const { dataUrl, bytes } = await comprimirImagen(archivo)
    modelo.value = dataUrl
    peso.value = bytes
  } catch (err) {
    problema.value = err.message
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <div class="campo">
    <span :id="`${props.id}-etiqueta`" class="campo__etiqueta">{{
      etiqueta
    }}</span>
    <div class="foto">
      <div class="foto__vista">
        <img
          v-if="modelo"
          :src="modelo"
          alt="Vista previa de la foto elegida"
        />
        <ImagePlus v-else :size="28" aria-hidden="true" />
      </div>
      <div class="foto__acciones">
        <label class="boton boton--contorno boton--pequeno" :for="props.id">
          {{
            procesando
              ? 'Preparando foto...'
              : modelo
                ? 'Cambiar foto'
                : 'Elegir foto'
          }}
        </label>
        <input
          :id="props.id"
          type="file"
          accept="image/*"
          class="solo-lectores"
          :aria-labelledby="`${props.id}-etiqueta`"
          @change="alElegir"
        />
        <button
          v-if="modelo"
          type="button"
          class="boton boton--texto boton--pequeno"
          @click="modelo = null"
        >
          <Trash2 :size="16" aria-hidden="true" /> Quitar
        </button>
        <p class="campo__ayuda">
          {{
            peso
              ? `Lista: ${Math.round(peso / 1024)} KB.`
              : 'Se achica sola para que suba rápido.'
          }}
        </p>
      </div>
    </div>
    <p v-if="problema || error" class="campo__error">
      <CircleAlert :size="16" aria-hidden="true" /> {{ problema || error }}
    </p>
  </div>
</template>

<style scoped>
.foto {
  display: flex;
  gap: var(--e-4);
  align-items: center;
}

.foto__vista {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 96px;
  height: 72px;
  border-radius: var(--radio-md);
  background: var(--superficie-3);
  color: var(--texto-tenue);
  overflow: hidden;
}

.foto__vista img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foto__acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
}

.foto__acciones .campo__ayuda {
  width: 100%;
}

.foto__acciones label:has(+ input:focus-visible) {
  outline: 3px solid var(--foco);
  outline-offset: 2px;
}
</style>
