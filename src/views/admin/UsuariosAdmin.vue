<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Search,
  UserPlus,
  TicketCheck,
  ChevronRight,
  KeyRound,
  LogOut,
  UserX,
  UserCheck,
  Trash2,
  ShieldCheck,
  Copy,
  RotateCcw,
} from 'lucide-vue-next'
import EncabezadoPanel from '@/components/EncabezadoPanel.vue'
import Dialogo from '@/components/Dialogo.vue'
import Campo from '@/components/Campo.vue'
import CampoContrasena from '@/components/CampoContrasena.vue'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { useAvisos } from '@/stores/avisos'
import { useConfirmar } from '@/stores/confirmar'
import { usarErrores, opcionesSeccion } from '@/lib/errores'
import {
  ROLES,
  NOMBRE_ROL,
  SECCIONES,
  NOMBRE_NIVEL,
  PERMISOS,
  PERMISOS_ASIGNABLES,
  PERMISOS_POR_ROL,
} from '@compartido/permisos.js'
import { fechaCorta, fechaRelativa, horaDe } from '@compartido/hora.js'

const auth = useAuth()
const avisos = useAvisos()
const confirmar = useConfirmar()

const usuarios = ref([])
const porRol = ref({})
const total = ref(0)
const cargando = ref(true)
const busqueda = ref('')
const rolFiltro = ref('')
const estadoFiltro = ref('')

const opcionesRol = ROLES.map((r) => ({ valor: r, texto: NOMBRE_ROL[r] }))
const opcionesSec = opcionesSeccion(SECCIONES, NOMBRE_NIVEL)

