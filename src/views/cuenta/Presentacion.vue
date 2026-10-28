<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  ArrowRight,
  MapPin,
  CalendarDays,
  UtensilsCrossed,
  GraduationCap,
  UserPlus,
  LogIn,
  Search,
  QrCode,
  Bell,
  Accessibility,
  Compass,
} from 'lucide-vue-next'
import LogoCitx from '@/components/marca/LogoCitx.vue'
import EscudoCit from '@/components/marca/EscudoCit.vue'
import FotoCompleta from '@/components/marca/FotoCompleta.vue'
import { useAuth } from '@/stores/auth'
import { sinMovimiento } from '@/lib/movimiento'
import { LIENZO, LUGARES_CIT, CATEGORIAS } from '@compartido/campus.js'

/**
 * Pagina de presentacion: lo primero que ve alguien que no ha entrado.
 * Explica en pocas palabras que es CitX y lleva a crear cuenta, entrar o
 * mirar como invitado.
 */
const auth = useAuth()
const router = useRouter()

function comoInvitado() {
  auth.entrarComoInvitado()
  router.push({ name: 'mapa' })
}

/** Pines del mapa de la portada, en porcentaje para que escalen solos. */
const pines = LUGARES_CIT.filter((l) => l.numero).map((l) => ({
  clave: l.clave,
  numero: l.numero,
  x: (l.x / LIENZO.ancho) * 100,
  y: (l.y / LIENZO.alto) * 100,
  color: l.color || CATEGORIAS[l.categoria]?.color || '#5b6573',
}))

/** Lugares que se van presentando solos sobre el mapa. */
const recorridoMapa = [
  { clave: 'soda', titulo: 'Soda', texto: 'Pedí aquí y retirá en el recreo.' },
  {
    clave: 'secundaria',
    titulo: 'Secundaria',
    texto: 'Tus aulas y tu horario.',
  },
  {
    clave: 'cancha-natural',
    titulo: 'Cancha natural',
    texto: 'Eventos y actividades.',
  },
  {
    clave: 'vivero-retono',
    titulo: 'Vivero Retoño',
    texto: 'Recorridos y proyectos.',
  },
  { clave: 'recepcion', titulo: 'Recepción', texto: 'Entrada principal.' },
]
const actual = ref(0)
const destacado = computed(() => {
  const r = recorridoMapa[actual.value]
  const pin = pines.find((p) => p.clave === r.clave)
  return { ...r, ...pin }
})
let reloj = null

onMounted(() => {
  if (sinMovimiento()) return
  reloj = setInterval(() => {
    actual.value = (actual.value + 1) % recorridoMapa.length
  }, 2800)
})
onUnmounted(() => clearInterval(reloj))

const funciones = [
  {
    numero: '01',
    icono: MapPin,
    titulo: 'Un mapa que sí se entiende',
    texto:
      'El plano oficial del CIT, con cada lugar numerado. Buscá "enfermería" o "soda" y el mapa te lleva directo.',
    puntos: ['Buscador', 'Favoritos', 'Horarios de cada lugar'],
    imagen: { src: '/mapa/mapa-cit-1452.webp', ancho: 1452, alto: 1426 },
    esMapa: true,
  },
  {
    numero: '02',
    icono: CalendarDays,
    titulo: 'Tu día, ordenado',
    texto:
      'La clase que tenés ahora, el horario de la semana, los eventos del colegio y los recordatorios que no se te pueden pasar.',
    puntos: ['Horario por sección', 'Horario de profesores', 'Recordatorios'],
    imagen: { src: '/fotos/portadas/guia.webp', ancho: 1280, alto: 855 },
  },
  {
    numero: '03',
    icono: UtensilsCrossed,
    titulo: 'La soda, sin filas',
    texto:
      'Mirá el menú con fotos y precios, pedí desde el celular y retirá en el recreo mostrando tu código QR.',
    puntos: [
      'Pago en efectivo o SINPE',
      'Código QR',
      'Aviso cuando está listo',
    ],
    imagen: { src: '/fotos/portadas/soda.webp', ancho: 900, alto: 648 },
  },
]

const pasos = [
  {
    icono: UserPlus,
    titulo: 'Creá tu cuenta',
    texto: 'Con tu correo y tu sección. Toma un minuto.',
  },
  {
    icono: Compass,
    titulo: 'Seguí el recorrido',
    texto: 'La app te muestra qué hace cada parte la primera vez.',
  },
  {
    icono: Search,
    titulo: 'Usala en el colegio',
    texto: 'Buscá lugares, revisá tu horario y pedí en la soda.',
  },
]

