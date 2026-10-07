<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  ShoppingBag,
  Clock,
  ArrowRight,
  MessageSquareText,
  TriangleAlert,
} from 'lucide-vue-next'
import EncabezadoPagina from '@/components/EncabezadoPagina.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import FotoComida from '@/components/FotoComida.vue'
import Cantidad from '@/components/Cantidad.vue'
import { useCarrito } from '@/stores/carrito'
import { api } from '@/lib/api'
import { colones } from '@compartido/dinero.js'
import { horaLegible, fechaIsoLegible } from '@compartido/hora.js'

const carrito = useCarrito()
const router = useRouter()

const franjas = ref([])
const cargandoFranjas = ref(true)
const notasAbiertas = ref(new Set())
const errorFranja = ref('')

const hayAgotados = computed(() => carrito.items.some((i) => i.agotado))
const sonDeOtroDia = computed(
  () => franjas.value.length && !franjas.value[0].hoy
)

function claveFranja(f) {
  return `${f.fecha}|${f.clave}`
}

const elegida = computed({
  get: () => (carrito.franja ? claveFranja(carrito.franja) : ''),
  set: (v) => {
    carrito.franja = franjas.value.find((f) => claveFranja(f) === v) ?? null
    errorFranja.value = ''
  },
})

function alternarNota(id) {
  const s = new Set(notasAbiertas.value)
  s.has(id) ? s.delete(id) : s.add(id)
  notasAbiertas.value = s
}

function continuar() {
  if (!carrito.franja) {
    errorFranja.value = 'Elegí a qué hora vas a pasar a retirar.'
    document.getElementById('franjas')?.focus()
    return
  }
  router.push({ name: 'pagar' })
}

onMounted(async () => {
  try {
    const [menu, datos] = await Promise.all([
      api.get('/soda/productos'),
      api.get('/soda/franjas'),
    ])
    carrito.sincronizarConMenu(menu.productos)
    franjas.value = datos.franjas
    // Si la franja guardada ya no sirve (por ejemplo, ya paso), se borra.
    if (
      carrito.franja &&
      !datos.franjas.some((f) => claveFranja(f) === claveFranja(carrito.franja))
    ) {
      carrito.franja = null
    }
  } catch {
    // Sin conexion: se muestra el carrito pero no se puede pagar.
  } finally {
    cargandoFranjas.value = false
  }
})
</script>

<template>
  <div class="pagina carrito">
    <EncabezadoPagina titulo="Tu carrito" :volver="{ name: 'soda' }" />

    <EstadoVacio
      v-if="carrito.vacio"
      :icono="ShoppingBag"
      titulo="El carrito está vacío"
      texto="Agregá algo del menú de la soda y aquí te aparece."
    >
      <RouterLink :to="{ name: 'soda' }" class="boton boton--accion"
        >Ver el menú</RouterLink
      >
    </EstadoVacio>

    <div v-else class="distribucion">
      <section aria-labelledby="t-productos">
        <h2 id="t-productos" class="solo-lectores">Productos</h2>
        <ul class="items">
          <li v-for="item in carrito.items" :key="item.productoId" class="item">
            <FotoComida :src="item.foto" alt="" class="item__foto" />
            <div class="item__info">
              <p class="item__nombre">{{ item.nombre }}</p>
              <p class="item__precio">
                {{ colones(item.precio) }}
                <span v-if="item.cantidad > 1" class="texto-suave"
                  >· {{ colones(item.precio * item.cantidad) }} en total</span
                >
              </p>
              <p v-if="item.agotado" class="item__agotado">
                <TriangleAlert :size="16" aria-hidden="true" /> Se agotó.
                Quitalo para seguir.
              </p>
            </div>
            <Cantidad
              class="item__cantidad"
              :valor="item.cantidad"
              :nombre="item.nombre"
              @cambiar="(n) => carrito.cambiarCantidad(item.productoId, n)"
            />
            <div class="item__nota">
              <button
                v-if="!notasAbiertas.has(item.productoId) && !item.nota"
                type="button"
                class="boton boton--texto boton--pequeno"
                @click="alternarNota(item.productoId)"
              >
                <MessageSquareText :size="16" aria-hidden="true" /> Agregar nota
              </button>
              <template v-else>
                <label class="solo-lectores" :for="`nota-${item.productoId}`"
                  >Nota para {{ item.nombre }}</label
                >
                <input
                  :id="`nota-${item.productoId}`"
                  class="entrada entrada--nota"
                  :value="item.nota"
                  maxlength="140"
                  placeholder="Ejemplo: sin cebolla, con poco azúcar"
                  @input="
                    (e) => carrito.cambiarNota(item.productoId, e.target.value)
                  "
                />
              </template>
            </div>
          </li>
        </ul>
      </section>

      <aside class="resumen" aria-labelledby="t-retiro">
        <h2 id="t-retiro" class="subtitulo">
          <Clock :size="20" aria-hidden="true" /> ¿Cuándo lo retirás?
        </h2>
        <p v-if="sonDeOtroDia" class="nota nota--aviso">
          <TriangleAlert :size="18" aria-hidden="true" />
          <span
            >Por hoy ya pasaron los recreos. Podés dejarlo pedido para el
            {{ fechaIsoLegible(franjas[0].fecha) }}.</span
          >
        </p>

        <div v-if="cargandoFranjas" class="esqueleto" style="height: 150px" />
        <div v-else-if="!franjas.length" class="nota nota--aviso">
          <TriangleAlert :size="18" aria-hidden="true" />
          <span
            >No pudimos cargar las horas de retiro. Revisá tu conexión.</span
          >
        </div>
        <div
          v-else
          id="franjas"
          class="franjas"
          role="radiogroup"
          aria-labelledby="t-retiro"
          tabindex="-1"
          :aria-describedby="errorFranja ? 'franja-error' : undefined"
        >
          <label v-for="f in franjas" :key="claveFranja(f)" class="franja">
            <input
              v-model="elegida"
              type="radio"
              name="franja"
              :value="claveFranja(f)"
            />
            <span class="franja__nombre">{{ f.nombre }}</span>
            <span class="franja__hora">{{ horaLegible(f.inicio) }}</span>
          </label>
        </div>
        <p
          v-if="errorFranja"
          id="franja-error"
          class="campo__error"
          role="alert"
        >
          {{ errorFranja }}
        </p>

        <dl class="totales">
          <div>
            <dt>Productos</dt>
            <dd>{{ carrito.unidades }}</dd>
          </div>
          <div class="totales__total">
            <dt>Total</dt>
            <dd>{{ colones(carrito.total) }}</dd>
          </div>
        </dl>

        <button
          type="button"
          class="boton boton--accion boton--ancho boton--grande"
          :disabled="hayAgotados || !franjas.length"
          @click="continuar"
        >
          Ir a pagar
          <ArrowRight :size="20" aria-hidden="true" />
        </button>
        <RouterLink
          :to="{ name: 'soda' }"
          class="boton boton--texto boton--ancho"
          >Seguir viendo el menú</RouterLink
        >
      </aside>
    </div>
  </div>
