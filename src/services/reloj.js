/**
 * reloj.js — ÚNICA fuente de la hora de la app.
 * Siempre devuelve la hora del dispositivo móvil. Ninguna otra parte del código
 * debe llamar a Date.now() para registrar horas: así la hora no se puede editar.
 */
export function ahora() {
  return Date.now();
}