const extras = [
  { icono: Bell, texto: 'Avisos del colegio al instante' },
  { icono: QrCode, texto: 'Pedidos con código QR' },
  { icono: GraduationCap, texto: 'Especialidades y talleres' },
  {
    icono: Accessibility,
    texto: 'Texto grande, modo oscuro y lectura en voz alta',
  },
]
</script>

<template>
  <div class="presentacion">
    <!-- Barra superior -->
    <header class="barra">
      <RouterLink :to="{ name: 'bienvenida' }" class="barra__marca">
        <EscudoCit :tamano="40" alternativo="" />
        <LogoCitx
          :tamano="34"
          con-nombre
          direccion="horizontal"
          alternativo="CitX"
        />
      </RouterLink>
      <nav class="barra__acciones" aria-label="Cuenta">
        <RouterLink
          :to="{ name: 'entrar' }"
          class="boton boton--texto barra__entrar"
        >
          Iniciar sesión
        </RouterLink>
        <RouterLink
          :to="{ name: 'registro' }"
          class="boton boton--principal boton--pequeno"
        >
          Crear cuenta
        </RouterLink>
      </nav>
    </header>

    <main id="contenido">
      <!-- Portada -->
      <section class="portada" aria-labelledby="titulo-portada">
        <div class="portada__texto">
          <p class="portada__antetitulo">
            <span class="punto-vivo" aria-hidden="true" />
            Complejo Educativo CIT · La Asunción de Belén
          </p>
          <h1 id="titulo-portada" class="portada__titulo">
            Todo el colegio<br />
            <span class="portada__titulo-acento">en tu bolsillo.</span>
          </h1>
          <p class="portada__bajada">
            CitX es la app del CIT: encontrá cualquier lugar del campus, revisá
            tu horario y pedí en la soda sin hacer fila.
          </p>
          <div class="portada__botones">
            <RouterLink
              :to="{ name: 'registro' }"
              class="boton boton--principal boton--grande"
            >
              Crear mi cuenta
              <ArrowRight :size="20" class="icono-avanza" aria-hidden="true" />
            </RouterLink>
            <RouterLink
              :to="{ name: 'entrar' }"
              class="boton boton--contorno boton--grande"
            >
              <LogIn :size="20" aria-hidden="true" />
              Ya tengo cuenta
            </RouterLink>
          </div>
          <button type="button" class="portada__invitado" @click="comoInvitado">
            <span>o entrá como <strong>invitado</strong>, sin cuenta</span>
            <ArrowRight :size="16" aria-hidden="true" />
          </button>
        </div>

        <!-- Mapa vivo: los pines caen y un lugar se va presentando -->
        <div class="vitrina" aria-hidden="true">
          <div class="vitrina__marco">
            <div class="vitrina__mapa">
              <img
                src="/mapa/mapa-cit-1452.webp"
                alt=""
                width="1452"
                height="1426"
                class="vitrina__imagen"
              />
              <span
                v-for="(p, i) in pines"
                :key="p.clave"
                class="vitrina__pin"
                :class="{ 'es-destacado': destacado.clave === p.clave }"
                :style="{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  '--color': p.color,
                  '--i': i,
                }"
                >{{ p.numero }}</span
              >
              <Transition name="globo" mode="out-in">
                <div
                  :key="destacado.clave"
                  class="vitrina__globo"
                  :style="{ left: `${destacado.x}%`, top: `${destacado.y}%` }"
                >
                  <strong>{{ destacado.titulo }}</strong>
                  <span>{{ destacado.texto }}</span>
                </div>
              </Transition>
            </div>
          </div>
          <div class="vitrina__ficha vitrina__ficha--arriba">
            <span class="vitrina__ficha-icono"><Bell :size="16" /></span>
            <span><strong>Tu pedido está listo</strong> Pasá a la soda</span>
          </div>
          <div class="vitrina__ficha vitrina__ficha--abajo">
            <span class="vitrina__ficha-icono vitrina__ficha-icono--b"
              ><CalendarDays :size="16"
            /></span>
            <span><strong>Ahora: Matemáticas</strong> Aula S2-101</span>
          </div>
        </div>
      </section>

      <!-- Que se puede hacer -->
      <section class="funciones" aria-labelledby="titulo-funciones">
        <header v-revelar class="seccion-titulo">
          <p class="antetitulo">Qué podés hacer</p>
          <h2 id="titulo-funciones">Tres cosas, muy bien hechas</h2>
        </header>

        <article
          v-for="(f, i) in funciones"
          :key="f.numero"
          class="funcion"
          :class="{ 'funcion--invertida': i % 2 === 1 }"
        >
          <div
            v-revelar="{ lado: i % 2 === 1 ? 'derecha' : 'izquierda' }"
            class="funcion__media"
            :class="{ 'funcion__media--mapa': f.esMapa }"
            :style="{ aspectRatio: `${f.imagen.ancho} / ${f.imagen.alto}` }"
          >
            <FotoCompleta
              :src="f.imagen.src"
              :ancho="f.imagen.ancho"
              :alto="f.imagen.alto"
              class="funcion__foto"
            />
          </div>
          <div v-revelar="{ retraso: 120 }" class="funcion__texto">
            <span class="funcion__numero">{{ f.numero }}</span>
            <span class="funcion__icono" aria-hidden="true"
              ><component :is="f.icono" :size="22"
            /></span>
            <h3 class="funcion__titulo">{{ f.titulo }}</h3>
            <p>{{ f.texto }}</p>
            <ul class="funcion__puntos">
              <li v-for="p in f.puntos" :key="p">{{ p }}</li>
            </ul>
          </div>
        </article>
      </section>

      <!-- Como empezar -->
      <section class="pasos" aria-labelledby="titulo-pasos">
        <header v-revelar class="seccion-titulo">
          <p class="antetitulo">Cómo empezar</p>
          <h2 id="titulo-pasos">Listo en tres pasos</h2>
        </header>
        <ol v-revelar class="pasos__lista">
          <li
            v-for="(p, i) in pasos"
            :key="p.titulo"
            class="paso"
            :style="{ '--i': i }"
          >
            <span class="paso__icono" aria-hidden="true">
              <component :is="p.icono" :size="22" />
            </span>
            <span class="paso__numero">Paso {{ i + 1 }}</span>
            <h3 class="paso__titulo">{{ p.titulo }}</h3>
            <p>{{ p.texto }}</p>
          </li>
        </ol>
        <ul v-revelar class="extras">
          <li v-for="(e, i) in extras" :key="e.texto" :style="{ '--i': i }">
            <component :is="e.icono" :size="18" aria-hidden="true" />
            {{ e.texto }}
          </li>
        </ul>
      </section>

      <!-- Cierre -->
      <section v-revelar="{ lado: 'escala' }" class="cierre">
        <LogoCitx :tamano="72" alternativo="" class="cierre__logo" />
        <h2 class="cierre__titulo">¿Listo para empezar?</h2>
        <p>
          Estudiantes, profesores y personal del CIT, todos en la misma app.
        </p>
        <div class="cierre__botones">
          <RouterLink
            :to="{ name: 'registro' }"
            class="boton boton--principal boton--grande"
          >
            Crear mi cuenta
            <ArrowRight :size="20" class="icono-avanza" aria-hidden="true" />
          </RouterLink>
          <button
            type="button"
            class="boton boton--grande cierre__invitado"
            @click="comoInvitado"
          >
            Entrar como invitado
          </button>
        </div>
      </section>
    </main>

    <footer class="pie">
      <p>
        CitX · Proyecto del Colegio Técnico Profesional CIT para ExpoTécnica
        2026
      </p>
      <RouterLink :to="{ name: 'configuracion' }">
        Ajustes de accesibilidad
      </RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.presentacion {
  min-height: 100dvh;
  overflow-x: clip;
}

