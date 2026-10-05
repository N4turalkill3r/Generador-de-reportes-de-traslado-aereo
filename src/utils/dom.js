/**
 * dom.js — Pequeña ayuda para crear elementos HTML desde JavaScript.
 *
 * Uso:  h('div', { class: 'tarjeta', onclick: () => ... }, 'texto', otroElemento)
 *  - `class`   -> className
 *  - `onXxx`   -> addEventListener('xxx', ...)
 *  - `value`, `checked`, `disabled`, etc. se asignan como propiedades
 *  - Los hijos pueden ser texto, elementos, arreglos o null/false (se ignoran)
 */
export function h(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'class') el.className = valor;
    else if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2).toLowerCase(), valor);
    else if (clave === 'dataset') Object.assign(el.dataset, valor);
    else if (clave in el && clave !== 'list') el[clave] = valor;
    else el.setAttribute(clave, valor === true ? '' : valor);
  }
  agregarHijos(el, hijos);
  return el;
}

function agregarHijos(el, hijos) {
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    if (Array.isArray(hijo)) agregarHijos(el, hijo);
    else if (hijo instanceof Node) el.appendChild(hijo);
    else el.appendChild(document.createTextNode(String(hijo)));
  }
}

/** Vacía un elemento y le agrega nuevos hijos. */
export function reemplazar(el, ...hijos) {
  el.replaceChildren();
  agregarHijos(el, hijos);
  return el;
}