</template>

<style scoped>
.distribucion {
  display: grid;
  gap: var(--e-6);
  align-items: start;
}

.items {
  display: flex;
  flex-direction: column;
}

.item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  grid-template-areas:
    'foto info cantidad'
    'foto nota nota';
  gap: var(--e-2) var(--e-3);
  padding-block: var(--e-4);
  border-bottom: 1px solid var(--borde);
}

.item__foto {
  grid-area: foto;
  width: 64px;
  height: 64px;
  border-radius: var(--radio-md);
}

.item__info {
  grid-area: info;
  min-width: 0;
}

.item__nombre {
  font-weight: var(--peso-semi);
}

.item__precio {
  font-size: var(--txt-sm);
  font-variant-numeric: tabular-nums;
}

.item__agotado {
  display: flex;
  align-items: center;
  gap: var(--e-1);
  color: var(--error);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
}

.item__cantidad {
  grid-area: cantidad;
  align-self: start;
}

.item__nota {
  grid-area: nota;
}

.item__nota .boton {
  margin-left: calc(var(--e-3) * -1);
}

.entrada--nota {
  min-height: 40px;
  font-size: var(--txt-sm);
  padding-block: var(--e-2);
}

.resumen {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
  padding: var(--e-5);
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
}

.resumen .subtitulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}

.franjas {
  display: grid;
  gap: var(--e-2);
}

.franja {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  min-height: 52px;
  padding: 0 var(--e-4);
  border: 1.5px solid var(--borde-fuerte);
  border-radius: var(--radio-md);
  cursor: pointer;
}

.franja:has(input:checked) {
  border-color: var(--principal);
  background: var(--principal-suave);
}

.franja input {
  width: 20px;
  height: 20px;
  accent-color: var(--principal-fuerte);
}

.franja__nombre {
  flex: 1;
  font-weight: var(--peso-semi);
}

.franja__hora {
  color: var(--texto-suave);
  font-variant-numeric: tabular-nums;
}

.totales {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  padding-top: var(--e-3);
  border-top: 1px solid var(--borde);
}

.totales div {
  display: flex;
  justify-content: space-between;
}

.totales dt {
  color: var(--texto-suave);
}

.totales dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.totales__total {
  font-size: var(--txt-lg);
  font-weight: var(--peso-extra);
}

.totales__total dt {
  color: var(--texto);
}

@media (min-width: 1024px) {
  .distribucion {
    grid-template-columns: minmax(0, 1fr) 22rem;
  }

  .resumen {
    position: sticky;
    top: var(--e-6);
  }
}
</style>