/* ---------- Barra ---------- */
.barra {
  position: sticky;
  top: 0;
  z-index: var(--z-barra);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-3);
  --borde-pagina: max(
    var(--margen-lateral),
    calc((100% - var(--ancho-contenido)) / 2 + var(--margen-lateral))
  );
  padding: calc(var(--e-3) + env(safe-area-inset-top)) var(--borde-pagina)
    var(--e-3);
  background: color-mix(in srgb, var(--fondo) 94%, transparent);
  border-bottom: 1px solid var(--borde-sutil);
  animation: baja calc(600ms * var(--mov)) var(--curva-salida) backwards;
}

@keyframes baja {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
}

.barra__marca {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  text-decoration: none;
}

.barra__acciones {
  display: flex;
  align-items: center;
  gap: var(--e-1);
}

.barra__entrar {
  display: none;
}

/* ---------- Portada ---------- */
.portada {
  display: grid;
  gap: var(--e-10);
  max-width: var(--ancho-contenido);
  margin: 0 auto;
  padding: var(--e-8) var(--margen-lateral) var(--e-16);
}

.portada__texto > * {
  animation: sube calc(700ms * var(--mov)) var(--curva-salida) backwards;
}

.portada__texto > :nth-child(2) {
  animation-delay: calc(80ms * var(--mov));
}
.portada__texto > :nth-child(3) {
  animation-delay: calc(160ms * var(--mov));
}
.portada__texto > :nth-child(4) {
  animation-delay: calc(240ms * var(--mov));
}
.portada__texto > :nth-child(5) {
  animation-delay: calc(320ms * var(--mov));
}

