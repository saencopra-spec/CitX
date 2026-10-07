<script setup>
import { computed, onMounted, ref } from 'vue'
import { TicketPlus, Copy, Ban, ShieldCheck, Check } from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import Campo from '@/components/Campo.vue'
import Dialogo from '@/components/Dialogo.vue'
import EstadoVacio from '@/components/EstadoVacio.vue'
import { api } from '@/lib/api'
import { usarErrores } from '@/lib/errores'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import {
  NOMBRE_ROL,
  ROLES_PERSONAL,
  PERMISOS,
  PERMISOS_ASIGNABLES,
  PERMISOS_POR_ROL,
} from '@compartido/permisos.js'
import { fechaRelativa, horaDe } from '@compartido/hora.js'

const avisos = useAvisos()
const confirmar = useConfirmar()
const { errores, limpiar, mostrar } = usarErrores()

const invitaciones = ref([])
const cargando = ref(true)
const filtro = ref('activa')

const opcionesRol = ROLES_PERSONAL.map((r) => ({
  valor: r,
  texto: NOMBRE_ROL[r],
}))
const opcionesVence = [
  { valor: 24, texto: '1 día' },
  { valor: 48, texto: '2 días' },
  { valor: 168, texto: '1 semana' },
]

function vacio() {
  return {
    rol: 'profesor',
    nota: '',
    horas: 48,
    usosMaximos: 1,
    personalizar: false,
    permisos: [...PERMISOS_POR_ROL.profesor],
  }
}
const formulario = ref(vacio())
const creando = ref(false)
const codigoNuevo = ref(null)
const copiado = ref(false)

function alCambiarRol() {
  formulario.value.permisos = [
    ...(PERMISOS_POR_ROL[formulario.value.rol] ?? []),
  ]
}

const visibles = computed(() =>
  filtro.value === 'todas'
    ? invitaciones.value
    : invitaciones.value.filter((i) => i.estado === filtro.value)
)

const textoEstado = {
  activa: 'Activa',
  usada: 'Usada',
  vencida: 'Vencida',
  revocada: 'Revocada',
}
const tonoEstado = {
  activa: 'exito',
  usada: 'neutra',
  vencida: 'aviso',
  revocada: 'error',
}

async function crear() {
  creando.value = true
  limpiar()
  try {
    const f = formulario.value
    const r = await api.post('/invitaciones', {
      rol: f.rol,
      nota: f.nota,
      horas: Number(f.horas),
      usosMaximos: Number(f.usosMaximos),
      permisos: f.personalizar && f.rol !== 'admin' ? f.permisos : null,
    })
    invitaciones.value.unshift(r.invitacion)
    codigoNuevo.value = { codigo: r.codigo, ...r.invitacion }
    copiado.value = false
    formulario.value = vacio()
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    creando.value = false
  }
}

async function copiar() {
  try {
    await navigator.clipboard.writeText(codigoNuevo.value.codigo)
    copiado.value = true
  } catch {
    avisos.aviso('No se pudo copiar. Anotalo a mano.')
  }
}

async function revocar(i) {
  const si = await confirmar.preguntar({
    titulo: '¿Revocar esta invitación?',
    mensaje: `El código para "${i.nota}" deja de servir. Las cuentas que ya se crearon con él no cambian.`,
    aceptar: 'Revocar',
  })
  if (!si) return
  try {
    const { invitacion } = await api.delete(`/invitaciones/${i.id}`)
    Object.assign(i, invitacion)
    avisos.exito('Invitación revocada.')
  } catch (e) {
    avisos.error(e.message)
  }
}

