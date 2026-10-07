<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Download,
  Trophy,
  CalendarRange,
  Clock,
  Tags,
  CreditCard,
  Star,
  PackageX,
  Table2,
} from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import { api } from '@/lib/api'
import { useAvisos } from '@/stores/avisos'
import { colones } from '@compartido/dinero.js'
import { fechaCorta, fechaDesdeCR, horaLegible } from '@compartido/hora.js'
import { METODOS_PAGO } from '@compartido/pedidos.js'

const avisos = useAvisos()
const dias = ref(30)
const datos = ref(null)
const cargando = ref(true)
const verTablas = ref(false)

const NOMBRE_CATEGORIA = {
  desayunos: 'Desayunos',
  almuerzos: 'Almuerzos',
  bebidas: 'Bebidas',
  snacks: 'Snacks',
  otros: 'Otros',
}

async function cargar() {
  cargando.value = true
  try {
    datos.value = await api.get(`/reportes/soda?dias=${dias.value}`)
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
}

function cambiarPeriodo(d) {
  dias.value = d
  cargar()
}

const maxTop = computed(() =>
  Math.max(1, ...(datos.value?.masVendidos ?? []).map((t) => t.unidades))
)
const maxDia = computed(() =>
  Math.max(1, ...(datos.value?.porDia ?? []).map((d) => d.ingresos))
)
const maxCategoria = computed(() =>
  Math.max(1, ...(datos.value?.porCategoria ?? []).map((c) => c.ingresos))
)
const maxMetodo = computed(() =>
  Math.max(1, ...(datos.value?.porMetodo ?? []).map((m) => m.pedidos))
)
const maxFranja = computed(() =>
  Math.max(1, ...(datos.value?.porFranja ?? []).map((m) => m.pedidos))
)

/** Horas de 6 a. m. a 4 p. m., aunque alguna no tenga pedidos. */
const horas = computed(() => {
  const mapa = new Map(
    (datos.value?.porHora ?? []).map((h) => [h.hora, h.pedidos])
  )
  const lista = []
  for (let h = 6; h <= 16; h++)
    lista.push({ hora: h, pedidos: mapa.get(h) ?? 0 })
  for (const [h, n] of mapa)
    if (h < 6 || h > 16) lista.push({ hora: h, pedidos: n })
  return lista.sort((a, b) => a.hora - b.hora)
})
const maxHora = computed(() =>
  Math.max(1, ...horas.value.map((h) => h.pedidos))
)
const horaPico = computed(() =>
  horas.value.reduce((m, h) => (h.pedidos > (m?.pedidos ?? 0) ? h : m), null)
)

const mejorDia = computed(() =>
  (datos.value?.porDia ?? []).reduce(
    (m, d) => (d.ingresos > (m?.ingresos ?? 0) ? d : m),
    null
  )
)

function etiquetaDia(iso) {
  return fechaCorta(fechaDesdeCR(iso, '12:00'))
}

function pct(valor, maximo) {
  return `${Math.max(2, Math.round((valor / maximo) * 100))}%`
}

/** Descarga un CSV que se abre en Excel (separado por punto y coma). */
function descargarCSV() {
  const d = datos.value
  const filas = [
    ['Reporte de la soda Armonía', `Del ${d.desde} al ${d.hasta}`],
    [],
    ['Producto', 'Categoría', 'Unidades', 'Ingresos (colones)', 'Pedidos'],
    ...d.masVendidos.map((t) => [
      t.nombre,
      NOMBRE_CATEGORIA[t.categoria] ?? '',
      t.unidades,
      t.ingresos,
      t.pedidos,
    ]),
    [],
    ['Fecha', 'Pedidos', 'Ingresos (colones)'],
    ...d.porDia.map((x) => [x.fecha, x.pedidos, x.ingresos]),
  ]
  const texto = filas
    .map((f) =>
      f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')
    )
    .join('\r\n')
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte-soda-${d.desde}-a-${d.hasta}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(cargar)
</script>

<template>
  <div class="reportes">
    <EncabezadoPanel
      titulo="Reportes de la soda"
      ayuda="Qué se vende más, cuánto entra cada día y a qué hora se pide. Los montos son de los pedidos hechos en CitX (el pago es simulado)."
    >
      <template #acciones>
        <button
          type="button"
          class="boton boton--contorno boton--pequeno"
          :aria-pressed="verTablas"
          @click="verTablas = !verTablas"
        >
          <Table2 :size="16" aria-hidden="true" />
          {{ verTablas ? 'Ver gráficos' : 'Ver como tabla' }}
        </button>
        <button
          type="button"
          class="boton boton--accion boton--pequeno"
          :disabled="!datos"
          @click="descargarCSV"
        >
          <Download :size="16" aria-hidden="true" /> Descargar para Excel
        </button>
      </template>
    </EncabezadoPanel>

    <div class="segmentos periodo" role="group" aria-label="Período">
      <button
        v-for="d in [7, 30, 90]"
        :key="d"
        type="button"
        :aria-pressed="dias === d"
        @click="cambiarPeriodo(d)"
      >
        Últimos {{ d }} días
      </button>
    </div>

    <div v-if="cargando && !datos" class="esqueleto" style="height: 420px" />

    <EstadoVacio
      v-else-if="datos && !datos.resumen.pedidos"
      :icono="CalendarRange"
      titulo="Todavía no hay pedidos en este período"
      texto="Cuando la gente empiece a pedir desde CitX, aquí vas a ver qué se vende más."
    />

    <template v-else-if="datos">
      <div class="cifras" :aria-busy="cargando">
        <div class="cifra cifra--grande">
          <span class="cifra__texto">Ingresos</span>
          <span class="cifra__numero">{{
            colones(datos.resumen.ingresos)
          }}</span>
        </div>
        <div class="cifra">
          <span class="cifra__texto">Pedidos</span>
          <span class="cifra__numero">{{ datos.resumen.pedidos }}</span>
        </div>
        <div class="cifra">
          <span class="cifra__texto">Promedio por pedido</span>
          <span class="cifra__numero">{{
            colones(datos.resumen.ticketPromedio)
          }}</span>
        </div>
        <div class="cifra">
          <span class="cifra__texto">Productos vendidos</span>
          <span class="cifra__numero">{{ datos.resumen.unidades }}</span>
        </div>
        <div class="cifra">
          <span class="cifra__texto">Personas que pidieron</span>
          <span class="cifra__numero">{{ datos.resumen.clientes }}</span>
        </div>
      </div>

      <div class="rejilla">
        <!-- Mas vendidos -->
        <section class="bloque bloque--ancho" aria-labelledby="t-top">
          <h2 id="t-top" class="subtitulo">
            <Trophy :size="20" aria-hidden="true" /> Lo que más se vende
          </h2>
          <p class="bloque__ayuda">
            Unidades vendidas por producto. El más vendido fue
            <strong>{{ datos.masVendidos[0]?.nombre }}</strong
            >.
          </p>
          <table v-if="verTablas" class="tabla">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Unidades</th>
                <th scope="col">Ingresos</th>
                <th scope="col">Pedidos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in datos.masVendidos" :key="t.productoId">
                <td>{{ t.nombre }}</td>
                <td>{{ t.unidades }}</td>
                <td>{{ colones(t.ingresos) }}</td>
                <td>{{ t.pedidos }}</td>
              </tr>
            </tbody>
          </table>
          <ol v-else class="barras-h">
            <li
              v-for="(t, i) in datos.masVendidos"
              :key="t.productoId"
              class="barra-h"
              :title="`${t.nombre}: ${t.unidades} unidades, ${colones(t.ingresos)}`"
            >
              <span class="barra-h__nombre"
                ><span class="barra-h__pos">{{ i + 1 }}</span
                >{{ t.nombre }}</span
              >
              <span class="barra-h__pista">
                <span
                  class="barra-h__relleno"
                  :class="{ 'es-primero': i === 0 }"
                  :style="{ width: pct(t.unidades, maxTop) }"
                />
              </span>
              <span class="barra-h__valor"
                >{{ t.unidades }}
                <small>· {{ colones(t.ingresos) }}</small></span
              >
            </li>
          </ol>
        </section>

        <!-- Por dia -->
        <section class="bloque bloque--ancho" aria-labelledby="t-dia">
          <h2 id="t-dia" class="subtitulo">
            <CalendarRange :size="20" aria-hidden="true" /> Ingresos por día
          </h2>
          <p v-if="mejorDia" class="bloque__ayuda">
            El mejor día fue el {{ etiquetaDia(mejorDia.fecha) }}, con
            {{ colones(mejorDia.ingresos) }} en {{ mejorDia.pedidos }} pedidos.
          </p>
          <table v-if="verTablas" class="tabla">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Pedidos</th>
                <th scope="col">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in datos.porDia" :key="d.fecha">
                <td>{{ etiquetaDia(d.fecha) }}</td>
                <td>{{ d.pedidos }}</td>
                <td>{{ colones(d.ingresos) }}</td>
              </tr>
            </tbody>
          </table>
          <div
            v-else
            class="columnas-grafico"
            :class="{ 'columnas-grafico--densas': datos.porDia.length > 31 }"
            role="img"
            :aria-label="`Ingresos por día durante los últimos ${dias} días. Mejor día: ${mejorDia ? etiquetaDia(mejorDia.fecha) : 'ninguno'}.`"
          >
            <div
              v-for="d in datos.porDia"
              :key="d.fecha"
              class="col"
              tabindex="0"
              :aria-label="`${etiquetaDia(d.fecha)}: ${colones(d.ingresos)}, ${d.pedidos} pedidos`"
            >
              <span
                class="col__barra"
                :style="{ height: d.ingresos ? pct(d.ingresos, maxDia) : '0%' }"
              />
              <span class="col__tip" aria-hidden="true"
                >{{ etiquetaDia(d.fecha) }}<br /><strong>{{
                  colones(d.ingresos)
                }}</strong
                ><br />{{ d.pedidos }} pedidos</span
              >
            </div>
          </div>
          <div v-if="!verTablas" class="eje">
            <span>{{ etiquetaDia(datos.desde) }}</span
            ><span>{{ etiquetaDia(datos.hasta) }}</span>
          </div>
        </section>

        <!-- Horas pico -->
        <section class="bloque" aria-labelledby="t-hora">
          <h2 id="t-hora" class="subtitulo">
            <Clock :size="20" aria-hidden="true" /> A qué hora piden
          </h2>
          <p v-if="horaPico" class="bloque__ayuda">
            La hora con más pedidos es de
            {{ horaLegible(horaPico.hora * 60) }} a
            {{ horaLegible(horaPico.hora * 60 + 59) }}.
          </p>
          <ul class="barras-h barras-h--compactas">
            <li
              v-for="h in horas"
              :key="h.hora"
              class="barra-h"
              :title="`${h.pedidos} pedidos`"
            >
              <span class="barra-h__nombre">{{
                horaLegible(h.hora * 60)
              }}</span>
              <span class="barra-h__pista"
                ><span
                  class="barra-h__relleno"
                  :class="{ 'es-primero': h === horaPico }"
                  :style="{
                    width: h.pedidos ? pct(h.pedidos, maxHora) : '0%',
                  }"
              /></span>
              <span class="barra-h__valor">{{ h.pedidos }}</span>
            </li>
          </ul>
        </section>

        <!-- Categorias -->
        <section class="bloque" aria-labelledby="t-cat">
          <h2 id="t-cat" class="subtitulo">
            <Tags :size="20" aria-hidden="true" /> Por categoría
          </h2>
          <ul class="barras-h barras-h--compactas">
            <li
              v-for="c in datos.porCategoria"
              :key="c.categoria"
              class="barra-h"
              :title="`${c.unidades} unidades`"
            >
              <span class="barra-h__nombre">{{
                NOMBRE_CATEGORIA[c.categoria] ?? c.categoria
              }}</span>
              <span class="barra-h__pista"
                ><span
                  class="barra-h__relleno"
                  :style="{ width: pct(c.ingresos, maxCategoria) }"
              /></span>
              <span class="barra-h__valor">{{ colones(c.ingresos) }}</span>
            </li>
          </ul>

          <h3 class="subtitulo subtitulo--chico">Hora de retiro elegida</h3>
          <ul class="barras-h barras-h--compactas">
            <li v-for="f in datos.porFranja" :key="f.franja" class="barra-h">
              <span class="barra-h__nombre">{{ f.franja }}</span>
              <span class="barra-h__pista"
                ><span
                  class="barra-h__relleno"
                  :style="{ width: pct(f.pedidos, maxFranja) }"
              /></span>
              <span class="barra-h__valor">{{ f.pedidos }}</span>
            </li>
          </ul>
        </section>

        <!-- Metodos de pago -->
        <section class="bloque" aria-labelledby="t-pago">
          <h2 id="t-pago" class="subtitulo">
            <CreditCard :size="20" aria-hidden="true" /> Cómo pagan
          </h2>
          <ul class="barras-h barras-h--compactas">
            <li
              v-for="m in datos.porMetodo"
              :key="m.metodo"
              class="barra-h"
              :title="colones(m.ingresos)"
            >
              <span class="barra-h__nombre">{{
                METODOS_PAGO[m.metodo] ?? m.metodo
              }}</span>
              <span class="barra-h__pista"
                ><span
                  class="barra-h__relleno"
                  :style="{ width: pct(m.pedidos, maxMetodo) }"
              /></span>
              <span class="barra-h__valor"
                >{{ m.pedidos }}
                <small
                  >·
                  {{
                    Math.round((m.pedidos / datos.resumen.pedidos) * 100)
                  }}%</small
                ></span
              >
            </li>
          </ul>
        </section>

        <!-- Calificaciones -->
        <section class="bloque" aria-labelledby="t-estrellas">
          <h2 id="t-estrellas" class="subtitulo">
            <Star :size="20" aria-hidden="true" /> Mejor calificados
          </h2>
          <ol v-if="datos.mejorCalificados.length" class="lista-simple">
            <li v-for="p in datos.mejorCalificados" :key="p.nombre">
              <span>{{ p.nombre }}</span>
              <span class="lista-simple__dato"
                >{{ p.calificacion.toFixed(1) }} de 5 ({{ p.cantidad }})</span
              >
            </li>
          </ol>
          <p v-else class="texto-suave">Todavía no hay calificaciones.</p>
        </section>

        <!-- Sin ventas -->
        <section class="bloque" aria-labelledby="t-sin">
          <h2 id="t-sin" class="subtitulo">
            <PackageX :size="20" aria-hidden="true" /> Sin ventas en el período
          </h2>
          <p class="bloque__ayuda">
            Productos que nadie pidió. Puede valer la pena revisarlos o sacarlos
            del menú.
          </p>
          <ul v-if="datos.sinVentas.length" class="lista-simple">
            <li v-for="p in datos.sinVentas" :key="p.nombre">
              <span>{{ p.nombre }}</span>
              <span class="lista-simple__dato">{{
                p.disponible ? NOMBRE_CATEGORIA[p.categoria] : 'Agotado'
              }}</span>
            </li>
          </ul>
          <p v-else class="texto-suave">
            Todo el menú se vendió al menos una vez.
          </p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.periodo {
  margin-bottom: var(--e-5);
}

.cifras {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(10rem, 100%), 1fr));
  gap: var(--e-3);
  margin-bottom: var(--e-4);
}