@keyframes sube {
  from {
    opacity: 0;
    transform: translateY(18px);
    filter: blur(4px);
  }
}

.portada__antetitulo {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  padding: 6px var(--e-3);
  border-radius: var(--radio-pildora);
  background: var(--principal-suave);
  color: var(--principal-fuerte);
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
}

.punto-vivo {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--principal);
}

.punto-vivo::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--principal);
  animation: late calc(2s * var(--mov)) var(--curva-salida) infinite;
}

@keyframes late {
  to {
    transform: scale(3);
    opacity: 0;
  }
}

.portada__titulo {
  margin-top: var(--e-5);
  font-family: var(--fuente-titulo);
  font-size: clamp(2.3rem, 9vw, 3.9rem);
  line-height: 1.05;
  color: var(--texto-titulo);
  letter-spacing: -0.01em;
}

.portada__titulo-acento {
  color: var(--principal);
}

.portada__bajada {
  margin-top: var(--e-5);
  max-width: 34rem;
  font-size: var(--txt-lg);
  line-height: var(--alto-amplio);
  color: var(--texto-suave);
}

.portada__botones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-3);
  margin-top: var(--e-8);
}

.portada__botones .boton {
  flex: 1 1 13rem;
}

.portada__invitado {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  min-height: var(--objetivo-tactil);
  margin-top: var(--e-3);
  padding-inline: var(--e-2);
  margin-left: calc(var(--e-2) * -1);
  border-radius: var(--radio-pildora);
  color: var(--texto-suave);
  font-size: var(--txt-sm);
  transition:
    color var(--dur-rapida) ease,
    background-color var(--dur-rapida) ease;
}

.portada__invitado strong {
  color: var(--accion);
}

.portada__invitado svg {
  transition: transform var(--dur-media) var(--curva-salida);
}

.portada__invitado:hover {
  color: var(--texto);
  background: var(--superficie-hover);
}

.portada__invitado:hover svg {
  transform: translateX(3px);
}

/* ---------- Vitrina con el mapa ---------- */
.vitrina {
  position: relative;
  animation: vitrina calc(900ms * var(--mov)) var(--curva-salida)
    calc(200ms * var(--mov)) backwards;
}

@keyframes vitrina {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.97);
  }
}

.vitrina__marco {
  padding: var(--e-3);
  border-radius: var(--radio-xl);
  background: var(--fondo-elevado);
  box-shadow: var(--sombra-flotante);
}

.vitrina__mapa {
  position: relative;
  aspect-ratio: 1452 / 1426;
  border-radius: calc(var(--radio-xl) - var(--e-3));
  background: #ffffff;
  overflow: hidden;
}

.vitrina__imagen {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.vitrina__pin {
  position: absolute;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border-radius: 50%;
  background: var(--color);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: var(--peso-extra);
  border: 2px solid #ffffff;
  box-shadow: 0 2px 6px rgba(13, 17, 23, 0.3);
  animation: pin calc(520ms * var(--mov)) var(--curva-rebote) backwards;
  animation-delay: calc((600ms + var(--i) * 45ms) * var(--mov));
  transition:
    transform calc(400ms * var(--mov)) var(--curva-salida),
    box-shadow calc(400ms * var(--mov)) ease;
}

.vitrina__pin.es-destacado {
  transform: scale(1.35);
  z-index: 2;
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--color) 30%, transparent),
    0 4px 12px rgba(13, 17, 23, 0.35);
}

@keyframes pin {
  from {
    opacity: 0;
    transform: translateY(-14px) scale(0.6);
  }
}

