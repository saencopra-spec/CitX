<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Search, ShoppingBag, Plus, Receipt, SearchX } from 'lucide-vue-next'
import EncabezadoPagina from '@/components/estructura/EncabezadoPagina.vue'
import EstadoVacio from '@/components/avisos/EstadoVacio.vue'
import FotoComida from '@/components/soda/FotoComida.vue'
import Cantidad from '@/components/formularios/Cantidad.vue'
import TarjetaSancion from '@/components/sanciones/TarjetaSancion.vue'
import { useCarrito } from '@/stores/carrito'
import { useAuth } from '@/stores/auth'
import { useSanciones } from '@/stores/sanciones'
import { useAvisos } from '@/stores/avisos'
import { api } from '@/lib/api'
import { entradaEscalonada } from '@/lib/movimiento'
import { colones } from '@compartido/dinero.js'
import { coincide } from '@compartido/texto.js'

const auth = useAuth()
const router = useRouter()
const carrito = useCarrito()
const avisos = useAvisos()
const sanciones = useSanciones()

const productos = ref([])
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const categoria = ref('todo')
const lista = ref(null)

const categorias = [
  { valor: 'todo', texto: 'Todo' },
  { valor: 'desayunos', texto: 'Desayunos' },
  { valor: 'almuerzos', texto: 'Almuerzos' },
  { valor: 'bebidas', texto: 'Bebidas' },
  { valor: 'snacks', texto: 'Snacks' },
]

const visibles = computed(() =>
  productos.value.filter(
    (p) =>
      (categoria.value === 'todo' || p.categoria === categoria.value) &&
      coincide(busqueda.value, p.nombre, p.descripcion, p.categoria)
  )
)

/** Agrupado por categoria cuando se ve todo, para que se lea como un menu. */
const grupos = computed(() => {
  if (categoria.value !== 'todo' || busqueda.value) {
    return [{ clave: 'resultado', titulo: '', items: visibles.value }]
  }
  return categorias
    .slice(1)
    .map((c) => ({
      clave: c.valor,
      titulo: c.texto,
      items: visibles.value.filter((p) => p.categoria === c.valor),
    }))
    .filter((g) => g.items.length)
})

function agregar(p) {
  // Sin cuenta se puede mirar el menu, pero no pedir.
  if (!auth.usuario) {
    avisos.info(
      'Para pedir en la soda necesitás una cuenta. Crearla toma un minuto.'
    )
    router.push({ name: 'registro', query: { seguir: '/soda' } })
    return
  }
  carrito.agregar(p)
  avisos.exito(`${p.nombre} va en el carrito.`, { duracion: 2200 })
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const datos = await api.get('/soda/productos')
    productos.value = datos.productos
    carrito.sincronizarConMenu(datos.productos)
    await nextTick()
    entradaEscalonada(lista.value, '[data-entra]', { stagger: 0.03 })
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="pagina soda">
    <EncabezadoPagina
      titulo="Soda Armonía"
      bajada="Pedí desde aquí y retirá en el recreo o el almuerzo, sin hacer fila."
    >
      <template #acciones>
        <RouterLink
          :to="{ name: 'mis-pedidos' }"
          class="boton boton--contorno boton--pequeno"
        >
          <Receipt :size="18" aria-hidden="true" />
          Mis pedidos
        </RouterLink>
      </template>
    </EncabezadoPagina>

    <TarjetaSancion />

    <div class="filtros">
      <div class="buscador">
        <Search :size="20" aria-hidden="true" />
        <label for="buscar-soda" class="solo-lectores">Buscar en el menú</label>
        <input
          id="buscar-soda"
          v-model="busqueda"
          type="search"
          class="entrada"
          placeholder="Buscar en Armonía"
        />
      </div>
      <div class="chips" role="group" aria-label="Categorías del menú">
        <button
          v-for="c in categorias"
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

    <div
      v-if="cargando"
      class="productos"
      aria-busy="true"
      aria-label="Cargando el menú"
    >
      <div
        v-for="n in 6"
        :key="n"
        class="esqueleto"
        style="height: 128px; border-radius: var(--radio-lg)"
      />
    </div>

    <EstadoVacio
      v-else-if="error"
      titulo="No pudimos cargar el menú"
      :texto="error"
    >
      <button type="button" class="boton boton--accion" @click="cargar">
        Intentar de nuevo
      </button>
    </EstadoVacio>

    <EstadoVacio
      v-else-if="!visibles.length"
      :icono="SearchX"
      titulo="No encontramos eso en el menú"
      texto="Probá con otra palabra o mirá todas las categorías."
    />

    <div v-else ref="lista">
      <section
        v-for="g in grupos"
        :key="g.clave"
        class="grupo"
        :aria-label="g.titulo || 'Resultados'"
      >
        <h2 v-if="g.titulo" class="grupo__titulo titulo-manuscrito">
          {{ g.titulo }}
        </h2>
        <ul class="productos">
          <li
            v-for="p in g.items"
            :key="p.id"
            data-entra
            class="producto"
            :class="{ 'es-agotado': !p.disponible }"
          >
            <FotoComida :src="p.foto" alt="" class="producto__foto" />
            <div class="producto__info">
              <h3 class="producto__nombre">{{ p.nombre }}</h3>
              <p class="producto__descripcion">{{ p.descripcion }}</p>
              <div class="producto__pie">
                <span class="producto__precio">{{ colones(p.precio) }}</span>
                <span v-if="!p.disponible" class="etiqueta etiqueta--neutra"
                  >Agotado</span
                >
              </div>
            </div>
            <div class="producto__accion">
              <button
                v-if="!p.disponible"
                type="button"
                class="boton boton--contorno producto__boton"
                disabled
              >
                Agotado<span class="solo-lectores">: {{ p.nombre }}</span>
              </button>
              <Cantidad
                v-else-if="carrito.cantidadDe(p.id) && !sanciones.bloqueado"
                :valor="carrito.cantidadDe(p.id)"
                :nombre="p.nombre"
                @cambiar="(n) => carrito.cambiarCantidad(p.id, n)"
              />
              <button
                v-else
                type="button"
                class="boton boton--accion producto__boton"
                :disabled="sanciones.bloqueado"
                @click="agregar(p)"
              >
                <Plus :size="18" aria-hidden="true" />
                Agregar<span class="solo-lectores"> {{ p.nombre }}</span>
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <Transition name="barra-carrito">
      <RouterLink
        v-if="!carrito.vacio"
        :to="{ name: 'carrito' }"
        class="barra-carrito"
      >
        <span class="barra-carrito__icono">
          <ShoppingBag :size="20" aria-hidden="true" />
          <span class="barra-carrito__cuenta">{{ carrito.unidades }}</span>
        </span>
        <span>Ver carrito</span>
        <strong class="barra-carrito__total">{{
          colones(carrito.total)
        }}</strong>
        <span class="solo-lectores">, {{ carrito.unidades }} productos</span>
      </RouterLink>
    </Transition>
  </div>
</template>

<style scoped>
.soda {
  padding-bottom: calc(var(--e-20));
}

.filtros {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  margin-bottom: var(--e-4);
}

.grupo + .grupo {
  margin-top: var(--e-8);
}

.grupo__titulo {
  font-size: var(--txt-xl);
  margin-bottom: var(--e-3);
}

.productos {
  display: grid;
  gap: var(--e-3);
}

.producto {
  --ancho-foto: 96px;
  display: grid;
  grid-template-columns: var(--ancho-foto) minmax(0, 1fr);
  /* La accion va abajo, a todo el ancho de la tarjeta. */
  grid-template-rows: 1fr auto;
  grid-template-areas:
    'foto info'
    'accion accion';
  gap: var(--e-3) var(--e-4);
  padding: var(--e-3);
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
}

.producto__foto {
  grid-area: foto;
  /* Mismo ancho que su columna: nunca invade el espacio del texto. */
  width: var(--ancho-foto);
  min-width: var(--ancho-foto);
  max-width: var(--ancho-foto);
  height: auto;
  aspect-ratio: 640 / 461;
  align-self: start;
  border-radius: var(--radio-md);
}

.producto__info {
  grid-area: info;
  min-width: 0;
}

.producto__nombre {
  font-size: var(--txt-md);
  line-height: 1.3;
}

.producto__descripcion {
  margin-top: 2px;
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.producto__pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-1) var(--e-3);
  margin-top: var(--e-2);
}

