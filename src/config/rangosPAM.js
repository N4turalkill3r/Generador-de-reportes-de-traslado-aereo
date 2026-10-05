/**
 * rangosPAM.js — Rangos de Presión Arterial Media (PAM) por edad, en mmHg.
 *
 * Para cada banda de edad:
 *   - PAM menor que `min`            -> 🔴 rojo   (bajo)
 *   - PAM entre `min` y `max` (incl.) -> 🟢 verde  (normal)
 *   - PAM mayor que `max`            -> 🟠 naranja (alto)
 *
 * Solo se usa la EDAD (no sexo ni estatura). Edita los números aquí para ajustarlos.
 * La banda se elige en src/utils/calculoPAM.js (función bandaPorEdad).
 */
export const BANDAS_PAM = {
  reciennacido: { nombre: 'Recién nacido (0-28 días)',   min: 40, max: 50,  pediatrica: true },
  lactante:     { nombre: 'Lactante (29 días-12 meses)', min: 50, max: 60,  pediatrica: true },
  pequeno:      { nombre: 'Niño pequeño (1-5 años)',     min: 55, max: 65,  pediatrica: true },
  escolar:      { nombre: 'Escolar (6-12 años)',         min: 60, max: 75,  pediatrica: true },
  adulto:       { nombre: 'Adolescente/adulto (13+)',    min: 65, max: 105, pediatrica: false }
};

// Etiquetas que se muestran junto al resultado.
export const ETIQUETAS_PAM = {
  pediatrica: {
    bajo: 'Bajo para su edad',
    normal: 'Rango normal para su edad',
    alto: 'Alto para su edad'
  },
  adulta: {
    bajo: 'Bajo, riesgo de hipoperfusión',
    normal: 'Rango normal',
    alto: 'Presión media alta'
  }
};