.vitrina__globo {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  min-width: 9.5rem;
  padding: var(--e-2) var(--e-3);
  border-radius: var(--radio-md);
  background: var(--marino-800);
  color: #ffffff;
  font-size: var(--txt-xs);
  line-height: 1.35;
  transform: translate(-50%, calc(-100% - 20px));
  box-shadow: var(--sombra-3);
  pointer-events: none;
}

.vitrina__globo strong {
  font-size: var(--txt-sm);
}

.vitrina__globo span {
  color: var(--marino-100);
}

.vitrina__globo::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  background: inherit;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 2px;
}

.globo-enter-active {
  transition:
    opacity calc(320ms * var(--mov)) var(--curva-salida),
    translate calc(420ms * var(--mov)) var(--curva-salida),
    scale calc(420ms * var(--mov)) var(--curva-salida);
}

.globo-leave-active {
  transition:
    opacity calc(160ms * var(--mov)) ease,
    scale calc(160ms * var(--mov)) ease;
}

.globo-enter-from {
  opacity: 0;
  translate: 0 8px;
  scale: 0.92;
}

.globo-leave-to {
  opacity: 0;
  scale: 0.96;
}

.vitrina__ficha {
  position: absolute;
  display: flex;
  align-items: center;
  gap: var(--e-2);
  padding: var(--e-2) var(--e-3) var(--e-2) var(--e-2);
  border-radius: var(--radio-md);
  background: var(--fondo-elevado);
  box-shadow: var(--sombra-flotante);
  font-size: var(--txt-xs);
  line-height: 1.3;
  color: var(--texto-suave);
  animation:
    ficha calc(700ms * var(--mov)) var(--curva-salida) backwards,
    flota calc(5s * var(--mov)) ease-in-out infinite;
}

.vitrina__ficha span:last-child {
  display: flex;
  flex-direction: column;
}

.vitrina__ficha strong {
  color: var(--texto);
}

.vitrina__ficha--arriba {
  top: 6%;
  left: -2%;
  animation-delay: calc(1.4s * var(--mov)), calc(2s * var(--mov));
}

.vitrina__ficha--abajo {
  right: -2%;
  bottom: 8%;
  animation-delay: calc(1.7s * var(--mov)), calc(2.4s * var(--mov));
}

.vitrina__ficha-icono {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radio-sm);
  background: var(--exito-fondo);
  color: var(--exito);
}

.vitrina__ficha-icono--b {
  background: var(--info-fondo);
  color: var(--info);
}

@keyframes ficha {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.94);
  }
}

@keyframes flota {
  50% {
    translate: 0 -6px;
  }
}

/* ---------- Secciones ---------- */
.seccion-titulo {
  max-width: 40rem;
  margin-bottom: var(--e-10);
}

.seccion-titulo h2 {
  margin-top: var(--e-2);
  font-family: var(--fuente-titulo);
  font-size: clamp(1.75rem, 6vw, 2.5rem);
  color: var(--texto-titulo);
}

.funciones,
.pasos {
  max-width: var(--ancho-contenido);
  margin: 0 auto;
  padding: var(--e-12) var(--margen-lateral);
}

.funcion {
  display: grid;
  gap: var(--e-6);
  align-items: center;
}

.funcion + .funcion {
  margin-top: var(--e-16);
}

.funcion__media {
  border-radius: var(--radio-xl);
  overflow: hidden;
  box-shadow: var(--sombra-3);
  background: var(--superficie-3);
}

.funcion__media--mapa {
  background: #ffffff;
}

.funcion__foto {
  width: 100%;
  height: 100%;
}

.funcion__texto {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--e-3);
}

.funcion__numero {
  font-family: var(--fuente-titulo);
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

.funcion__icono {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radio-md);
  background: var(--principal-suave);
  color: var(--principal-fuerte);
}

.funcion__titulo {
  font-family: var(--fuente-titulo);
  font-size: var(--txt-2xl);
  color: var(--texto-titulo);
}

.funcion__texto > p {
  color: var(--texto-suave);
  font-size: var(--txt-md);
  line-height: var(--alto-amplio);
  max-width: 32rem;
}

.funcion__puntos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
  margin-top: var(--e-2);
}

.funcion__puntos li {
  padding: 6px var(--e-3);
  border-radius: var(--radio-pildora);
  border: 1px solid var(--borde);
  background: var(--superficie);
  font-size: var(--txt-sm);
  font-weight: var(--peso-semi);
  color: var(--texto-suave);
}

/* ---------- Pasos ---------- */
.pasos__lista {
  position: relative;
  display: grid;
  gap: var(--e-4);
}

