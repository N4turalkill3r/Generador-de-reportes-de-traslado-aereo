/**
 * edadPediatrica.js — Decide si el paciente es pediátrico ("Ped.") o adulto ("Ad.").
 * Pediátrico = 14 años o menos (el límite está en config/constantes.js).
 * Meses y días siempre cuentan como pediátrico.
 */
import { EDAD_MAXIMA_PEDIATRICA } from '../config/constantes.js';
import { aNumero } from './calculoPAM.js';

/** Devuelve true/false, o null si no hay una edad válida. */
export function esPediatrico(edad) {
  if (!edad) return null;
  const valor = aNumero(edad.valor);
  if (!Number.isFinite(valor) || valor < 0) return null;
  if (edad.unidad === 'meses' || edad.unidad === 'dias') return true;
  return Math.floor(valor) <= EDAD_MAXIMA_PEDIATRICA;
}

/** Prefijo del nombre del archivo: "Ped." o "Ad." (o null si falta la edad). */
export function prefijoEdad(edad) {
  const ped = esPediatrico(edad);
  if (ped === null) return null;
  return ped ? 'Ped.' : 'Ad.';
}

/** Texto de la edad para pantalla y PDF, por ejemplo "4 años". */
export function textoEdad(edad) {
  if (!edad || String(edad.valor ?? '').trim() === '') return '';
  const unidades = { anios: 'años', meses: 'meses', dias: 'días' };
  return `${String(edad.valor).trim()} ${unidades[edad.unidad] || 'años'}`;
}
