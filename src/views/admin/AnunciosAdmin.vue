<script setup>
import { computed, onMounted, ref } from 'vue'
import { Send, Trash2, MapPin, Megaphone } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import Campo from '@/components/Campo.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { useLugares } from '@/stores/lugares'
import { SECCIONES, NIVELES, NOMBRE_NIVEL } from '@compartido/permisos.js'
import { fechaRelativa, horaDe, fechaIsoLegible } from '@compartido/hora.js'

const avisos = useAvisos()
const confirmar = useConfirmar()
const lugares = useLugares()
const { errores, limpiar, mostrar } = usarErrores()

const anuncios = ref([])
const cargando = ref(true)
const enviando = ref(false)

function vacio() {
  return {
    titulo: '',
    cuerpo: '',
    lugarClave: '',
    importante: false,
    todos: true,
    secciones: [],
    venceEl: '',
  }
}
const formulario = ref(vacio())

const opcionesLugar = computed(() => [
  { valor: '', texto: 'Sin lugar' },
  ...lugares.lista
    .map((l) => ({
      valor: l.clave,
      texto: l.numero ? `${l.numero}. ${l.nombre}` : l.nombre,
    }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { numeric: true })),
])

const porNivel = NIVELES.map((n) => ({
  nivel: n,
  nombre: NOMBRE_NIVEL[n],
  secciones: SECCIONES.filter((s) => s.startsWith(`${n}-`)),
}))

function alternarNivel(nivel) {
  const del = SECCIONES.filter((s) => s.startsWith(`${nivel}-`))
  const todas = del.every((s) => formulario.value.secciones.includes(s))
  formulario.value.secciones = todas
    ? formulario.value.secciones.filter((s) => !del.includes(s))
    : [...new Set([...formulario.value.secciones, ...del])]
}

async function enviar() {
  enviando.value = true
  limpiar()
  try {
    const f = formulario.value
    const r = await api.post('/anuncios', {
      ...f,
      lugarClave: f.lugarClave || null,
      venceEl: f.venceEl || null,
    })
    anuncios.value.unshift(r.anuncio)
    formulario.value = vacio()
    avisos.exito(
      `Anuncio enviado a ${r.enviadoA} ${r.enviadoA === 1 ? 'persona' : 'personas'}.`
    )
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    enviando.value = false
  }
}

async function borrar(a) {
  const si = await confirmar.preguntar({
    titulo: `¿Borrar "${a.titulo}"?`,
    mensaje:
      'Deja de verse en el menú principal. Las notificaciones que ya llegaron no se borran.',
  })
  if (!si) return
  try {
    await api.delete(`/anuncios/${a.id}`)
    anuncios.value = anuncios.value.filter((x) => x.id !== a.id)
    avisos.exito('Anuncio borrado.')
  } catch (e) {
    avisos.error(e.message)
  }
}

