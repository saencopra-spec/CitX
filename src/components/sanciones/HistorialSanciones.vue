<script setup>
import { TriangleAlert, Ban } from 'lucide-vue-next'
import { fechaCorta, horaDe } from '@compartido/hora.js'
import { NOMBRE_ESTADO_SANCION, textoFin } from '@compartido/sanciones.js'

/**
 * Lista de alertas y sanciones de una persona. La usan el panel (con quien
 * la puso y el boton de levantar) y la seccion "Mi historial" de la cuenta.
 */
defineProps({
  items: { type: Array, required: true },
  admin: { type: Boolean, default: false },
  /** Id de la sancion que se esta levantando, para apagar su boton. */
  levantando: { type: String, default: '' },
})
defineEmits(['levantar'])

const tonos = {
  alerta: 'aviso',
  activa: 'error',
  cumplida: 'neutra',
  levantada: 'info',
  reemplazada: 'neutra',
}

function cuando(fecha) {
  return `${fechaCorta(fecha)}, ${horaDe(fecha)}`
}
</script>

<template>
  <p v-if="!items.length" class="vacio">
    Sin alertas ni sanciones. Todo en orden.
  </p>
  <ol v-else class="historial">
    <li
      v-for="s in items"
      :key="s.id"
      class="registro"
      :class="`registro--${s.tipo}`"
    >
      <span class="registro__icono" aria-hidden="true">
        <component :is="s.tipo === 'alerta' ? TriangleAlert : Ban" :size="18" />
      </span>
      <div class="registro__cuerpo">
        <p class="registro__titulo">
          <strong>{{ s.tipo === 'alerta' ? 'Alerta' : 'Sanción' }}</strong>
          <span
            v-if="s.tipo === 'sancion'"
            :class="`etiqueta etiqueta--${tonos[s.estado]}`"
            >{{ NOMBRE_ESTADO_SANCION[s.estado] }}</span
          >
          <span class="registro__fecha">{{ cuando(s.creadaEn) }}</span>
        </p>
        <p>{{ s.razon }}</p>
        <p v-if="s.mensaje" class="registro__detalle">
          Mensaje: «{{ s.mensaje }}»
        </p>
        <p v-if="s.tipo === 'sancion'" class="registro__detalle">
          <template v-if="s.permanente">Permanente</template>
          <template v-else>Hasta {{ textoFin(s.hasta) }}</template>
          <template v-if="s.levantadaEn">
            · {{ s.estado === 'reemplazada' ? 'reemplazada' : 'levantada' }} el
            {{ cuando(s.levantadaEn) }}</template
          >
        </p>
        <p v-if="s.pedidoCodigo" class="registro__detalle">
          Pedido {{ s.pedidoCodigo }}
        </p>
        <p v-if="admin && s.creadaPor" class="registro__detalle">
          Puesta por {{ s.creadaPor.nombre
          }}<template v-if="s.levantada?.por && s.levantada.motivo === 'admin'"
            >· levantada por {{ s.levantada.por.nombre }}</template
          >
        </p>
      </div>
      <button
        v-if="admin && s.estado === 'activa'"
        type="button"
        class="boton boton--contorno boton--pequeno"
        :disabled="levantando === s.id"
        @click="$emit('levantar', s)"
      >
        {{ levantando === s.id ? 'Levantando...' : 'Levantar' }}
      </button>
    </li>
  </ol>
</template>

<style scoped>
.vacio {
  margin: 0;
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.historial {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.registro {
  display: flex;
  align-items: flex-start;
  gap: var(--e-3);
  padding: var(--e-3);
  border: 1px solid var(--borde);
  border-radius: var(--radio-md);
  background: var(--superficie);
  font-size: var(--txt-sm);
}

.registro__icono {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radio-pildora);
}

.registro--alerta .registro__icono {
  background: var(--aviso-fondo);
  color: var(--aviso);
}

.registro--sancion .registro__icono {
  background: var(--error-fondo);
  color: var(--error);
}

.registro__cuerpo {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.registro__cuerpo p {
  margin: 0;
  overflow-wrap: anywhere;
}

.registro__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
}

.registro__fecha,
.registro__detalle {
  color: var(--texto-suave);
}

.registro__fecha {
  margin-left: auto;
  font-size: var(--txt-xs);
}
</style>
