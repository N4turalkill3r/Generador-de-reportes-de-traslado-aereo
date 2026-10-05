/**
 * estados.js — Los 7 estados de atención del traslado, en orden.
 * `id` se usa internamente, `codigo` es el nombre operativo y `nombre` la descripción.
 * `leyendas: true` indica que desde ese estado el reporte imprime en rojo
 * "Sin modificaciones de ventilador / de medicamentos" cuando no hay registros
 * (según lo definido: desde Echo Alfa en adelante).
 */
export const ESTADOS = [
  { id: 'echo',        codigo: 'Echo',         nombre: 'En camino',                        leyendas: false },
  { id: 'echoLima',    codigo: 'Echo Lima',    nombre: 'En el lugar',                      leyendas: false },
  { id: 'echoAlfa',    codigo: 'Echo Alfa',    nombre: 'En asistencia',                    leyendas: true },
  { id: 'echoCharlie', codigo: 'Echo Charlie', nombre: 'En camino a centro sanitario',     leyendas: true },
  { id: 'echoEcho',    codigo: 'Echo Echo',    nombre: 'En entrega de paciente',           leyendas: true },
  { id: 'echoDelta',   codigo: 'Echo Delta',   nombre: 'En dirección a base operativa',    leyendas: true },
  { id: 'delta',       codigo: 'Delta',        nombre: 'Disponible',                       leyendas: true }
];

/** Devuelve la definición de un estado por su id. */
export function obtenerEstado(id) {
  return ESTADOS.find((e) => e.id === id);
}

/** Devuelve el id del estado siguiente, o null si es el último. */
export function siguienteEstado(id) {
  const i = ESTADOS.findIndex((e) => e.id === id);
  return i >= 0 && i < ESTADOS.length - 1 ? ESTADOS[i + 1].id : null;
}
