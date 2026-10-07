<script setup>
import { computed, onMounted, ref } from 'vue'
import { Plus, Pencil, Search, EyeOff } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/estructura/EncabezadoPanel.vue'
import Dialogo from '@/components/avisos/Dialogo.vue'
import Campo from '@/components/formularios/Campo.vue'
import SubirFoto from '@/components/formularios/SubirFoto.vue'
import FotoComida from '@/components/soda/FotoComida.vue'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { useAvisos } from '@/stores/avisos'
import { colones } from '@compartido/dinero.js'
import { coincide } from '@compartido/texto.js'

const avisos = useAvisos()
const { errores, limpiar, mostrar } = usarErrores()

const productos = ref([])
const cargando = ref(true)
const busqueda = ref('')
const categoria = ref('todo')

const CATEGORIAS = [
  { valor: 'desayunos', texto: 'Desayunos' },
  { valor: 'almuerzos', texto: 'Almuerzos' },
  { valor: 'bebidas', texto: 'Bebidas' },
  { valor: 'snacks', texto: 'Snacks' },
]

const visibles = computed(() =>
  productos.value.filter(
    (p) =>
      (categoria.value === 'todo' || p.categoria === categoria.value) &&
      coincide(busqueda.value, p.nombre, p.descripcion)
  )
)

const abierto = ref(false)
const editando = ref(null)
const formulario = ref({})
const guardando = ref(false)

function nuevo() {
  editando.value = null
  formulario.value = {
    nombre: '',
    categoria: 'almuerzos',
    descripcion: '',
    precio: '',
    disponible: true,
    oculto: false,
    foto: null,
  }
  limpiar()
  abierto.value = true
}

function editar(p) {
  editando.value = p
  formulario.value = { ...p }
  limpiar()
  abierto.value = true
}

async function guardar() {
  guardando.value = true
  limpiar()
  try {
    const cuerpo = {
      nombre: formulario.value.nombre,
      categoria: formulario.value.categoria,
      descripcion: formulario.value.descripcion,
      precio: Number(formulario.value.precio),
      disponible: formulario.value.disponible,
      oculto: formulario.value.oculto,
      foto: formulario.value.foto,
    }
    if (editando.value) {
      const { producto } = await api.put(
        `/soda/productos/${editando.value.id}`,
        cuerpo
      )
      Object.assign(editando.value, producto)
      avisos.exito(`Guardamos ${producto.nombre}.`)
    } else {
      const { producto } = await api.post('/soda/productos', cuerpo)
      productos.value.push(producto)
      avisos.exito(`${producto.nombre} ya está en el menú.`)
    }
    abierto.value = false
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    guardando.value = false
  }
}

/** Cambio rapido de agotado o visible, sin abrir el formulario. */
async function cambiar(p, campo) {
  const valor = !p[campo]
  p[campo] = valor
  try {
    await api.patch(`/soda/productos/${p.id}`, { [campo]: valor })
    const textos = {
      disponible: valor
        ? `${p.nombre} vuelve a estar disponible.`
        : `${p.nombre} quedó como agotado.`,
      oculto: valor
        ? `${p.nombre} ya no se ve en el menú.`
        : `${p.nombre} se ve otra vez en el menú.`,
    }
    avisos.exito(textos[campo], { duracion: 2500 })
  } catch (e) {
    p[campo] = !valor
    avisos.error(e.message)
  }
}