.producto__precio {
  font-weight: var(--peso-extra);
  font-size: var(--txt-md);
  color: var(--texto);
  font-variant-numeric: tabular-nums;
}

.producto__accion {
  grid-area: accion;
  display: flex;
  align-items: center;
}

.producto__boton {
  width: 100%;
  min-height: 48px;
}

.producto__accion :deep(.cantidad) {
  width: 100%;
  min-height: 48px;
  justify-content: space-between;
}

.es-agotado .producto__foto {
  filter: grayscale(1);
  opacity: 0.6;
}

.es-agotado .producto__precio {
  color: var(--texto-tenue);
  text-decoration: line-through;
}

.barra-carrito {
  position: fixed;
  left: var(--margen-lateral);
  right: var(--margen-lateral);
  bottom: calc(
    var(--alto-barra-inferior) + var(--e-3) + env(safe-area-inset-bottom) +
      var(--e-3)
  );
  z-index: var(--z-pegajoso);
  display: flex;
  align-items: center;
  gap: var(--e-3);
  min-height: 56px;
  padding: 0 var(--e-5) 0 var(--e-4);
  border-radius: var(--radio-pildora);
  background: var(--marca);
  color: #ffffff;
  font-weight: var(--peso-semi);
  text-decoration: none;
  box-shadow: var(--sombra-4);
}

:root[data-tema='oscuro'] .barra-carrito {
  color: var(--gris-950);
}

.barra-carrito:hover {
  color: inherit;
}

.barra-carrito__icono {
  position: relative;
  display: inline-flex;
}

.barra-carrito__cuenta {
  position: absolute;
  top: -8px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: var(--radio-pildora);
  background: var(--principal);
  color: #ffffff;
  font-size: 0.6875rem;
}

.barra-carrito__total {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.barra-carrito-enter-active,
.barra-carrito-leave-active {
  transition:
    transform var(--dur-media) var(--curva-rebote),
    opacity var(--dur-media) var(--curva);
}

.barra-carrito-enter-from,
.barra-carrito-leave-to {
  transform: translateY(120%);
  opacity: 0;
}

@media (min-width: 768px) {
  .filtros {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  }

  .filtros .buscador {
    flex: 0 1 22rem;
  }

  .filtros .chips {
    margin: 0;
    padding: 0;
  }

  .productos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .producto {
    --ancho-foto: 132px;
  }

  .barra-carrito {
    left: auto;
    width: 22rem;
  }
}

@media (min-width: 1024px) {
  .barra-carrito {
    bottom: var(--e-6);
    right: var(--e-8);
  }
}

@media (min-width: 1440px) {
  .productos {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
