/**
 * caso.js — Estructura de datos de un caso (un paciente / una asistencia).
 * Todo lo que se guarda en IndexedDB tiene esta forma. Las horas son
 * timestamps (milisegundos) tomados del reloj del dispositivo.
 */
import { ESTADOS } from '../config/estados.js';
import { BOSEM_POR_DEFECTO } from '../config/constantes.js';

/** Identificador único simple para cada entrada. */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Signos vitales vacíos. */
export function signosVacios() {
  return { ta_s: '', ta_d: '', fc: '', fr: '', spo2: '', hgt: '', glasgow: '', temp: '' };
}

/** Parámetros ventilatorios vacíos. */
export function ventilacionVacia() {
  return { modo: '', peep: '', volumen: '', fr: '', ie: '', fio2: '', tot: '' };
}

/** Datos de un estado (pestaña) vacío. */
function estadoVacio() {
  return {
    iniciadoEn: null,     // hora en que se abrió el estado
    finalizadoEn: null,   // hora en que se pasó al siguiente
    historia: '',         // descripción del proceso (editable)
    nota: '',             // nota (se imprime en negrita)
    signos: [],           // [{ id, hora, ta_s, ta_d, fc, fr, spo2, hgt, glasgow, temp }]
    medicamentos: [],     // [{ id, hora, tipo:'bolo'|'infusion', medicamento, dosis, velocidad, cambioBomba }]
    ventilador: [],       // [{ id, hora, modo, peep, volumen, fr, ie, fio2, tot }]
    fotos: []             // [{ id, hora, blob }]
  };
}

/** Crea un caso nuevo. `ahora` es la hora del dispositivo. */
export function crearCaso(ahora) {
  const estados = {};
  for (const e of ESTADOS) estados[e.id] = estadoVacio();
  estados[ESTADOS[0].id].iniciadoEn = ahora; // El caso inicia en el primer estado (Echo)

  return {
    id: uid(),
    creadoEn: ahora,
    actualizadoEn: ahora,
    guardado: false,            // true cuando se pulsa "Guardar registro"
    numeroAsistencia: '',
    paciente: {
      fecha: ahora,
      bosem: BOSEM_POR_DEFECTO,
      nombre: '', edad: { valor: '', unidad: 'anios' }, diagnostico: '',
      ticket: '', peso: '', reportaA: ''
    },
    tripulacion: { capitan: '', medico: '', medicoEspecialista: '', tem: '', aem: '' },
    // Hallazgo inicial: lo encontrado en el paciente (no tiene hora, no cambia con los estados).
    hallazgo: {
      signos: signosVacios(),
      condicion: '', asistencia: '',
      ventilacionTipo: '', ventilacion: ventilacionVacia(),
      numTot: '', dispositivo: '',
      perifericos: '', centrales: '', bombasInfusoras: '', bombasPerfusoras: '',
      bolos: [],        // [{ id, medicamento, dosis }]   (columna "Solución / Goteo-Vel.")
      infusiones: []    // [{ id, medicamento, dosis, velocidad }]
    },
    estados,
    estadoActual: ESTADOS[0].id,
    firmas: []          // [{ id, nombre, profesion, junta, numero, imagen }]
  };
}