onMounted(async () => {
  try {
    invitaciones.value = (await api.get('/invitaciones')).invitaciones
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
      titulo="Invitaciones para el personal"
      ayuda="Así se da acceso a profesores, personal administrativo y la soda: generás un código, se lo pasás a la persona y ella lo escribe al crear su cuenta. Cada quien tiene su propia cuenta."
    />

    <div class="seguridad nota">
      <ShieldCheck :size="20" aria-hidden="true" />
      <span>
        Por seguridad, el código se muestra <strong>una sola vez</strong>, sirve
        la cantidad de veces que elijás y vence solo. Si se pierde o se filtra,
        revocalo y generá otro. Nadie puede registrarse como personal sin uno.
      </span>
    </div>

    <div class="distribucion">
      <form class="bloque formulario" novalidate @submit.prevent="crear">
        <h2 class="subtitulo">
          <TicketPlus :size="20" aria-hidden="true" /> Nueva invitación
        </h2>
        <Campo
          id="inv-nota"
          v-model="formulario.nota"
          etiqueta="¿Para quién es?"
          placeholder="Por ejemplo: Profesora de Inglés de 10.°"
          obligatorio
          :maximo="80"
          :error="errores.nota"
        />
        <Campo
          id="inv-rol"
          v-model="formulario.rol"
          etiqueta="Tipo de cuenta"
          tipo="select"
          :opciones="opcionesRol"
          @update:model-value="alCambiarRol"
        />
        <div class="dos">
          <Campo
            id="inv-vence"
            v-model="formulario.horas"
            etiqueta="Vence en"
            tipo="select"
            :opciones="opcionesVence"
          />
          <Campo
            id="inv-usos"
            v-model="formulario.usosMaximos"
            etiqueta="Cuántas personas lo pueden usar"
            tipo="number"
            :min="1"
            :max="50"
            ayuda="Normalmente 1. Más de 1 sirve para un grupo, como todo el equipo de la soda."
          />
        </div>

        <p v-if="formulario.rol === 'admin'" class="nota nota--aviso">
          <ShieldCheck :size="18" aria-hidden="true" />
          <span
            >Un administrador puede hacer todo, incluso borrar cuentas. Dalo
            solo a quien de verdad lo necesite.</span
          >
        </p>
        <template v-else>
          <div class="interruptor-fila">
            <button
              id="inv-personalizar"
              type="button"
              role="switch"
              class="interruptor"
              :aria-checked="formulario.personalizar"
              @click="formulario.personalizar = !formulario.personalizar"
            />
            <label for="inv-personalizar">Elegir los permisos a mano</label>
          </div>
          <p v-if="!formulario.personalizar" class="campo__ayuda">
            Va a tener los permisos normales de
            {{ NOMBRE_ROL[formulario.rol].toLowerCase() }}:
            {{
              (PERMISOS_POR_ROL[formulario.rol] ?? [])
                .map((p) => PERMISOS[p].nombre.toLowerCase())
                .join(', ') || 'ninguno'
            }}.
          </p>
          <fieldset v-else class="permisos">
            <legend class="solo-lectores">Permisos</legend>
            <label v-for="p in PERMISOS_ASIGNABLES" :key="p" class="permiso">
              <input v-model="formulario.permisos" type="checkbox" :value="p" />
              <span>
                <strong>{{ PERMISOS[p].nombre }}</strong>
                <small>{{ PERMISOS[p].explica }}</small>
              </span>
            </label>
          </fieldset>
        </template>

        <button type="submit" class="boton boton--accion" :disabled="creando">
          <TicketPlus :size="18" aria-hidden="true" />
          {{ creando ? 'Generando...' : 'Generar código' }}
        </button>
      </form>

      <section aria-labelledby="t-lista">
        <div class="lista-encabezado">
          <h2 id="t-lista" class="subtitulo">Invitaciones</h2>
          <div class="segmentos" role="group" aria-label="Filtrar">
            <button
              v-for="f in ['activa', 'usada', 'todas']"
              :key="f"
              type="button"
              :aria-pressed="filtro === f"
              @click="filtro = f"
            >
              {{ f === 'todas' ? 'Todas' : textoEstado[f] + 's' }}
            </button>
          </div>
        </div>
        <div v-if="cargando" class="esqueleto" style="height: 200px" />
        <EstadoVacio
          v-else-if="!visibles.length"
          :icono="TicketPlus"
          titulo="No hay invitaciones aquí"
          texto="Las que generés aparecen en esta lista."
        />
        <ul v-else class="lista">
          <li v-for="i in visibles" :key="i.id" class="invitacion">
            <div class="invitacion__cuerpo">
              <p class="invitacion__titulo">
                {{ i.nota }}
                <span
                  class="etiqueta"
                  :class="`etiqueta--${tonoEstado[i.estado]}`"
                  >{{ textoEstado[i.estado] }}</span
                >
              </p>
              <p class="invitacion__meta">
                {{ NOMBRE_ROL[i.rol] }} · código {{ i.pista }} · usos
                {{ i.usos }} de {{ i.usosMaximos }}
              </p>
              <p class="invitacion__meta">
                Creada por {{ i.creadoPorNombre }}
                {{ fechaRelativa(i.creadoEn) }} ·
                {{ i.estado === 'activa' ? 'vence' : 'venció' }}
                {{ fechaRelativa(i.venceEn) }}, {{ horaDe(i.venceEn) }}
              </p>
              <p v-if="i.usadoPor.length" class="invitacion__meta">
                La usó: {{ i.usadoPor.map((u) => u.nombre).join(', ') }}
              </p>
            </div>
            <button
              v-if="i.estado === 'activa'"
              type="button"
              class="boton boton--texto boton--pequeno peligro"
              @click="revocar(i)"
            >
              <Ban :size="16" aria-hidden="true" /> Revocar
            </button>
          </li>
        </ul>
      </section>
    </div>

    <Dialogo
      :abierto="Boolean(codigoNuevo)"
      titulo="Código listo"
      descripcion="Copialo y pasáselo a la persona. Por seguridad no se vuelve a mostrar."
      modo="centro"
      ancho="28rem"
      @cerrar="codigoNuevo = null"
    >
      <div v-if="codigoNuevo" class="codigo">
        <p class="codigo__texto">{{ codigoNuevo.codigo }}</p>
        <p class="codigo__detalle">
          {{ NOMBRE_ROL[codigoNuevo.rol] }} para {{ codigoNuevo.nota }}. Vence
          {{ fechaRelativa(codigoNuevo.venceEn) }} a las
          {{ horaDe(codigoNuevo.venceEn) }}.
        </p>
        <p class="codigo__pasos">
          La persona entra a CitX, toca «Crear cuenta», elige «Personal del
          colegio» y escribe este código.
        </p>
      </div>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="codigoNuevo = null"
        >
          Listo
        </button>
        <button type="button" class="boton boton--accion" @click="copiar">
          <component
            :is="copiado ? Check : Copy"
            :size="18"
            aria-hidden="true"
          />
          {{ copiado ? 'Copiado' : 'Copiar código' }}
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.seguridad {
  margin-bottom: var(--e-5);
  max-width: 60rem;
}

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
}

.dos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: var(--e-4);
}

.interruptor-fila {
  display: flex;
  align-items: center;
  gap: var(--e-3);
  font-weight: var(--peso-semi);
  font-size: var(--txt-sm);
}

.permisos {
  display: grid;
  gap: var(--e-2);
  border: none;
  padding: 0;
}

.permiso {
  display: flex;
  align-items: flex-start;
  gap: var(--e-3);
  padding: var(--e-2) var(--e-3);
  border-radius: var(--radio-sm);
  border: 1px solid var(--borde);
  cursor: pointer;
}

.permiso:has(input:checked) {
  border-color: var(--principal);
  background: var(--principal-suave);
}

.permiso input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--principal-fuerte);
  flex-shrink: 0;
}

.permiso span {
  display: flex;
  flex-direction: column;
  font-size: var(--txt-sm);
}

.permiso small {
  color: var(--texto-suave);
}

.lista-encabezado {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
  margin-bottom: var(--e-3);
}

.lista {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
}

.invitacion {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--e-2);
  padding: var(--e-4);
  border-radius: var(--radio-md);
  background: var(--superficie);
  border: 1px solid var(--borde);
}

.invitacion__cuerpo {
  flex: 1 1 16rem;
  min-width: 0;
}

.invitacion__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
  font-weight: var(--peso-semi);
}

.invitacion__meta {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.peligro {
  color: var(--error);
}

.codigo {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  text-align: center;
}

.codigo__texto {
  padding: var(--e-4);
  border-radius: var(--radio-md);
  background: var(--superficie-3);
  font-family: var(--fuente-mono);
  font-size: clamp(1.1rem, 5vw, 1.6rem);
  font-weight: var(--peso-extra);
  letter-spacing: 0.08em;
  user-select: all;
  overflow-wrap: anywhere;
}

.codigo__detalle {
  color: var(--texto-suave);
}

.codigo__pasos {
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

@media (min-width: 1100px) {
  .distribucion {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
</style>
