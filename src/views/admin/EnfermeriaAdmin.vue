<script setup>
import { onMounted, ref } from 'vue'
import { Plus, Trash2, Save } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import Campo from '@/components/Campo.vue'
import { api } from '@/lib/api'
import { useAvisos } from '@/stores/avisos'
import { usarErrores } from '@/lib/errores'

const avisos = useAvisos()
const { errores, limpiar, mostrar } = usarErrores()

const datos = ref(null)
const guardando = ref(false)

const listas = [
  {
    clave: 'servicios',
    titulo: 'Servicios que ofrece',
    ayuda: 'Una línea por servicio.',
    nuevo: 'Nuevo servicio',
  },
  {
    clave: 'avisos',
    titulo: 'Avisos importantes',
    ayuda: 'Se muestran resaltados en la guía.',
    nuevo: 'Nuevo aviso',
  },
  {
    clave: 'emergencia',
    titulo: 'Qué hacer en una emergencia',
    ayuda: 'Pasos en orden, cortos y claros.',
    nuevo: 'Nuevo paso',
  },
]

function agregar(clave) {
  datos.value[clave].push('')
}

function quitar(clave, i) {
  datos.value[clave].splice(i, 1)
}

async function guardar() {
  guardando.value = true
  limpiar()
  try {
    const cuerpo = {
      ...datos.value,
      servicios: datos.value.servicios.map((s) => s.trim()).filter(Boolean),
      avisos: datos.value.avisos.map((s) => s.trim()).filter(Boolean),
      emergencia: datos.value.emergencia.map((s) => s.trim()).filter(Boolean),
    }
    const r = await api.put('/enfermeria', cuerpo)
    datos.value = { ...datos.value, ...r.enfermeria }
    avisos.exito('Guardamos la información de la enfermería.')
  } catch (e) {
    mostrar(e)
  } finally {
    guardando.value = false
  }
}

onMounted(async () => {
  try {
    datos.value = (await api.get('/enfermeria')).enfermeria
  } catch (e) {
    avisos.error(e.message)
  }
})
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Enfermería"
      ayuda="Lo que escribás aquí aparece en la guía digital. El letrero de abierto o cerrado se calcula solo con el horario."
    />

    <div v-if="!datos" class="esqueleto" style="height: 400px" />
    <form v-else class="formulario" novalidate @submit.prevent="guardar">
      <section class="bloque">
        <h2 class="subtitulo">Horario y contacto</h2>
        <div class="tres">
          <Campo
            id="en-abre"
            v-model="datos.abre"
            etiqueta="Abre"
            tipo="time"
            :error="errores.abre"
          />
          <Campo
            id="en-cierra"
            v-model="datos.cierra"
            etiqueta="Cierra"
            tipo="time"
            :error="errores.cierra"
          />
          <Campo
            id="en-extension"
            v-model="datos.extension"
            etiqueta="Teléfono o extensión"
            :maximo="40"
          />
        </div>
      </section>

      <section v-for="l in listas" :key="l.clave" class="bloque">
        <h2 class="subtitulo">{{ l.titulo }}</h2>
        <p class="texto-suave ayuda">{{ l.ayuda }}</p>
        <ol class="lista">
          <li v-for="(_, i) in datos[l.clave]" :key="i" class="lista__item">
            <label class="solo-lectores" :for="`${l.clave}-${i}`"
              >{{ l.titulo }}, línea {{ i + 1 }}</label
            >
            <input
              :id="`${l.clave}-${i}`"
              v-model="datos[l.clave][i]"
              class="entrada"
              maxlength="240"
            />
            <button
              type="button"
              class="boton-icono"
              :aria-label="`Quitar línea ${i + 1}`"
              @click="quitar(l.clave, i)"
            >
              <Trash2 :size="18" aria-hidden="true" />
            </button>
          </li>
        </ol>
        <button
          type="button"
          class="boton boton--texto boton--pequeno"
          @click="agregar(l.clave)"
        >
          <Plus :size="16" aria-hidden="true" /> {{ l.nuevo }}
        </button>
      </section>

      <div class="barra-guardar">
        <button type="submit" class="boton boton--accion" :disabled="guardando">
          <Save :size="18" aria-hidden="true" />
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
  max-width: 52rem;
}

.bloque {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.ayuda {
  font-size: var(--txt-sm);
  margin-top: calc(var(--e-2) * -1);
}

.tres {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--e-4);
}

.lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.lista__item {
  display: flex;
  gap: var(--e-2);
  align-items: center;
}

.barra-guardar {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  padding: var(--e-4) 0;
  background: var(--fondo);
}
</style>
