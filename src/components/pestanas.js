/**
 * pestanas.js — Barra de pestañas desplazable (Paciente · un estado por pestaña · Reporte).
 *
 * crearPestanas(items, activa, alElegir)
 *   items: [{ id, texto, pendiente?, punto? }]
 */
import { h } from '../utils/dom.js';

export function crearPestanas(items, activa, alElegir) {
  const barra = h('div', { class: 'pestanas', role: 'tablist' },
    items.map((it) => h('button', {
      class: `pestana ${it.id === activa ? 'activa' : ''} ${it.pendiente ? 'pendiente' : ''}`,
      type: 'button',
      role: 'tab',
      dataset: { id: it.id },
      onclick: () => alElegir(it.id)
    }, it.punto ? h('span', { class: 'punto' }) : null, it.texto))
  );
  // Deja visible la pestaña activa.
  requestAnimationFrame(() => {
    const act = barra.querySelector('.activa');
    if (act) act.scrollIntoView({ inline: 'center', block: 'nearest' });
  });
  return barra;
}
