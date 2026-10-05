/**
 * firma.js — Lienzo para firmar con el dedo o el lápiz táctil.
 *
 * crearLienzoFirma() -> { el, estaVacio(), obtenerImagen(), limpiar() }
 * La firma se devuelve como imagen PNG (data URL) con fondo transparente.
 */
import { h } from '../utils/dom.js';

export function crearLienzoFirma() {
  const lienzo = h('canvas', { class: 'firma-lienzo' });
  let vacio = true;
  let dibujando = false;

  // Ajusta la resolución real del lienzo a su tamaño en pantalla.
  function ajustar() {
    const caja = lienzo.getBoundingClientRect();
    const escala = window.devicePixelRatio || 1;
    lienzo.width = Math.max(1, Math.round(caja.width * escala));
    lienzo.height = Math.max(1, Math.round(caja.height * escala));
    const ctx = lienzo.getContext('2d');
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a1a4a';
  }

  const punto = (e) => {
    const caja = lienzo.getBoundingClientRect();
    return { x: e.clientX - caja.left, y: e.clientY - caja.top };
  };

  lienzo.addEventListener('pointerdown', (e) => {
    dibujando = true;
    lienzo.setPointerCapture(e.pointerId);
    const p = punto(e);
    const ctx = lienzo.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1); // permite marcar un punto
    ctx.stroke();
    vacio = false;
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!dibujando) return;
    const p = punto(e);
    const ctx = lienzo.getContext('2d');
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  const terminar = () => { dibujando = false; };
  lienzo.addEventListener('pointerup', terminar);
  lienzo.addEventListener('pointercancel', terminar);

  // El lienzo debe estar en el documento para medirse; se ajusta al agregarse.
  const observador = new MutationObserver(() => {
    if (document.body.contains(lienzo)) { ajustar(); observador.disconnect(); }
  });
  observador.observe(document.body, { childList: true, subtree: true });

  return {
    el: lienzo,
    estaVacio: () => vacio,
    obtenerImagen: () => lienzo.toDataURL('image/png'),
    limpiar: () => {
      const ctx = lienzo.getContext('2d');
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.restore();
      vacio = true;
    }
  };
}