.paso {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  padding: var(--e-5);
  border-radius: var(--radio-lg);
  background: var(--superficie);
  border: 1px solid var(--borde);
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity calc(600ms * var(--mov)) var(--curva-salida),
    transform calc(700ms * var(--mov)) var(--curva-salida);
  transition-delay: calc(var(--i) * 120ms * var(--mov));
}

.es-visible .paso {
  opacity: 1;
  transform: none;
}

.paso__icono {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--degradado-marca);
  color: #ffffff;
  box-shadow: 0 6px 16px -6px rgba(67, 109, 221, 0.6);
}

.paso__numero {
  margin-top: var(--e-2);
  font-size: var(--txt-xs);
  font-weight: var(--peso-semi);
  color: var(--texto-tenue);
}

.paso__titulo {
  font-size: var(--txt-lg);
}

.paso p {
  color: var(--texto-suave);
  font-size: var(--txt-sm);
}

.extras {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2) var(--e-3);
  margin-top: var(--e-8);
}

.extras li {
  display: inline-flex;
  align-items: center;
  gap: var(--e-2);
  padding: var(--e-2) var(--e-4);
  border-radius: var(--radio-pildora);
  background: var(--superficie);
  border: 1px solid var(--borde);
  font-size: var(--txt-sm);
  color: var(--texto-suave);
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity calc(500ms * var(--mov)) var(--curva-salida),
    transform calc(600ms * var(--mov)) var(--curva-salida);
  transition-delay: calc(var(--i) * 70ms * var(--mov) + 200ms * var(--mov));
}

.extras.es-visible li {
  opacity: 1;
  transform: none;
}

.extras svg {
  color: var(--principal-fuerte);
}

/* ---------- Cierre ---------- */
.cierre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--e-3);
  max-width: calc(var(--ancho-contenido) - 2 * var(--margen-lateral));
  margin: var(--e-8) var(--margen-lateral) var(--e-12);
  padding: var(--e-12) var(--e-6);
  border-radius: var(--radio-xl);
  background:
    radial-gradient(
      30rem 18rem at 50% 0%,
      rgba(99, 209, 180, 0.22),
      transparent 70%
    ),
    var(--marino-800);
  color: var(--marino-100);
  text-align: center;
}

.cierre__logo {
  animation: flota-logo calc(4s * var(--mov)) ease-in-out infinite;
}

@keyframes flota-logo {
  50% {
    transform: translateY(-6px);
  }
}

.cierre__titulo {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.75rem, 6vw, 2.5rem);
  color: #ffffff;
}

.cierre__botones {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--e-3);
  margin-top: var(--e-4);
}

.cierre__invitado {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.25);
}

.cierre__invitado:hover {
  background: rgba(255, 255, 255, 0.14);
}

.pie {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--e-3);
  max-width: var(--ancho-contenido);
  margin: 0 auto;
  padding: var(--e-6) var(--margen-lateral)
    calc(var(--e-8) + env(safe-area-inset-bottom));
  border-top: 1px solid var(--borde);
  font-size: var(--txt-sm);
  color: var(--texto-tenue);
}

.pie a {
  color: var(--texto-suave);
}

/* ---------- Pantallas grandes ---------- */
@media (min-width: 640px) {
  .barra__entrar {
    display: inline-flex;
  }

  .pasos__lista {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .pasos__lista::before {
    content: '';
    position: absolute;
    top: calc(var(--e-5) + 23px);
    left: 23px;
    right: calc((100% - 2 * var(--e-4)) / 3 - 23px);
    height: 2px;
    background: linear-gradient(
      90deg,
      var(--turquesa-300),
      var(--petroleo-300),
      var(--marino-300)
    );
    transform: scaleX(0);
    transform-origin: left;
    transition: transform calc(1.2s * var(--mov)) var(--curva-mover)
      calc(300ms * var(--mov));
  }

  .pasos__lista.es-visible::before {
    transform: scaleX(1);
  }

  .paso {
    z-index: 1;
    border-color: transparent;
    padding-inline: 0;
    background: transparent;
  }
}

@media (min-width: 960px) {
  .portada {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    align-items: center;
    padding-top: var(--e-12);
    padding-bottom: var(--e-20);
  }

  .portada__botones .boton {
    flex: 0 0 auto;
  }

  .funcion {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: var(--e-12);
  }

  .funcion--invertida .funcion__media {
    order: 2;
  }

  .cierre {
    margin-inline: auto;
  }
}
</style>
