import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/lib/api'
import { LUGARES_CIT } from '@compartido/campus.js'

/**
 * Lugares del mapa. Se piden una vez y se guardan; si no hay conexion se usan
 * los lugares oficiales que vienen con la app.
 */
export const useLugares = defineStore('lugares', () => {
  const lista = ref(LUGARES_CIT.map((l) => ({ notaAcceso: '', ...l })))
  const cargados = ref(false)
  const sinConexion = ref(false)
  let promesa = null

  const porClave = computed(() =>
    Object.fromEntries(lista.value.map((l) => [l.clave, l]))
  )

  async function cargar({ forzar = false } = {}) {
    if (cargados.value && !forzar) return lista.value
    if (promesa && !forzar) return promesa
    promesa = api
      .get('/lugares')
      .then((d) => {
        if (d.lugares?.length) lista.value = d.lugares
        cargados.value = true
        sinConexion.value = false
        return lista.value
      })
      .catch(() => {
        sinConexion.value = true
        return lista.value
      })
      .finally(() => (promesa = null))
    return promesa
  }

  function nombreDe(clave) {
    return porClave.value[clave]?.nombre ?? null
  }

  function reemplazar(lugar) {
    const i = lista.value.findIndex((l) => l.clave === lugar.clave)
    if (i === -1) lista.value.push(lugar)
    else lista.value[i] = lugar
  }

  function quitar(clave) {
    lista.value = lista.value.filter((l) => l.clave !== clave)
  }

  return {
    lista,
    cargados,
    sinConexion,
    porClave,
    cargar,
    nombreDe,
    reemplazar,
    quitar,
  }
})
