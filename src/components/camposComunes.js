/**
 * camposComunes.js — Campos de formulario ya ligados a un objeto de datos.
 * Al escribir, el valor se copia a obj[clave] y se dispara el guardado automático.
 */
import { h } from '../utils/dom.js';
import { persistir } from '../services/store.js';

let contador = 0;
const nuevoId = (p) => `${p}-${++contador}`;

/** Campo de texto (o número) con etiqueta. `lista` = sugerencias (datalist). */
export function campoTexto({ etiqueta, obj, clave, tipo = 'text', modo, placeholder = '', lista = null, solo = false, alCambiar, clase = '' }) {
  const id = nuevoId('t');
  const idLista = lista ? nuevoId('l') : null;
  const input = h('input', {
    id, type: tipo, value: obj[clave] ?? '', placeholder, readOnly: solo,
    inputMode: modo, autocomplete: 'off', list: idLista
  });
  input.addEventListener('input', () => {
    obj[clave] = input.value;
    persistir();
    if (alCambiar) alCambiar(input.value);
  });
  return h('div', { class: `campo ${clase}` },
    h('label', { for: id }, etiqueta),
    input,
    lista ? h('datalist', { id: idLista }, lista.map((o) => h('option', { value: o }))) : null
  );
}

/** Lista desplegable con etiqueta. `opciones` = ['A','B'] o [{valor,texto}]. */
export function campoSelect({ etiqueta, obj, clave, opciones, vacio = '— Seleccionar —', alCambiar, clase = '' }) {
  const id = nuevoId('s');
  const normal = opciones.map((o) => (typeof o === 'string' ? { valor: o, texto: o } : o));
  const actual = obj[clave] ?? '';
  const select = h('select', { id },
    vacio === null ? null : h('option', { value: '' }, vacio),
    normal.map((o) => h('option', { value: o.valor }, o.texto)),
    // Si el valor guardado no está en la lista, se conserva igualmente.
    actual && !normal.some((o) => o.valor === actual) ? h('option', { value: actual }, actual) : null
  );
  select.value = actual;
  select.addEventListener('change', () => {
    obj[clave] = select.value;
    persistir();
    if (alCambiar) alCambiar(select.value);
  });
  return h('div', { class: `campo ${clase}` }, h('label', { for: id }, etiqueta), select);
}

/** Área de texto con etiqueta. */
export function campoArea({ etiqueta, obj, clave, placeholder = '', clase = '' }) {
  const id = nuevoId('a');
  const area = h('textarea', { id, placeholder }, '');
  area.value = obj[clave] ?? '';
  area.addEventListener('input', () => {
    obj[clave] = area.value;
    persistir();
  });
  return h('div', { class: `campo ${clase}` }, h('label', { for: id }, etiqueta), area);
}
