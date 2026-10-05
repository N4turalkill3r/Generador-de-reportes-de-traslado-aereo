/**
 * modal.js — Hoja emergente inferior para formularios (signos, medicamentos, firmas…).
 *
 * abrirModal({ titulo, contenido, botones })
 *   botones: [{ texto, clase, accion }]  — si `accion` devuelve false, el modal NO se cierra
 *   (útil para validar). Devuelve { cerrar }.
 */
import { h } from '../utils/dom.js';

export function abrirModal({ titulo, contenido, botones = [] }) {
  const raiz = document.getElementById('modal-root');
  const fondo = h('div', { class: 'modal-fondo' });

  const cerrar = () => fondo.remove();

  const pie = h('div', { class: 'pie' },
    botones.map((b) => h('button', {
      class: `btn ${b.clase || ''}`,
      type: 'button',
      onclick: async () => {
        const resultado = b.accion ? await b.accion() : undefined;
        if (resultado !== false) cerrar();
      }
    }, b.texto))
  );

  fondo.appendChild(h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
    titulo ? h('h2', {}, titulo) : null,
    contenido,
    pie
  ));
  raiz.appendChild(fondo);
  return { cerrar };
}

/** Confirmación sencilla. Devuelve una promesa con true/false. */
export function confirmar(titulo, mensaje, textoAceptar = 'Aceptar', peligro = false) {
  return new Promise((resolver) => {
    abrirModal({
      titulo,
      contenido: h('p', {}, mensaje),
      botones: [
        { texto: 'Cancelar', accion: () => resolver(false) },
        { texto: textoAceptar, clase: peligro ? 'peligro' : 'primario', accion: () => resolver(true) }
      ]
    });
  });
}

/** Aviso con un solo botón. */
export function avisar(titulo, mensaje) {
  return new Promise((resolver) => {
    abrirModal({
      titulo,
      contenido: h('p', {}, mensaje),
      botones: [{ texto: 'Entendido', clase: 'primario', accion: () => resolver() }]
    });
  });
}