onMounted(async () => {
  lugares.cargar()
  try {
    anuncios.value = (await api.get('/anuncios?todos=1')).anuncios
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Anuncios"
      ayuda="Un anuncio llega a la campanita de las personas que elijás y se muestra en su menú principal. Si le ponés un lugar, el aviso las lleva directo a ese punto del mapa."
    />

    <div class="distribucion">
      <form class="bloque formulario" novalidate @submit.prevent="enviar">
        <h2 class="subtitulo">
          <Megaphone :size="20" aria-hidden="true" /> Nuevo anuncio
        </h2>
        <Campo
          id="an-titulo"
          v-model="formulario.titulo"
          etiqueta="Título"
          obligatorio
          :maximo="90"
          placeholder="Por ejemplo: Cambio de horario de buses"
          :error="errores.titulo"
        />
        <Campo
          id="an-cuerpo"
          v-model="formulario.cuerpo"
          etiqueta="Mensaje"
          tipo="textarea"
          obligatorio
          :maximo="600"
          :error="errores.cuerpo"
        />
        <Campo
          id="an-lugar"
          v-model="formulario.lugarClave"
          etiqueta="Lugar del mapa (opcional)"
          tipo="select"
          :opciones="opcionesLugar"
          ayuda="La notificación tendrá un botón para ir a ese lugar."
        />
        <div class="dos">
          <Campo
            id="an-vence"
            v-model="formulario.venceEl"
            etiqueta="Mostrar hasta (opcional)"
            tipo="date"
            ayuda="Después de esa fecha deja de verse en el menú."
          />
          <div class="interruptor-fila">
            <button
              id="an-importante"
              type="button"
              role="switch"
              class="interruptor"
              :aria-checked="formulario.importante"
              @click="formulario.importante = !formulario.importante"
            />
            <label for="an-importante">Marcar como importante</label>
          </div>
        </div>

        <fieldset class="destino">
          <legend class="campo__etiqueta">¿Para quién es?</legend>
          <div class="segmentos" role="group" aria-label="Destinatarios">
            <button
              type="button"
              :aria-pressed="formulario.todos"
              @click="formulario.todos = true"
            >
              Todo el colegio
            </button>
            <button
              type="button"
              :aria-pressed="!formulario.todos"
              @click="formulario.todos = false"
            >
              Algunas secciones
            </button>
          </div>
          <div v-if="!formulario.todos" class="secciones">
            <div v-for="n in porNivel" :key="n.nivel" class="nivel">
              <button
                type="button"
                class="nivel__nombre"
                @click="alternarNivel(n.nivel)"
              >
                {{ n.nombre }}
              </button>
              <label v-for="s in n.secciones" :key="s" class="casilla">
                <input
                  v-model="formulario.secciones"
                  type="checkbox"
                  :value="s"
                />
                {{ s }}
              </label>
            </div>
            <p v-if="errores.secciones" class="campo__error">
              {{ errores.secciones }}
            </p>
          </div>
        </fieldset>

        <button type="submit" class="boton boton--accion" :disabled="enviando">
          <Send :size="18" aria-hidden="true" />
          {{ enviando ? 'Enviando...' : 'Enviar anuncio' }}
        </button>
      </form>

      <section class="historial" aria-labelledby="t-enviados">
        <h2 id="t-enviados" class="subtitulo">Anuncios enviados</h2>
        <div v-if="cargando" class="esqueleto" style="height: 200px" />
        <EstadoVacio
          v-else-if="!anuncios.length"
          :icono="Megaphone"
          titulo="Todavía no hay anuncios"
          texto="Lo que enviés aparece aquí."
        />
        <ul v-else class="lista">
          <li
            v-for="a in anuncios"
            :key="a.id"
            class="anuncio"
            :class="{ 'es-importante': a.importante }"
          >
            <div class="anuncio__cuerpo">
              <p class="anuncio__titulo">
                <span v-if="a.importante" class="etiqueta etiqueta--error"
                  >Importante</span
                >
                {{ a.titulo }}
              </p>
              <p class="anuncio__texto">{{ a.cuerpo }}</p>
              <p class="anuncio__meta">
                {{ a.todos ? 'Todo el colegio' : a.secciones.join(', ') }} ·
                {{ a.autorNombre }} · {{ fechaRelativa(a.creadoEn) }},
                {{ horaDe(a.creadoEn) }}
                <template v-if="a.venceEl">
                  · hasta el {{ fechaIsoLegible(a.venceEl) }}</template
                >
              </p>
              <p v-if="a.lugarClave" class="anuncio__lugar">
                <MapPin :size="14" aria-hidden="true" />
                {{ lugares.nombreDe(a.lugarClave) ?? a.lugarClave }}
              </p>
            </div>
            <button
              type="button"
              class="boton-icono peligro"
              :aria-label="`Borrar ${a.titulo}`"
              @click="borrar(a)"
            >
              <Trash2 :size="18" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.distribucion {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--e-5);
  align-items: start;
}

.bloque {
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.subtitulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  margin-bottom: var(--e-2);
}

.dos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--e-4);
  align-items: center;
}

.interruptor-fila {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
}

.destino {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  border: none;
  padding: 0;
}

.secciones {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.nivel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-1) var(--e-3);
}

.nivel__nombre {
  width: 6.5rem;
  min-height: 36px;
  text-align: left;
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--accion);
}

.casilla {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  font-size: var(--txt-sm);
}

.casilla input {
  width: 18px;
  height: 18px;
  accent-color: var(--principal-fuerte);
}

.lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.anuncio {
  display: flex;
  gap: var(--e-3);
  padding: var(--e-4);
  border-radius: var(--radio-md);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.anuncio.es-importante {
  border-left: 4px solid var(--error);
}

.anuncio__cuerpo {
  flex: 1;
  min-width: 0;
}

.anuncio__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  font-weight: var(--peso-semi);
}

.anuncio__texto {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  margin-top: var(--e-1);
}

.anuncio__meta {
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
  margin-top: var(--e-1);
}

.anuncio__lugar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: var(--e-1);
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
  color: var(--accion);
}

.peligro {
  color: var(--error);
}

@media (min-width: 1100px) {
  .distribucion {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  }
}
</style>
