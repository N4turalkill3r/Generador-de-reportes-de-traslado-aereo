/**
 * historialView.js — Pestaña "Historial": pacientes atendidos anteriormente.
 * Permite buscar, reabrir un caso, volver a generar su PDF o eliminarlo.
 */
import { h, reemplazar } from '../utils/dom.js';
import { confirmar } from '../components/modal.js';
import { listarCasos, borrarCaso, guardarCaso } from '../services/db.js';
import { abrirCaso, store, cerrarCaso } from '../services/store.js';
import { generarYDescargar } from './reporteView.js';
import { fechaCorta } from '../utils/formatoHora.js';
import { textoEdad } from '../utils/edadPediatrica.js';
import { obtenerEstado } from '../config/estados.js';

export async function renderHistorial(contenedor, acciones) {
  const casos = await listarCasos();
  let filtro = '';

  const lista = h('div');
  const buscador = h('input', {
    type: 'search', placeholder: 'Buscar por nombre, ticket o diagnóstico', class: 'buscador',
    style: 'width:100%;padding:11px 12px;min-height:46px;border:1px solid var(--gris-borde);border-radius:10px;font:inherit;margin-bottom:10px'
  });
  buscador.addEventListener('input', () => { filtro = buscador.value.trim().toLowerCase(); dibujarLista(); });

  function dibujarLista() {
    const visibles = casos.filter((c) => {
      if (!filtro) return true;
      const p = c.paciente;
      return [p.nombre, p.ticket, p.diagnostico].join(' ').toLowerCase().includes(filtro);
    });
    reemplazar(lista,
      visibles.length
        ? visibles.map(tarjeta)
        : h('div', { class: 'vacio' }, casos.length ? 'Sin resultados.' : 'Todavía no hay pacientes registrados.')
    );
  }

  function tarjeta(caso) {
    const p = caso.paciente;
    return h('section', { class: 'tarjeta' },
      h('div', { class: 'estado-cabecera' },
        h('strong', {}, p.nombre || 'Paciente sin nombre'),
        h('span', { class: caso.guardado ? 'badge-guardado' : 'badge-borrador' }, caso.guardado ? 'Guardado' : 'Borrador')),
      h('div', { class: 'texto-suave' },
        [fechaCorta(p.fecha), textoEdad(p.edad), p.ticket ? `Ticket ${p.ticket}` : ''].filter(Boolean).join(' · ')),
      p.diagnostico ? h('div', { class: 'detalle' }, p.diagnostico) : null,
      h('div', { class: 'texto-suave' }, `Último estado: ${obtenerEstado(caso.estadoActual).codigo}`),
      h('div', { class: 'fila-botones' },
        h('button', {
          class: 'btn chico', type: 'button',
          onclick: async () => { await abrirCaso(caso.id); acciones.irACaso(); }
        }, 'Abrir'),
        h('button', {
          class: 'btn chico', type: 'button',
          onclick: async () => {
            await generarYDescargar(caso, () => guardarCaso(caso));
          }
        }, 'PDF'),
        h('button', {
          class: 'btn chico peligro', type: 'button',
          onclick: async () => {
            if (!await confirmar('Eliminar caso', `Se eliminará «${p.nombre || 'Paciente sin nombre'}» y todas sus fotos. No se puede deshacer.`, 'Eliminar', true)) return;
            await borrarCaso(caso.id);
            if (store.caso && store.caso.id === caso.id) cerrarCaso();
            casos.splice(casos.indexOf(caso), 1);
            dibujarLista();
            acciones.actualizarEncabezado();
          }
        }, 'Eliminar'))
    );
  }

  dibujarLista();
  contenedor.replaceChildren(h('h2', {}, 'Historial de pacientes'), buscador, lista);
}
