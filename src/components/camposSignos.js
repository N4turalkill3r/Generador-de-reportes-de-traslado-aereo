/**
 * camposSignos.js — Formulario de signos vitales con casillas separadas.
 * Se escribe solo el número; el formato (x´, %, mg/dl, °C) lo pone la app al mostrarlo.
 * Muestra la PAM al lado de la T/A, calculada en vivo.
 *
 * crearCamposSignos(signos, obtenerEdad, alCambiar) -> elemento
 *   `signos` es el objeto que se va actualizando mientras se escribe.
 */
import { h } from '../utils/dom.js';
import { persistir } from '../services/store.js';
import { crearInsigniaPAM } from './insigniaPAM.js';

let contador = 0;

export function crearCamposSignos(signos, obtenerEdad, alCambiar) {
  const pam = crearInsigniaPAM(() => signos, obtenerEdad);

  // Crea una casilla ligada a signos[clave].
  const casilla = (etiqueta, clave, { modo = 'decimal', placeholder = '', alTocar } = {}) => {
    const id = `sig-${clave}-${++contador}`;   // id único para enlazar etiqueta y casilla
    const input = h('input', { id, type: 'text', inputMode: modo, value: signos[clave] ?? '', placeholder, autocomplete: 'off' });
    input.addEventListener('input', () => {
      signos[clave] = input.value;
      persistir();
      if (alTocar) alTocar();
      if (alCambiar) alCambiar();
    });
    return h('div', { class: 'campo' }, h('label', { for: id }, etiqueta), input);
  };

  const raiz = h('div', {},
    h('div', { class: 'par-ta' },
      casilla('T/A sistólica', 'ta_s', { modo: 'numeric', placeholder: '120', alTocar: pam.actualizar }),
      h('div', { class: 'barra' }, '/'),
      casilla('T/A diastólica', 'ta_d', { modo: 'numeric', placeholder: '80', alTocar: pam.actualizar })
    ),
    pam.el,
    h('div', { class: 'rejilla', style: 'margin-top:8px' },
      casilla('F.C (x´)', 'fc', { modo: 'numeric', placeholder: '90' }),
      casilla('F.R (x´)', 'fr', { modo: 'numeric', placeholder: '30' }),
      casilla('SpO2 (%)', 'spo2', { modo: 'numeric', placeholder: '100' }),
      casilla('HGT (mg/dl)', 'hgt', { modo: 'text', placeholder: '80 / Low / High' }),
      casilla('Glasgow', 'glasgow', { modo: 'text', placeholder: '15 / N/A' }),
      casilla('T° (°C)', 'temp', { modo: 'decimal', placeholder: '36' })
    )
  );
  // Permite que la vista Paciente recalcule la clasificación cuando cambia la edad.
  raiz.actualizarPAM = pam.actualizar;
  return raiz;
}
