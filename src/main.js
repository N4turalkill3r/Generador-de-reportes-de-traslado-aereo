/**
 * main.js — Arranque de la app: registra el service worker, carga el caso en curso
 * y dibuja la barra inferior (Caso / Historial).
 */
import { h } from './utils/dom.js';
import { iniciar, store, guardarAhora } from './services/store.js';
import { renderCaso } from './views/casoView.js';
import { renderHistorial } from './views/historialView.js';
import { obtenerEstado } from './config/estados.js';

const vista = document.getElementById('vista');
const nav = document.getElementById('nav');
const subtitulo = document.getElementById('app-subtitulo');

/** Texto bajo el título: paciente y estado actual. */
function actualizarEncabezado() {
  const c = store.caso;
  subtitulo.textContent = c
    ? `${c.paciente.nombre || 'Paciente sin nombre'} · ${obtenerEstado(c.estadoActual).codigo}`
    : 'Sin caso abierto';
}

function irA(seccion) {
  store.ui.seccion = seccion;
  dibujar();
}

const acciones = {
  redibujar: () => dibujar(),
  actualizarEncabezado,
  irAHistorial: () => irA('historial'),
  irACaso: () => irA('caso')
};

/** Dibuja la sección activa. */
async function dibujar() {
  window.scrollTo(0, 0);
  if (store.ui.seccion === 'historial') {
    await guardarAhora();
    await renderHistorial(vista, acciones);
  } else {
    renderCaso(vista, acciones);
  }
  actualizarEncabezado();
  dibujarNav();
}

function dibujarNav() {
  const boton = (id, icono, texto) => h('button', {
    type: 'button', class: store.ui.seccion === id ? 'activo' : '',
    onclick: () => irA(id)
  }, h('span', { class: 'icono' }, icono), texto);
  nav.replaceChildren(boton('caso', '🚑', 'Caso'), boton('historial', '🗂️', 'Historial'));
}

async function arrancar() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch((e) => console.warn('Service worker no registrado', e));
  }
  try {
    await iniciar();
  } catch (e) {
    console.error('No se pudo cargar el caso en curso', e);
  }
  dibujar();
}

// Guarda al salir o enviar la app a segundo plano.
document.addEventListener('visibilitychange', () => { if (document.hidden) guardarAhora().catch(() => {}); });

arrancar();
