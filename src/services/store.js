/**
 * store.js — Estado global de la app: el caso abierto y la navegación.
 * - `store.caso` es el caso en edición (se guarda solo, en segundo plano).
 * - `store.ui` recuerda la sección (caso/historial) y la pestaña abierta.
 */
import { crearCaso } from '../models/caso.js';
import { ESTADOS } from '../config/estados.js';
import { ahora } from './reloj.js';
import * as db from './db.js';

export const store = {
  caso: null,
  ui: { seccion: 'caso', pestana: 'paciente' }
};

const CLAVE_ACTUAL = 'traslado.casoActual';
let temporizador = null;

/** Recuerda cuál era el caso abierto (si el navegador lo permite). */
function recordarActual(id) {
  try { id ? localStorage.setItem(CLAVE_ACTUAL, id) : localStorage.removeItem(CLAVE_ACTUAL); } catch (e) { /* sin almacenamiento */ }
}

function leerActual() {
  try { return localStorage.getItem(CLAVE_ACTUAL); } catch (e) { return null; }
}

/** Al iniciar la app: reabre el caso que estaba en curso (borrador), si existe. */
export async function iniciar() {
  const id = leerActual();
  let caso = id ? await db.obtenerCaso(id) : null;
  if (!caso) {
    const casos = await db.listarCasos();
    caso = casos.find((c) => !c.guardado) || null;
  }
  store.caso = caso || null;
  if (caso) store.ui.pestana = caso.estadoActual || 'paciente';
}

/** Crea un caso nuevo y lo deja abierto. */
export async function nuevoCaso() {
  await guardarAhora();
  const caso = crearCaso(ahora());
  store.caso = caso;
  store.ui = { seccion: 'caso', pestana: 'paciente' };
  recordarActual(caso.id);
  await db.guardarCaso(caso);
  return caso;
}

/** Abre un caso existente (por ejemplo, desde el historial). */
export async function abrirCaso(id) {
  await guardarAhora();
  const caso = await db.obtenerCaso(id);
  if (!caso) return null;
  store.caso = caso;
  store.ui = { seccion: 'caso', pestana: 'paciente' };
  recordarActual(caso.id);
  return caso;
}

/** Guarda el caso abierto en IndexedDB, de inmediato. */
export async function guardarAhora() {
  clearTimeout(temporizador);
  temporizador = null;
  if (store.caso) {
    store.caso.actualizadoEn = ahora();
    await db.guardarCaso(store.caso);
  }
}

/** Guardado automático con pequeña espera (se llama después de cada cambio). */
export function persistir() {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { guardarAhora().catch(console.error); }, 400);
}

/** Cierra el caso abierto (queda guardado en el historial). */
export function cerrarCaso() {
  store.caso = null;
  recordarActual(null);
}

/** Estados que ya iniciaron, en orden. */
export function estadosIniciados(caso) {
  return ESTADOS.filter((e) => caso.estados[e.id].iniciadoEn);
}

/** Nombres de medicamentos ya usados en ESTE paciente (hallazgo + estados), sin repetir. */
export function medicamentosDelPaciente(caso) {
  const nombres = new Map();
  const agregar = (n) => {
    const t = String(n || '').trim();
    if (t && !nombres.has(t.toLowerCase())) nombres.set(t.toLowerCase(), t);
  };
  caso.hallazgo.bolos.forEach((b) => agregar(b.medicamento));
  caso.hallazgo.infusiones.forEach((i) => agregar(i.medicamento));
  for (const e of ESTADOS) caso.estados[e.id].medicamentos.forEach((m) => agregar(m.medicamento));
  return [...nombres.values()];
}

/**
 * Infusiones "activas": la última versión registrada de cada infusión del paciente
 * (la inicial del hallazgo o la más reciente de los estados). Sirve para elegir qué
 * bomba cambiar sin perder el registro anterior.
 */
export function infusionesActivas(caso) {
  const ultima = new Map(); // nombre en minúsculas -> { medicamento, dosis, velocidad, orden }
  caso.hallazgo.infusiones.forEach((i, n) => {
    const t = String(i.medicamento || '').trim();
    if (t) ultima.set(t.toLowerCase(), { medicamento: t, dosis: i.dosis || '', velocidad: i.velocidad || '', orden: n });
  });
  const registros = [];
  for (const e of ESTADOS) {
    for (const m of caso.estados[e.id].medicamentos) if (m.tipo === 'infusion') registros.push(m);
  }
  registros.sort((a, b) => a.hora - b.hora);
  for (const m of registros) {
    const t = String(m.medicamento || '').trim();
    if (t) ultima.set(t.toLowerCase(), { medicamento: t, dosis: m.dosis || '', velocidad: m.velocidad || '', orden: 1e9 });
  }
  return [...ultima.values()];
}

/** Últimos parámetros del ventilador (hallazgo inicial o último cambio registrado). */
export function ventiladorActual(caso) {
  const base = { ...caso.hallazgo.ventilacion };
  const cambios = [];
  for (const e of ESTADOS) cambios.push(...caso.estados[e.id].ventilador);
  cambios.sort((a, b) => a.hora - b.hora);
  return cambios.length ? { ...base, ...cambios[cambios.length - 1] } : base;
}
