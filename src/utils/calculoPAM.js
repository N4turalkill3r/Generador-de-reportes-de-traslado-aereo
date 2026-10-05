/**
 * calculoPAM.js — Cálculo y clasificación de la Presión Arterial Media.
 *
 *   PAM = (Sistólica + 2 × Diastólica) / 3
 *
 * Los rangos por edad están en src/config/rangosPAM.js.
 */
import { BANDAS_PAM, ETIQUETAS_PAM } from '../config/rangosPAM.js';
import { COLORES } from '../config/constantes.js';

/** Convierte texto a número (acepta coma decimal). Devuelve NaN si no es número. */
export function aNumero(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return NaN;
  return Number(String(valor).trim().replace(',', '.'));
}

/**
 * Calcula la PAM exacta. Devuelve null si faltan datos o si la diastólica
 * es igual o mayor que la sistólica (dato probablemente mal escrito).
 */
export function calcularPAM(sistolica, diastolica) {
  const s = aNumero(sistolica);
  const d = aNumero(diastolica);
  if (!Number.isFinite(s) || !Number.isFinite(d) || s <= 0 || d <= 0) return null;
  if (d >= s) return null;
  return (s + 2 * d) / 3;
}

/** Indica si los datos están completos pero la diastólica >= sistólica. */
export function taInvalida(sistolica, diastolica) {
  const s = aNumero(sistolica);
  const d = aNumero(diastolica);
  return Number.isFinite(s) && Number.isFinite(d) && d >= s;
}

/**
 * Elige la banda de edad. `edad` = { valor, unidad } donde unidad es
 * 'anios' | 'meses' | 'dias'. Devuelve la clave de BANDAS_PAM o null si no hay edad.
 */
export function bandaPorEdad(edad) {
  if (!edad) return null;
  const valor = aNumero(edad.valor);
  if (!Number.isFinite(valor) || valor < 0) return null;
  if (edad.unidad === 'dias') return valor <= 28 ? 'reciennacido' : (valor < 365 ? 'lactante' : 'pequeno');
  if (edad.unidad === 'meses') return valor <= 12 ? 'lactante' : 'pequeno';
  // Años: se usa la parte entera (5.9 años cuenta como 5).
  const anios = Math.floor(valor);
  if (anios < 1) return 'lactante';
  if (anios <= 5) return 'pequeno';
  if (anios <= 12) return 'escolar';
  return 'adulto';
}

/**
 * Clasifica una PAM según la edad.
 * Devuelve { nivel, etiqueta, color, min, max, banda } o, si no hay edad,
 * { nivel: 'sinEdad', etiqueta: 'Ingrese la edad para clasificar' }.
 */
export function clasificarPAM(pam, edad) {
  const clave = bandaPorEdad(edad);
  if (!clave) return { nivel: 'sinEdad', etiqueta: 'Ingrese la edad del paciente para clasificar la PAM', color: null };
  const banda = BANDAS_PAM[clave];
  const textos = banda.pediatrica ? ETIQUETAS_PAM.pediatrica : ETIQUETAS_PAM.adulta;
  let nivel = 'normal';
  if (pam < banda.min) nivel = 'bajo';
  else if (pam > banda.max) nivel = 'alto';
  const color = nivel === 'bajo' ? COLORES.rojo : nivel === 'alto' ? COLORES.naranja : COLORES.verde;
  return { nivel, etiqueta: textos[nivel], color, min: banda.min, max: banda.max, banda: clave };
}

/** Formatea la PAM con un decimal. */
export function textoPAM(pam) {
  return pam.toFixed(1);
}
