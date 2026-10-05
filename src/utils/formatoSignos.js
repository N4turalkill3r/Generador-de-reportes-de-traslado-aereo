/**
 * formatoSignos.js — Da formato automático a los signos vitales.
 * Se escribe solo el número y aquí se agrega la etiqueta y la unidad:
 *   TA: 120/80 · FC: 90 x´ · FR: 30 x´ · SPO2: 100% · Hgt: 80 mg/dl · T°: 36 °C · Glasgow: 15
 * Si el valor no es numérico (por ejemplo "N/A" o "Sin datos") se imprime tal cual.
 */

const ES_NUMERO = /^-?\d+([.,]\d+)?$/;

// Definición de cada signo (el orden es el orden de impresión).
export const CAMPOS_SIGNOS = [
  { clave: 'fc',      etiqueta: 'FC',      unidad: ' x´' },
  { clave: 'fr',      etiqueta: 'FR',      unidad: ' x´' },
  { clave: 'spo2',    etiqueta: 'SPO2',    unidad: '%' },
  { clave: 'hgt',     etiqueta: 'Hgt',     unidad: ' mg/dl' },
  { clave: 'glasgow', etiqueta: 'Glasgow', unidad: '' },
  { clave: 'temp',    etiqueta: 'T°',      unidad: ' °C' }
];

/** Agrega la unidad solo si el texto es un número. */
export function conUnidad(valor, unidad) {
  const v = String(valor ?? '').trim();
  if (!v) return '';
  return ES_NUMERO.test(v) ? `${v}${unidad}` : v;
}

/** Texto de la tensión arterial: "TA: 120/80" (vacío si no hay ningún dato). */
export function textoTA(s) {
  const sis = String(s?.ta_s ?? '').trim();
  const dia = String(s?.ta_d ?? '').trim();
  if (!sis && !dia) return '';
  return `TA: ${sis || '--'}/${dia || '--'}`;
}

/**
 * Devuelve la lista de signos con valor, ya formateados, en orden:
 * [{ clave:'ta', texto:'TA: 120/80' }, { clave:'fc', texto:'FC: 90 x´' }, ...]
 */
export function signosFormateados(s) {
  const lista = [];
  const ta = textoTA(s);
  if (ta) lista.push({ clave: 'ta', texto: ta });
  for (const c of CAMPOS_SIGNOS) {
    const v = conUnidad(s?.[c.clave], c.unidad);
    if (v) lista.push({ clave: c.clave, texto: `${c.etiqueta}: ${v}` });
  }
  return lista;
}

/** true si el objeto de signos tiene al menos un dato. */
export function tieneSignos(s) {
  return signosFormateados(s).length > 0;
}
