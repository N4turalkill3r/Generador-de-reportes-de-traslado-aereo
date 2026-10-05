/**
 * formatoHora.js — Formatos de hora (24 h) y fecha.
 * La hora siempre proviene del dispositivo (ver services/reloj.js).
 */

const dos = (n) => String(n).padStart(2, '0');

/** "09:17" — hora en formato 24 h a partir de un timestamp. */
export function formatoHora(ts) {
  if (!ts) return '';
  const f = new Date(ts);
  return `${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

/** "domingo, 20 de septiembre de 2026" */
export function formatoFechaLarga(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('es-SV', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/** "04102026" — día, mes y año sin separadores (para el nombre del archivo). */
export function fechaCompacta(ts) {
  const f = new Date(ts);
  return `${dos(f.getDate())}${dos(f.getMonth() + 1)}${f.getFullYear()}`;
}

/** "20/09/2026 09:17" — para listas como el historial. */
export function fechaCorta(ts) {
  const f = new Date(ts);
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${formatoHora(ts)}`;
}