.cifra {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--e-4);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.cifra--grande {
  background: var(--marca);
  border-color: var(--marca);
  color: #ffffff;
}

:root[data-tema='oscuro'] .cifra--grande {
  color: var(--gris-950);
}

.cifra__texto {
  font-size: var(--txt-sm);
  opacity: 0.85;
}

.cifra__numero {
  font-size: var(--txt-2xl);
  font-weight: var(--peso-extra);
  font-variant-numeric: tabular-nums;
}

.rejilla {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--e-3);
}

.bloque {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  min-width: 0;
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.subtitulo {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}

.subtitulo--chico {
  font-size: var(--txt-md);
  margin-top: var(--e-3);
}

.bloque__ayuda {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  margin-top: calc(var(--e-2) * -1);
}

.barras-h {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.barra-h {
  display: grid;
  grid-template-columns: minmax(7rem, 14rem) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--e-3);
  font-size: var(--txt-sm);
  padding: 2px 0;
}

.barras-h--compactas .barra-h {
  grid-template-columns: minmax(5.5rem, 9rem) minmax(0, 1fr) auto;
}

.barra-h:hover .barra-h__relleno {
  filter: brightness(1.12);
}

.barra-h__nombre {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.barra-h__pos {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--superficie-3);
  color: var(--texto-suave);
  font-size: var(--txt-xs);
  font-weight: var(--peso-fuerte);
}

.barra-h__pista {
  height: 14px;
  border-radius: 4px;
  background: var(--superficie-3);
  overflow: hidden;
}

.barra-h__relleno {
  display: block;
  height: 100%;
  border-radius: 0 4px 4px 0;
  background: var(--accion);
  transition: width var(--dur-lenta) var(--curva);
}

.barra-h__relleno.es-primero {
  background: var(--principal-fuerte);
}

.barra-h__valor {
  font-weight: var(--peso-semi);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.barra-h__valor small {
  color: var(--texto-suave);
  font-weight: var(--peso-normal);
}

.columnas-grafico {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 180px;
  padding-top: var(--e-2);
  border-bottom: 1px solid var(--borde-fuerte);
}

.col {
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  outline: none;
}

.col__barra {
  display: block;
  width: 100%;
  min-height: 0;
  border-radius: 4px 4px 0 0;
  background: var(--accion);
  transition: height var(--dur-lenta) var(--curva);
}

.col:hover .col__barra,
.col:focus-visible .col__barra {
  background: var(--principal-fuerte);
}

.col__tip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: none;
  padding: var(--e-2) var(--e-3);
  border-radius: var(--radio-sm);
  background: var(--gris-900);
  color: #ffffff;
  font-size: var(--txt-xs);
  line-height: 1.35;
  white-space: nowrap;
  pointer-events: none;
}

.col:hover .col__tip,
.col:focus-visible .col__tip {
  display: block;
}

.col:first-child .col__tip {
  left: 0;
  transform: none;
}

.col:last-child .col__tip {
  left: auto;
  right: 0;
  transform: none;
}

.eje {
  display: flex;
  justify-content: space-between;
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
  margin-top: calc(var(--e-2) * -1);
}

.lista-simple {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  font-size: var(--txt-sm);
}

.lista-simple li {
  display: flex;
  justify-content: space-between;
  gap: var(--e-3);
  padding-bottom: var(--e-2);
  border-bottom: 1px solid var(--borde-sutil);
}

.lista-simple__dato {
  color: var(--texto-suave);
  white-space: nowrap;
}

@media (max-width: 520px) {
  .barra-h,
  .barras-h--compactas .barra-h {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .barra-h__pista {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}

@media (min-width: 1024px) {
  .rejilla {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bloque--ancho {
    grid-column: 1 / -1;
  }
}
</style>
