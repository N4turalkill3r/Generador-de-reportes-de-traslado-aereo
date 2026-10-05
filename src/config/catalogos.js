/**
 * catalogos.js — Listas desplegables tomadas de la hoja "base de datos" del Excel.
 * Los campos numéricos (FC, FR, SpO2, PEEP, FiO2, etc.) son de texto libre,
 * por eso aquí solo están las listas de opciones cerradas.
 * Para agregar una opción, añádela al arreglo correspondiente.
 */

export const TIPO_ASISTENCIA_VENTILATORIA = ['Espontánea', 'Mecánica'];
export const CONDICION = ['Crítico', 'No crítico'];
export const ASISTENCIA = ['Interhospitalaria', 'Domiciliar'];
export const SI_NO = ['Sí', 'No'];

export const MODO_VENTILATORIO = [
  'AC/V', 'AC/P', 'SIMV', 'CPAP', 'BiPAP', 'PS/SIMV', 'CPAP/PS', 'VC/P', 'VC/V'
];

export const RELACION_IE = ['1:1', '1:2', '1:3', '1:4'];

// Sugerencias para los campos de solución / medicamento (se puede escribir otro).
export const SOLUCIONES = [
  'NaCl + Glucosa S. Mixto', 'S. Hartmann', 'S. Glucosado 5%', 'S. Glucosado 10%',
  'S. Glucosado 50%', 'Hemacel', 'SSN 0.9%', 'NaCl 3%', 'NaCl 7.5%'
];

// Unidades de edad para el campo "Edad".
export const UNIDADES_EDAD = [
  { valor: 'anios', texto: 'años' },
  { valor: 'meses', texto: 'meses' },
  { valor: 'dias', texto: 'días' }
];