let temporizador = null
async function cargar() {
  cargando.value = true
  try {
    const p = new URLSearchParams()
    if (busqueda.value) p.set('buscar', busqueda.value)
    if (rolFiltro.value) p.set('rol', rolFiltro.value)
    if (estadoFiltro.value) p.set('estado', estadoFiltro.value)
    const datos = await api.get(`/usuarios?${p}`)
    usuarios.value = datos.usuarios
    porRol.value = datos.porRol
    total.value = datos.total
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
}

watch([busqueda, rolFiltro, estadoFiltro], () => {
  clearTimeout(temporizador)
  temporizador = setTimeout(cargar, 300)
})

// --- Detalle de una persona ---
const elegido = ref(null)
const edicion = ref({})
const guardando = ref(false)
const temporal = ref(null)
const detalleErrores = usarErrores()

const esYo = computed(() => elegido.value?.id === auth.usuario?.id)
const ajustaPermisos = computed(() =>
  ['profesor', 'administrativo', 'soda'].includes(edicion.value.rol)
)
const cambioRol = computed(
  () => elegido.value && edicion.value.rol !== elegido.value.rol
)

function abrir(u) {
  elegido.value = u
  temporal.value = null
  detalleErrores.limpiar()
  edicion.value = {
    nombre: u.nombre,
    rol: u.rol,
    seccion: u.seccion ?? '',
    personalizar: u.permisosAjustados,
    permisos: [...u.permisos],
  }
}

function alCambiarRol() {
  edicion.value.permisos = [...(PERMISOS_POR_ROL[edicion.value.rol] ?? [])]
  edicion.value.personalizar = false
}

function reemplazar(u) {
  const i = usuarios.value.findIndex((x) => x.id === u.id)
  if (i !== -1) usuarios.value[i] = u
  if (elegido.value?.id === u.id) elegido.value = u
}

async function guardar() {
  const u = elegido.value
  const e = edicion.value
  if (cambioRol.value) {
    const si = await confirmar.preguntar({
      titulo: `¿Cambiar a ${u.nombre} a ${NOMBRE_ROL[e.rol].toLowerCase()}?`,
      mensaje:
        e.rol === 'admin'
          ? 'Va a poder hacer todo en el panel, incluso borrar cuentas. Se cierran sus sesiones abiertas.'
          : 'Su acceso cambia de inmediato y se cierran sus sesiones abiertas.',
      aceptar: 'Cambiar',
      peligro: e.rol === 'admin',
    })
    if (!si) return
  }
  guardando.value = true
  detalleErrores.limpiar()
  try {
    const cuerpo = { nombre: e.nombre }
    if (cambioRol.value) {
      cuerpo.rol = e.rol
      if (e.rol === 'estudiante') cuerpo.seccion = e.seccion || null
    } else {
      if (e.rol === 'estudiante') cuerpo.seccion = e.seccion || null
      if (ajustaPermisos.value)
        cuerpo.permisos = e.personalizar ? e.permisos : null
    }
    const { usuario } = await api.patch(`/usuarios/${u.id}`, cuerpo)
    reemplazar(usuario)
    abrir(usuario)
    avisos.exito(`Guardamos los cambios de ${usuario.nombre}.`)
  } catch (err) {
    detalleErrores.mostrar(err, { aviso: !err.campos })
  } finally {
    guardando.value = false
  }
}

async function alternarActivo() {
  const u = elegido.value
  const activar = !u.activo
  const si = await confirmar.preguntar({
    titulo: activar
      ? `¿Activar la cuenta de ${u.nombre}?`
      : `¿Desactivar la cuenta de ${u.nombre}?`,
    mensaje: activar
      ? 'Va a poder volver a iniciar sesión.'
      : 'No va a poder entrar hasta que la activés de nuevo. Sus datos no se borran y se cierran sus sesiones abiertas.',
    aceptar: activar ? 'Activar' : 'Desactivar',
    peligro: !activar,
  })
  if (!si) return
  try {
    const { usuario } = await api.patch(`/usuarios/${u.id}`, {
      activo: activar,
    })
    reemplazar(usuario)
    avisos.exito(activar ? 'Cuenta activada.' : 'Cuenta desactivada.')
  } catch (e) {
    avisos.error(e.message)
  }
}

async function contrasenaTemporal() {
  const u = elegido.value
  const si = await confirmar.preguntar({
    titulo: `¿Crear una contraseña temporal para ${u.nombre}?`,
    mensaje:
      'La contraseña actual deja de servir y se cierran sus sesiones. Al entrar, CitX le va a pedir que la cambie.',
    aceptar: 'Crear contraseña',
    peligro: false,
  })
  if (!si) return
  try {
    temporal.value = (
      await api.post(`/usuarios/${u.id}/contrasena-temporal`)
    ).contrasena
  } catch (e) {
    avisos.error(e.message)
  }
}

async function copiarTemporal() {
  try {
    await navigator.clipboard.writeText(temporal.value)
    avisos.exito('Contraseña copiada.')
  } catch {
    avisos.aviso('No se pudo copiar. Anotala a mano.')
  }
}

async function cerrarSesiones() {
  const u = elegido.value
  const si = await confirmar.preguntar({
    titulo: `¿Cerrar las sesiones de ${u.nombre}?`,
    mensaje:
      'Se cierra CitX en todos sus dispositivos. Va a tener que volver a escribir su contraseña.',
    aceptar: 'Cerrar sesiones',
    peligro: false,
  })
  if (!si) return
  try {
    await api.post(`/usuarios/${u.id}/cerrar-sesiones`)
    avisos.exito('Listo. Sus sesiones se cerraron.')
  } catch (e) {
    avisos.error(e.message)
  }
}

async function borrar() {
  const u = elegido.value
  const si = await confirmar.preguntar({
    titulo: `¿Borrar la cuenta de ${u.nombre}?`,
    mensaje: `Se borran su cuenta, sus recordatorios y sus avisos. Sus pedidos quedan en los reportes como "Cuenta borrada". Esto no se puede deshacer. Si solo querés quitarle el acceso por un tiempo, mejor desactivala.`,
    aceptar: 'Sí, borrar cuenta',
  })
  if (!si) return
  try {
    await api.delete(`/usuarios/${u.id}`)
    usuarios.value = usuarios.value.filter((x) => x.id !== u.id)
    total.value--
    elegido.value = null
    avisos.exito('Cuenta borrada.')
  } catch (e) {
    avisos.error(e.message)
  }
}

// --- Crear cuenta directamente ---
const creando = ref(false)
const nueva = ref({})
const guardandoNueva = ref(false)
const nuevaErrores = usarErrores()

function abrirNueva() {
  nueva.value = {
    nombre: '',
    correo: '',
    contrasena: '',
    rol: 'estudiante',
    seccion: '',
  }
  nuevaErrores.limpiar()
  creando.value = true
}

async function crear() {
  guardandoNueva.value = true
  nuevaErrores.limpiar()
  try {
    const { usuario } = await api.post('/usuarios', {
      ...nueva.value,
      seccion: nueva.value.seccion || null,
    })
    usuarios.value.unshift(usuario)
    total.value++
    avisos.exito(
      `Cuenta creada. Al entrar, a ${usuario.nombre} se le va a pedir cambiar la contraseña.`
    )
    creando.value = false
  } catch (e) {
    nuevaErrores.mostrar(e, { aviso: !e.campos })
  } finally {
    guardandoNueva.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Usuarios y permisos"
      ayuda="Tocá una persona para ver sus datos, cambiar su tipo de cuenta o sus permisos, darle una contraseña temporal, desactivarla o borrarla."
    >
      <template #acciones>
        <RouterLink
          :to="{ name: 'admin-invitaciones' }"
          class="boton boton--contorno"
        >
          <TicketCheck :size="18" aria-hidden="true" /> Invitar personal
        </RouterLink>
        <button type="button" class="boton boton--accion" @click="abrirNueva">
          <UserPlus :size="18" aria-hidden="true" /> Crear cuenta
        </button>
      </template>
    </EncabezadoPanel>

    <ul class="conteo" aria-label="Cuentas por tipo">
      <li>
        <strong>{{ total }}</strong> en total
      </li>
      <li v-for="r in ROLES" :key="r">
        <button
          type="button"
          class="conteo__boton"
          :aria-pressed="rolFiltro === r"
          @click="rolFiltro = rolFiltro === r ? '' : r"
        >
          <strong>{{ porRol[r] ?? 0 }}</strong>
          {{ NOMBRE_ROL[r].toLowerCase() }}
        </button>
      </li>
    </ul>

    <div class="filtros">
      <div class="buscador">
        <Search :size="20" aria-hidden="true" />
        <label for="buscar-usuario" class="solo-lectores"
          >Buscar por nombre, correo o sección</label
        >
        <input
          id="buscar-usuario"
          v-model="busqueda"
          type="search"
          class="entrada"
          placeholder="Nombre, correo o sección"
        />
      </div>
      <label class="solo-lectores" for="filtro-rol">Tipo de cuenta</label>
      <select id="filtro-rol" v-model="rolFiltro" class="campo__control filtro">
        <option value="">Todos los tipos</option>
        <option v-for="r in opcionesRol" :key="r.valor" :value="r.valor">
          {{ r.texto }}
        </option>
      </select>
      <label class="solo-lectores" for="filtro-estado">Estado</label>
      <select
        id="filtro-estado"
        v-model="estadoFiltro"
        class="campo__control filtro"
      >
        <option value="">Activas y desactivadas</option>
        <option value="activos">Solo activas</option>
        <option value="desactivados">Solo desactivadas</option>
      </select>
    </div>

    <div
      v-if="cargando && !usuarios.length"
      class="esqueleto"
      style="height: 360px"
    />
    <p v-else-if="!usuarios.length" class="texto-suave">
      No encontramos cuentas con esa búsqueda.
    </p>
    <ul v-else class="personas">
      <li v-for="u in usuarios" :key="u.id">
        <button
          type="button"
          class="persona"
          :class="{ 'es-inactiva': !u.activo }"
          @click="abrir(u)"
        >
          <span class="persona__inicial" :data-rol="u.rol" aria-hidden="true">{{
            u.nombre.trim()[0]?.toUpperCase()
          }}</span>
          <span class="persona__datos">
            <strong>
              {{ u.nombre }}
              <span
                v-if="u.id === auth.usuario?.id"
                class="etiqueta etiqueta--info"
                >Vos</span
              >
            </strong>
            <span class="persona__correo">{{ u.correo }}</span>
          </span>
          <span class="persona__rol">
            <span
              class="etiqueta"
              :class="
                u.rol === 'admin' ? 'etiqueta--principal' : 'etiqueta--neutra'
              "
              >{{ NOMBRE_ROL[u.rol] }}</span
            >
            <span v-if="u.seccion" class="persona__seccion">{{
              u.seccion
            }}</span>
            <span v-if="!u.activo" class="etiqueta etiqueta--error"
              >Desactivada</span
            >
            <span v-if="u.permisosAjustados" class="etiqueta etiqueta--aviso"
              >Permisos ajustados</span
            >
          </span>
          <span class="persona__ingreso">
            {{
              u.ultimoIngreso
                ? `Entró ${fechaRelativa(u.ultimoIngreso)}`
                : `Desde ${fechaCorta(u.creadoEn)}`
            }}
          </span>
          <ChevronRight :size="18" aria-hidden="true" class="persona__flecha" />
        </button>
      </li>
    </ul>

    <!-- Detalle -->
    <Dialogo
      :abierto="Boolean(elegido)"
      :titulo="elegido?.nombre ?? ''"
      :descripcion="elegido?.correo ?? ''"
      ancho="40rem"
      @cerrar="elegido = null"
    >
      <div v-if="elegido" class="detalle">
        <dl class="datos">
          <div>
            <dt>Tipo de cuenta</dt>
            <dd>{{ NOMBRE_ROL[elegido.rol] }}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{{ elegido.activo ? 'Activa' : 'Desactivada' }}</dd>
          </div>
          <div>
            <dt>Creada</dt>
            <dd>
              {{ fechaCorta(elegido.creadoEn)
              }}<template v-if="elegido.invitadoPor">
                · por {{ elegido.invitadoPor }}</template
              >
            </dd>
          </div>
          <div>
            <dt>Último ingreso</dt>
            <dd>
              {{
                elegido.ultimoIngreso
                  ? `${fechaRelativa(elegido.ultimoIngreso)}, ${horaDe(elegido.ultimoIngreso)}`
                  : 'Todavía no'
              }}
            </dd>
          </div>
        </dl>

        <p v-if="temporal" class="temporal">
          <KeyRound :size="18" aria-hidden="true" />
          <span>
            Contraseña temporal:
            <strong class="temporal__clave">{{ temporal }}</strong
            ><br />
            Pasásela a la persona. No se vuelve a mostrar.
          </span>
          <button
            type="button"
            class="boton boton--contorno boton--pequeno"
            @click="copiarTemporal"
          >
            <Copy :size="16" aria-hidden="true" /> Copiar
          </button>
        </p>

        <form
          id="form-detalle"
          class="formulario"
          novalidate
          @submit.prevent="guardar"
        >
          <Campo
            id="de-nombre"
            v-model="edicion.nombre"
            etiqueta="Nombre"
            :error="detalleErrores.errores.nombre"
          />
          <Campo
            id="de-rol"
            v-model="edicion.rol"
            etiqueta="Tipo de cuenta"
            tipo="select"
            :opciones="opcionesRol"
            :ayuda="esYo ? 'No podés quitarte el rol de administrador.' : ''"
            @update:model-value="alCambiarRol"
          />
          <Campo
            v-if="edicion.rol === 'estudiante'"
            id="de-seccion"
            v-model="edicion.seccion"
            etiqueta="Sección"
            tipo="select"
            vacio="Elegí la sección"
            :opciones="opcionesSec"
            :error="detalleErrores.errores.seccion"
          />

          <fieldset v-if="ajustaPermisos" class="permisos">
            <legend class="campo__etiqueta">
              <ShieldCheck :size="16" aria-hidden="true" /> Permisos
            </legend>
            <p v-if="cambioRol" class="campo__ayuda">
              Al cambiar el tipo de cuenta se le dan los permisos normales de
              ese tipo. Después podés ajustarlos.
            </p>
            <template v-else>
              <div class="segmentos" role="group" aria-label="Permisos">
                <button
                  type="button"
                  :aria-pressed="!edicion.personalizar"
                  @click="edicion.personalizar = false"
                >
                  Los de su tipo de cuenta
                </button>
                <button
                  type="button"
                  :aria-pressed="edicion.personalizar"
                  @click="edicion.personalizar = true"
                >
                  Elegir a mano
                </button>
              </div>
              <ul v-if="!edicion.personalizar" class="permisos__lista">
                <li v-for="p in PERMISOS_POR_ROL[edicion.rol]" :key="p">
                  {{ PERMISOS[p].nombre }}
                </li>
              </ul>
              <div v-else class="permisos__opciones">
                <label
                  v-for="p in PERMISOS_ASIGNABLES"
                  :key="p"
                  class="permiso"
                >
                  <input
                    v-model="edicion.permisos"
                    type="checkbox"
                    :value="p"
                  />
                  <span>
                    <strong>{{ PERMISOS[p].nombre }}</strong>
                    <small>{{ PERMISOS[p].explica }}</small>
                  </span>
                </label>
                <button
                  type="button"
                  class="boton boton--texto boton--pequeno"
                  @click="edicion.permisos = [...PERMISOS_POR_ROL[edicion.rol]]"
                >
                  <RotateCcw :size="16" aria-hidden="true" /> Volver a los
                  normales
                </button>
              </div>
            </template>
          </fieldset>
          <p v-else-if="edicion.rol === 'admin'" class="campo__ayuda">
            Un administrador tiene todos los permisos.
          </p>
        </form>

        <div v-if="!esYo" class="acciones">
          <p class="campo__etiqueta">Acciones</p>
          <div class="fila-botones">
            <button
              type="button"
              class="boton boton--contorno boton--pequeno"
              @click="contrasenaTemporal"
            >
              <KeyRound :size="16" aria-hidden="true" /> Contraseña temporal
            </button>
            <button
              type="button"
              class="boton boton--contorno boton--pequeno"
              @click="cerrarSesiones"
            >
              <LogOut :size="16" aria-hidden="true" /> Cerrar sus sesiones
            </button>
            <button
              type="button"
              class="boton boton--contorno boton--pequeno"
              @click="alternarActivo"
            >
              <component
                :is="elegido.activo ? UserX : UserCheck"
                :size="16"
                aria-hidden="true"
              />
              {{ elegido.activo ? 'Desactivar' : 'Activar' }}
            </button>
            <button
              type="button"
              class="boton boton--peligro boton--pequeno"
              @click="borrar"
            >
              <Trash2 :size="16" aria-hidden="true" /> Borrar cuenta
            </button>
          </div>
        </div>
      </div>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="elegido = null"
        >
          Cerrar
        </button>
        <button
          type="submit"
          form="form-detalle"
          class="boton boton--accion"
          :disabled="guardando"
        >
          {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </template>
    </Dialogo>

    <!-- Crear cuenta -->
    <Dialogo
      :abierto="creando"
      titulo="Crear cuenta"
      descripcion="Para el personal es mejor usar una invitación. Esto sirve si la persona no puede registrarse por su cuenta."
      @cerrar="creando = false"
    >
      <form
        id="form-usuario"
        class="formulario"
        novalidate
        @submit.prevent="crear"
      >
        <Campo
          id="nu-nombre"
          v-model="nueva.nombre"
          etiqueta="Nombre"
          obligatorio
          :error="nuevaErrores.errores.nombre"
        />
        <Campo
          id="nu-correo"
          v-model="nueva.correo"
          etiqueta="Correo"
          tipo="email"
          obligatorio
          :error="nuevaErrores.errores.correo"
        />
        <CampoContrasena
          id="nu-clave"
          v-model="nueva.contrasena"
          etiqueta="Contraseña inicial"
          autocompletar="new-password"
          ayuda="Al menos 8 caracteres con letras y números. Al entrar, se le pedirá cambiarla."
          :error="nuevaErrores.errores.contrasena"
        />
        <Campo
          id="nu-rol"
          v-model="nueva.rol"
          etiqueta="Tipo de cuenta"
          tipo="select"
          :opciones="opcionesRol"
        />
        <Campo
          v-if="nueva.rol === 'estudiante'"
          id="nu-seccion"
          v-model="nueva.seccion"
          etiqueta="Sección"
          tipo="select"
          vacio="Elegí la sección"
          :opciones="opcionesSec"
          :error="nuevaErrores.errores.seccion"
        />
      </form>
      <template #pie>
        <button
          type="button"
          class="boton boton--contorno"
          @click="creando = false"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-usuario"
          class="boton boton--accion"
          :disabled="guardandoNueva"
        >
          {{ guardandoNueva ? 'Creando...' : 'Crear cuenta' }}
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.conteo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2) var(--e-4);
  margin-bottom: var(--e-4);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
}

.conteo li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.conteo__boton {
  min-height: 32px;
  padding: 0 var(--e-2);
  border-radius: var(--radio-sm);
  color: var(--texto-suave);
}

.conteo__boton[aria-pressed='true'] {
  background: var(--principal-suave);
  color: var(--texto);
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-3);
  margin-bottom: var(--e-4);
}

.filtros .buscador {
  flex: 1 1 16rem;
  max-width: 26rem;
}

.filtro {
  width: auto;
  min-width: 12rem;
  flex: 1 1 12rem;
  max-width: 16rem;
  border-radius: var(--radio-pildora);
}

.personas {
  display: flex;
  flex-direction: column;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  overflow: hidden;
}

.persona {
  width: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  grid-template-areas:
    'inicial datos flecha'
    'inicial rol flecha';
  align-items: center;
  gap: 2px var(--e-3);
  padding: var(--e-3) var(--e-4);
  border-bottom: 1px solid var(--borde-sutil);
  text-align: left;
}

.persona:hover {
  background: var(--superficie-hover);
}

.es-inactiva .persona__datos,
.es-inactiva .persona__inicial {
  opacity: 0.55;
}

.persona__inicial {
  grid-area: inicial;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--superficie-3);
  color: var(--texto-suave);
  font-weight: var(--peso-extra);
}

