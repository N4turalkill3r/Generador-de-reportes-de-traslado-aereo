/**
 * constantes.js — Valores generales de la app que puedes cambiar sin tocar la lógica.
 */

// Nombre de la base de datos local (IndexedDB) y su versión.
export const DB_NOMBRE = 'traslado-db';
export const DB_VERSION = 1;

// Valor por defecto del campo "BOSEM/US".
export const BOSEM_POR_DEFECTO = 'ILOPANGO';

// Edad máxima (en años, inclusive) para considerar al paciente PEDIÁTRICO.
// 14 años o menos = "Ped." ; 15 o más = "Ad."
export const EDAD_MAXIMA_PEDIATRICA = 14;

// Título que se imprime en el membrete de cada página del PDF.
export const TITULO_REPORTE = 'REPORTE DE ASISTENCIA / ACCIDENTE AEREO';

// Rutas de los logos del membrete.
export const LOGO_IZQUIERDO = 'assets/img/logo-132sem.jpg';
export const LOGO_DERECHO = 'assets/img/logo-minsal.png';

// Colores usados en pantalla y en el PDF (formato hexadecimal).
export const COLORES = {
  rojo: '#d32f2f',
  verde: '#2e7d32',
  naranja: '#ef6c00',
  azul: '#0a2c6e'
};

// Tamaño máximo (en píxeles) de las fotos antes de guardarlas, para ahorrar espacio.
export const FOTO_LADO_MAXIMO = 1280;
export const FOTO_CALIDAD_JPEG = 0.8;

// Juntas de vigilancia para las firmas del reporte.
export const JUNTAS = [
  { valor: 'JVPM', texto: 'JVPM — Junta de Vigilancia de la Profesión Médica' },
  { valor: 'JVPE', texto: 'JVPE — Junta de Vigilancia de la Profesión de Enfermería' },
  { valor: '', texto: 'Sin junta' }
];
