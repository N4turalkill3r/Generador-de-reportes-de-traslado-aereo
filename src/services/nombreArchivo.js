/**
 * nombreArchivo.js — Nombre automático del PDF.
 * Formato: [Ped.|Ad.] + DDMMAAAA + _N      Ejemplo: Ad.04102026_1.pdf
 *   - Ped./Ad. según la edad (14 años o menos = Ped.)
 *   - DDMMAAAA: fecha del caso, sin guiones ni barras
 *   - N: número de asistencia que se pregunta al generar el reporte
 */
import { prefijoEdad } from '../utils/edadPediatrica.js';
import { fechaCompacta } from '../utils/formatoHora.js';

/** Devuelve el nombre o lanza un Error con el motivo si falta algún dato. */
export function nombreArchivo(caso, numeroAsistencia) {
  const prefijo = prefijoEdad(caso.paciente.edad);
  if (!prefijo) throw new Error('Falta la edad del paciente (pestaña Paciente).');
  const numero = String(numeroAsistencia ?? '').trim();
  if (!numero) throw new Error('Falta el número de asistencia.');
  return `${prefijo}${fechaCompacta(caso.paciente.fecha)}_${numero}.pdf`;
}
