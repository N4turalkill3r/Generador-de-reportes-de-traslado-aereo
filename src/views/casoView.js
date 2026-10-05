/**
 * casoView.js — Vista del caso abierto: barra de pestañas + contenido de la pestaña activa.
 * Pestañas: Paciente · (una por estado) · Reporte.
 */
import { h } from '../utils/dom.js';
import { crearPestanas } from '../components/pestanas.js';
import { ESTADOS } from '../config/estados.js';
import { store, nuevoCaso } from '../services/store.js';
import { renderPaciente } from './pacienteView.js';
import { renderEstado } from './estadoView.js';
import { renderReporte } from './reporteView.js';

/**
 * @param contenedor  elemento donde dibujar
 * @param acciones    { irAHistorial(), actualizarEncabezado(), redibujar() }
 */
export function renderCaso(contenedor, acciones) {
  const caso = store.caso;

  // Sin caso abierto: pantalla de inicio.
  if (!caso) {
    contenedor.replaceChildren(
      h('section', { class: 'tarjeta', style: 'text-align:center;margin-top:24px' },
        h('h2', {}, 'Nuevo traslado'),
        h('p', { class: 'texto-suave' }, 'Inicie un caso para registrar signos vitales, medicamentos y estados con la hora del dispositivo.'),
        h('button', {
          class: 'btn primario ancho', type: 'button',
          onclick: async () => { await nuevoCaso(); acciones.redibujar(); }
        }, '＋ Nuevo caso'))
    );
    return;
  }

  const activa = store.ui.pestana;
  const items = [
    { id: 'paciente', texto: 'Paciente' },
    ...ESTADOS.map((e) => ({
      id: e.id, texto: e.codigo,
      pendiente: !caso.estados[e.id].iniciadoEn,
      punto: caso.estadoActual === e.id
    })),
    { id: 'reporte', texto: 'Reporte' }
  ];

  const cuerpo = h('div');
  const irA = (id) => { store.ui.pestana = id; acciones.redibujar(); };

  contenedor.replaceChildren(crearPestanas(items, activa, irA), cuerpo);

  if (activa === 'paciente') renderPaciente(caso, cuerpo);
  else if (activa === 'reporte') renderReporte(caso, cuerpo, { irAHistorial: acciones.irAHistorial });
  else renderEstado(caso, activa, cuerpo, { irAEstado: irA, irAReporte: () => irA('reporte') });

  acciones.actualizarEncabezado();
}