.persona__inicial[data-rol='admin'] {
  background: var(--marca);
  color: #ffffff;
}

.persona__inicial[data-rol='profesor'],
.persona__inicial[data-rol='administrativo'] {
  background: var(--accion-suave);
  color: var(--accion);
}

.persona__inicial[data-rol='soda'] {
  background: var(--aviso-fondo);
  color: var(--aviso);
}

.persona__datos {
  grid-area: datos;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.persona__datos strong {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-2);
}

.persona__correo {
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.persona__rol {
  grid-area: rol;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-1) var(--e-2);
}

.persona__seccion {
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
}

.persona__ingreso {
  display: none;
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

.persona__flecha {
  grid-area: flecha;
  color: var(--texto-tenue);
}

.detalle {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}

.datos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--e-3);
  padding: var(--e-4);
  border-radius: var(--radio-md);
  background: var(--superficie-2);
}

.datos dt {
  font-size: var(--txt-xs);
  color: var(--texto-tenue);
}

.datos dd {
  margin: 0;
  font-weight: var(--peso-semi);
}

.temporal {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--e-3);
  padding: var(--e-4);
  border-radius: var(--radio-md);
  background: var(--exito-fondo);
}

.temporal span {
  flex: 1 1 14rem;
}

.temporal__clave {
  font-family: var(--fuente-mono);
  font-size: var(--txt-lg);
  user-select: all;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-4);
}

.permisos {
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
  border: none;
  padding: 0;
}

.permisos legend {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  margin-bottom: var(--e-2);
}

.permisos__lista {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}

.permisos__lista li {
  padding: 4px var(--e-3);
  border-radius: var(--radio-pildora);
  background: var(--principal-suave);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
}

.permisos__opciones {
  display: grid;
  gap: var(--e-2);
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

.acciones {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  padding-top: var(--e-4);
  border-top: 1px solid var(--borde);
}

@media (min-width: 900px) {
  .persona {
    grid-template-columns: 40px minmax(0, 1.4fr) minmax(0, 1fr) 9rem auto;
    grid-template-areas: 'inicial datos rol ingreso flecha';
  }

  .persona__ingreso {
    display: block;
    grid-area: ingreso;
  }
}
</style>