onMounted(async () => {
  try {
    productos.value = (await api.get('/soda/productos?todos=1')).productos
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
      titulo="Menú de la soda"
      ayuda="Si algo se acaba, apagá «Disponible»: la gente lo ve como agotado y no lo puede pedir. «Oculto» lo saca del menú sin borrarlo."
    >
      <template #acciones>
        <button type="button" class="boton boton--accion" @click="nuevo">
          <Plus :size="18" aria-hidden="true" /> Nuevo producto
        </button>
      </template>
    </EncabezadoPanel>

    <div class="filtros">
      <div class="buscador">
        <Search :size="20" aria-hidden="true" />
        <label class="solo-lectores" for="buscar-producto"
          >Buscar producto</label
        >
        <input
          id="buscar-producto"
          v-model="busqueda"
          class="entrada"
          type="search"
          placeholder="Buscar producto"
        />
      </div>
      <div class="chips" role="group" aria-label="Categoría">
        <button
          type="button"
          class="chip"
          :aria-pressed="categoria === 'todo'"
          @click="categoria = 'todo'"
        >
          Todo
        </button>
        <button
          v-for="c in CATEGORIAS"
          :key="c.valor"
          type="button"
          class="chip"
          :aria-pressed="categoria === c.valor"
          @click="categoria = c.valor"
        >
          {{ c.texto }}
        </button>
      </div>
    </div>

    <div v-if="cargando" class="esqueleto" style="height: 400px" />

    <ul v-else class="productos">
      <li
        v-for="p in visibles"
        :key="p.id"
        class="producto"
        :class="{ 'es-oculto': p.oculto }"
      >
        <FotoComida :src="p.foto" alt="" class="producto__foto" />
        <div class="producto__info">
          <p class="producto__nombre">
            {{ p.nombre }}
            <span v-if="p.oculto" class="etiqueta etiqueta--neutra"
              ><EyeOff :size="12" aria-hidden="true" /> Oculto</span
            >
            <span v-else-if="!p.disponible" class="etiqueta etiqueta--error"
              >Agotado</span
            >
          </p>
          <p class="producto__datos">
            {{ colones(p.precio) }} ·
            {{ CATEGORIAS.find((c) => c.valor === p.categoria)?.texto }}
            <template v-if="p.calificacion">
              · {{ p.calificacion.toFixed(1) }} de 5 ({{
                p.calificaciones
              }})</template
            >
          </p>
        </div>
        <div class="producto__controles">
          <label class="interruptor-fila">
            <button
              type="button"
              role="switch"
              class="interruptor"
              :aria-checked="p.disponible"
              :aria-label="`${p.nombre} disponible`"
              @click="cambiar(p, 'disponible')"
            />
            <span aria-hidden="true">Disponible</span>
          </label>
          <label class="interruptor-fila">
            <button
              type="button"
              role="switch"
              class="interruptor"
              :aria-checked="!p.oculto"
              :aria-label="`${p.nombre} visible en el menú`"
              @click="cambiar(p, 'oculto')"
            />
            <span aria-hidden="true">Visible</span>
          </label>
          <button
            type="button"
            class="boton boton--contorno boton--pequeno"
            @click="editar(p)"
          >
            <Pencil :size="16" aria-hidden="true" /> Editar<span
              class="solo-lectores"
            >
              {{ p.nombre }}</span
            >
          </button>
        </div>
      </li>
      <li v-if="!visibles.length" class="texto-suave vacio">
        No hay productos con ese filtro.
      </li>
    </ul>

    <Dialogo
      :abierto="abierto"
      :titulo="editando ? `Editar ${editando.nombre}` : 'Nuevo producto'"
      ancho="34rem"
      @cerrar="abierto = false"
    >
      <form
        id="form-producto"
        class="formulario"
        novalidate
        @submit.prevent="guardar"
      >
        <Campo
          id="pr-nombre"
          v-model="formulario.nombre"
          etiqueta="Nombre"
          obligatorio
          :maximo="60"
          :error="errores.nombre"
        />
        <div class="dos">
          <Campo
            id="pr-categoria"
            v-model="formulario.categoria"
            etiqueta="Categoría"
            tipo="select"
            :opciones="CATEGORIAS"
            :error="errores.categoria"
          />
          <Campo
            id="pr-precio"
            v-model="formulario.precio"
            etiqueta="Precio en colones"
            tipo="number"
            modo-teclado="numeric"
            :min="100"
            :max="20000"
            placeholder="3300"
            :error="errores.precio"
          />
        </div>
        <Campo
          id="pr-descripcion"
          v-model="formulario.descripcion"
          etiqueta="Descripción"
          tipo="textarea"
          :maximo="300"
          ayuda="Qué lleva, en una o dos líneas."
          :error="errores.descripcion"
        />
        <SubirFoto
          id="pr-foto"
          v-model="formulario.foto"
          etiqueta="Foto"
          :error="errores.foto"
        />
        <div class="interruptores">
          <div class="interruptor-fila">
            <button
              id="pr-disponible"
              type="button"
              role="switch"
              class="interruptor"
              :aria-checked="formulario.disponible"
              @click="formulario.disponible = !formulario.disponible"
            />
            <label for="pr-disponible">Disponible para pedir</label>
          </div>
          <div class="interruptor-fila">
            <button
              id="pr-oculto"
              type="button"
              role="switch"
              class="interruptor"
              :aria-checked="!formulario.oculto"
              @click="formulario.oculto = !formulario.oculto"
            />
            <label for="pr-oculto">Se ve en el menú</label>
          </div>
        </div>
      </form>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="abierto = false"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-producto"
          class="boton boton--accion"
          :disabled="guardando"
        >
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-3);
  margin-bottom: var(--e-4);
}

.filtros .buscador {
  flex: 1 1 16rem;
  max-width: 24rem;
}

.filtros .chips {
  margin: 0;
  padding: 0;
}

.productos {
  display: flex;
  flex-direction: column;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  overflow: hidden;
}

.producto {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: var(--e-2) var(--e-4);
  align-items: center;
  padding: var(--e-3) var(--e-4);
  border-bottom: 1px solid var(--borde-sutil);
}

.producto:last-child {
  border-bottom: none;
}

.es-oculto .producto__foto,
.es-oculto .producto__info {
  opacity: 0.55;
}

.producto__foto {
  width: 56px;
  height: 56px;
  border-radius: var(--radio-sm);
}

.producto__nombre {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  font-weight: var(--peso-semi);
}

.producto__datos {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.producto__controles {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-3) var(--e-5);
}

.interruptor-fila {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--txt-sm);
  min-height: var(--objetivo-tactil);
}

.vacio {
  padding: var(--e-5);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.dos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--e-4);
}

.interruptores {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

@media (min-width: 900px) {
  .producto {
    grid-template-columns: 56px minmax(0, 1fr) auto;
  }

  .producto__controles {
    grid-column: auto;
  }
}
</style>
