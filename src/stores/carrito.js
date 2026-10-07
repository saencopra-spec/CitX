import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { calcularTotal, contarUnidades } from '@compartido/dinero.js'

const CLAVE = 'citx:carrito'

function leer() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) ?? '{}')
    return {
      items: Array.isArray(datos.items) ? datos.items : [],
      franja: datos.franja ?? null,
    }
  } catch {
    return { items: [], franja: null }
  }
}

/**
 * Carrito de la soda. Se guarda en el navegador para no perderlo si se
 * recarga la pagina. El precio real lo vuelve a calcular el servidor.
 */
export const useCarrito = defineStore('carrito', () => {
  const inicial = leer()
  const items = ref(inicial.items)
  const franja = ref(inicial.franja)
  /** Aumenta cada vez que se agrega algo, para animar el icono. */
  const pulso = ref(0)

  const total = computed(() => calcularTotal(items.value))
  const unidades = computed(() => contarUnidades(items.value))
  const vacio = computed(() => items.value.length === 0)

  function cantidadDe(productoId) {
    return items.value.find((i) => i.productoId === productoId)?.cantidad ?? 0
  }

  function agregar(producto, cantidad = 1) {
    const existente = items.value.find((i) => i.productoId === producto.id)
    if (existente) {
      existente.cantidad = Math.min(20, existente.cantidad + cantidad)
    } else {
      items.value.push({
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        foto: producto.foto,
        cantidad,
        nota: '',
      })
    }
    pulso.value++
  }

  function cambiarCantidad(productoId, cantidad) {
    const item = items.value.find((i) => i.productoId === productoId)
    if (!item) return
    if (cantidad <= 0) quitar(productoId)
    else item.cantidad = Math.min(20, cantidad)
  }

  function cambiarNota(productoId, nota) {
    const item = items.value.find((i) => i.productoId === productoId)
    if (item) item.nota = nota.slice(0, 140)
  }

  function quitar(productoId) {
    items.value = items.value.filter((i) => i.productoId !== productoId)
  }

  /** Actualiza precios y quita lo que ya no existe segun el menu actual. */
  function sincronizarConMenu(productos) {
    const porId = new Map(productos.map((p) => [p.id, p]))
    items.value = items.value
      .filter((i) => porId.has(i.productoId))
      .map((i) => {
        const p = porId.get(i.productoId)
        return {
          ...i,
          nombre: p.nombre,
          precio: p.precio,
          foto: p.foto,
          agotado: !p.disponible,
        }
      })
  }

  function vaciar() {
    items.value = []
    franja.value = null
  }

  watch(
    [items, franja],
    () => {
      try {
        localStorage.setItem(
          CLAVE,
          JSON.stringify({ items: items.value, franja: franja.value })
        )
      } catch {
        // Sin almacenamiento: el carrito dura mientras la pagina este abierta.
      }
    },
    { deep: true }
  )

  return {
    items,
    franja,
    pulso,
    total,
    unidades,
    vacio,
    cantidadDe,
    agregar,
    cambiarCantidad,
    cambiarNota,
    quitar,
    sincronizarConMenu,
    vaciar,
  }
})
