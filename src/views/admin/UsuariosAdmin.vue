<script setup>
import { onMounted, ref, watch } from 'vue'
import { Search, UserPlus } from 'lucide-vue-next'
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
} from '@compartido/permisos.js'
import { fechaCorta } from '@compartido/hora.js'

const auth = useAuth()
const avisos = useAvisos()
const confirmar = useConfirmar()
const { errores, limpiar, mostrar } = usarErrores()

const usuarios = ref([])
const cargando = ref(true)
const busqueda = ref('')
const rolFiltro = ref('')

const opcionesRol = ROLES.map((r) => ({ valor: r, texto: NOMBRE_ROL[r] }))
const opcionesSec = opcionesSeccion(SECCIONES, NOMBRE_NIVEL)

let temporizador = null
async function cargar() {
  cargando.value = true
  try {
    const p = new URLSearchParams()
    if (busqueda.value) p.set('buscar', busqueda.value)
    if (rolFiltro.value) p.set('rol', rolFiltro.value)
    usuarios.value = (await api.get(`/usuarios?${p}`)).usuarios
  } catch (e) {
    avisos.error(e.message)
  } finally {
    cargando.value = false
  }
}

watch([busqueda, rolFiltro], () => {
  clearTimeout(temporizador)
  temporizador = setTimeout(cargar, 300)
})

async function cambiarRol(u, selector) {
  const rol = selector.value
  const anterior = u.rol
  const deshacer = () => (selector.value = anterior)
  if (rol === anterior) return
  const seccion = u.seccion
  if (rol === 'estudiante' && !seccion) {
    avisos.aviso(
      'Una cuenta que no tiene sección no puede pasar a estudiante. Creá una cuenta de estudiante nueva con su sección.'
    )
    deshacer()
    return
  }
  const si = await confirmar.preguntar({
    titulo: `¿Cambiar a ${u.nombre} a ${NOMBRE_ROL[rol].toLowerCase()}?`,
    mensaje:
      rol === 'admin'
        ? 'Va a poder entrar al panel completo y cambiar cualquier cosa.'
        : rol === 'soda'
          ? 'Solo va a ver el tablero de pedidos y el menú de la soda.'
          : 'Su acceso cambia la próxima vez que use CitX.',
    aceptar: 'Cambiar rol',
    peligro: false,
  })
  if (!si) {
    deshacer()
    return
  }
  try {
    const { usuario } = await api.patch(`/usuarios/${u.id}`, { rol, seccion })
    Object.assign(u, usuario)
    avisos.exito(`${u.nombre} ahora es ${NOMBRE_ROL[rol].toLowerCase()}.`)
  } catch (e) {
    deshacer()
    avisos.error(e.message)
  }
}

async function alternarActivo(u) {
  const activar = !u.activo
  const si = await confirmar.preguntar({
    titulo: activar
      ? `¿Activar la cuenta de ${u.nombre}?`
      : `¿Desactivar la cuenta de ${u.nombre}?`,
    mensaje: activar
      ? 'Va a poder volver a iniciar sesión.'
      : 'No va a poder iniciar sesión hasta que la actives de nuevo. Sus datos no se borran.',
    aceptar: activar ? 'Activar' : 'Desactivar',
    peligro: !activar,
  })
  if (!si) return
  try {
    const { usuario } = await api.patch(`/usuarios/${u.id}`, {
      activo: activar,
    })
    Object.assign(u, usuario)
    avisos.exito(activar ? 'Cuenta activada.' : 'Cuenta desactivada.')
  } catch (e) {
    avisos.error(e.message)
  }
}

// Crear cuenta (por ejemplo la de la soda o de otra persona de administracion)
const creando = ref(false)
const nueva = ref({})
const guardando = ref(false)

function abrirNueva() {
  nueva.value = {
    nombre: '',
    correo: '',
    contrasena: '',
    rol: 'soda',
    seccion: '',
  }
  limpiar()
  creando.value = true
}

