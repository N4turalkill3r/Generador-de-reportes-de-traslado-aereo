/**
 * insigniaPAM.js — Muestra la PAM calculada con su color y etiqueta.
 *
 * crearInsigniaPAM(obtenerSignos, obtenerEdad) -> { el, actualizar }
 *   - obtenerSignos(): objeto con ta_s y ta_d
 *   - obtenerEdad():   { valor, unidad } del paciente
 * Llama a `actualizar()` cada vez que cambie la T/A o la edad.
 */
import { h } from '../utils/dom.js';
import { calcularPAM, clasificarPAM, taInvalida, textoPAM } from '../utils/calculoPAM.js';

const CLASE_POR_NIVEL = { bajo: 'rojo', normal: 'verde', alto: 'naranja', sinEdad: 'gris' };

/** Texto largo de la PAM: "PAM: 93.3 mmHg · Rango normal (ref. 65–105)". */
export function describirPAM(signos, edad) {
  const pam = calcularPAM(signos.ta_s, signos.ta_d);
  if (pam === null) return null;
  const c = clasificarPAM(pam, edad);
  const ref = c.min !== undefined ? ` (ref. ${c.min}–${c.max})` : '';
  return { pam, clasificacion: c, texto: `PAM: ${textoPAM(pam)} mmHg · ${c.etiqueta}${ref}` };
}

export function crearInsigniaPAM(obtenerSignos, obtenerEdad) {
  const el = h('div', { 'aria-live': 'polite' });

  function actualizar() {
    const s = obtenerSignos();
    el.replaceChildren();
    if (taInvalida(s.ta_s, s.ta_d)) {
      el.appendChild(h('div', { class: 'aviso rojo' }, 'La diastólica debe ser menor que la sistólica. Revise los valores.'));
      return;
    }
    const d = describirPAM(s, obtenerEdad());
    if (!d) return;
    el.appendChild(h('div', { class: `insignia-pam ${CLASE_POR_NIVEL[d.clasificacion.nivel]}` },
      h('span', { class: 'bola' }), d.texto));
  }

  actualizar();
  return { el, actualizar };
}