async function crear() {
  guardando.value = true
  limpiar()
  try {
    const { usuario } = await api.post('/usuarios', {
      ...nueva.value,
      seccion: nueva.value.seccion || null,
    })
    usuarios.value.unshift({ ...usuario, creadoEn: new Date().toISOString() })
    avisos.exito(
      `Cuenta creada. Pasale a ${usuario.nombre} su correo y contraseña.`
    )
    creando.value = false
  } catch (e) {
    mostrar(e, { aviso: !e.campos })
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <EncabezadoPanel
      titulo="Usuarios"
      ayuda="Aquí cambiás el tipo de cuenta o desactivás a alguien que ya no debe entrar. Las cuentas de la soda y de administración se crean solo desde aquí."
    >
      <template #acciones>
        <button type="button" class="boton boton--accion" @click="abrirNueva">
          <UserPlus :size="18" aria-hidden="true" /> Crear cuenta
        </button>
      </template>
    </EncabezadoPanel>

    <div class="filtros">
      <div class="buscador">
        <Search :size="20" aria-hidden="true" />
        <label for="buscar-usuario" class="solo-lectores"
          >Buscar por nombre o correo</label
        >
        <input
          id="buscar-usuario"
          v-model="busqueda"
          type="search"
          class="entrada"
          placeholder="Nombre o correo"
        />
      </div>
      <label class="solo-lectores" for="filtro-rol">Tipo de cuenta</label>
      <select
        id="filtro-rol"
        v-model="rolFiltro"
        class="campo__control filtro-rol"
      >
        <option value="">Todos los tipos</option>
        <option v-for="r in opcionesRol" :key="r.valor" :value="r.valor">
          {{ r.texto }}
        </option>
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
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead>
          <tr>
            <th scope="col">Persona</th>
            <th scope="col">Tipo de cuenta</th>
            <th scope="col">Sección</th>
            <th scope="col">Desde</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in usuarios"
            :key="u.id"
            :class="{ 'es-inactivo': !u.activo }"
          >
            <td>
              <strong>{{ u.nombre }}</strong>
              <span class="correo">{{ u.correo }}</span>
            </td>
            <td>
              <label class="solo-lectores" :for="`rol-${u.id}`"
                >Tipo de cuenta de {{ u.nombre }}</label
              >
              <select
                :id="`rol-${u.id}`"
                :value="u.rol"
                class="campo__control selector-rol"
                :disabled="u.id === auth.usuario?.id"
                @change="(e) => cambiarRol(u, e.target)"
              >
                <option
                  v-for="r in opcionesRol"
                  :key="r.valor"
                  :value="r.valor"
                >
                  {{ r.texto }}
                </option>
              </select>
            </td>
            <td>{{ u.seccion ?? '—' }}</td>
            <td>{{ u.creadoEn ? fechaCorta(u.creadoEn) : '' }}</td>
            <td>
              <button
                type="button"
                class="boton boton--pequeno"
                :class="u.activo ? 'boton--contorno' : 'boton--suave'"
                :disabled="u.id === auth.usuario?.id"
                @click="alternarActivo(u)"
              >
                {{ u.activo ? 'Activa' : 'Desactivada' }}
                <span class="solo-lectores"
                  >. Tocá para {{ u.activo ? 'desactivar' : 'activar' }}.</span
                >
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialogo
      :abierto="creando"
      titulo="Crear cuenta"
      descripcion="La persona puede cambiar su contraseña después, desde Configuración."
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
          :error="errores.nombre"
        />
        <Campo
          id="nu-correo"
          v-model="nueva.correo"
          etiqueta="Correo"
          tipo="email"
          obligatorio
          :error="errores.correo"
        />
        <CampoContrasena
          id="nu-clave"
          v-model="nueva.contrasena"
          etiqueta="Contraseña inicial"
          autocompletar="new-password"
          :error="errores.contrasena"
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
          :error="errores.seccion"
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
          :disabled="guardando"
        >
          {{ guardando ? 'Creando...' : 'Crear cuenta' }}
        </button>
      </template>
    </Dialogo>
  </div>
</template>

<style scoped>
.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-3);
  margin-bottom: var(--e-4);
}

.filtros .buscador {
  flex: 1 1 16rem;
  max-width: 24rem;
}

.filtro-rol {
  width: auto;
  min-width: 13rem;
  border-radius: var(--radio-pildora);
}

.correo {
  display: block;
  color: var(--texto-suave);
  font-size: var(--txt-xs);
  overflow-wrap: anywhere;
}

.selector-rol {
  min-height: 40px;
  padding-block: var(--e-2);
  min-width: 12rem;
}

.es-inactivo td {
  color: var(--texto-tenue);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--e-5);
}
</style>
