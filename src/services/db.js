/**
 * db.js — Acceso a IndexedDB (almacenamiento local del celular).
 * Guarda los casos completos (incluyendo las fotos como Blob) en el almacén "casos".
 */
import { DB_NOMBRE, DB_VERSION } from '../config/constantes.js';

let promesaDB = null;

/** Abre (o crea) la base de datos. */
function abrir() {
  if (!promesaDB) {
    promesaDB = new Promise((resolver, rechazar) => {
      const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);
      peticion.onupgradeneeded = () => {
        const db = peticion.result;
        if (!db.objectStoreNames.contains('casos')) db.createObjectStore('casos', { keyPath: 'id' });
      };
      peticion.onsuccess = () => resolver(peticion.result);
      peticion.onerror = () => rechazar(peticion.error);
    });
  }
  return promesaDB;
}

/** Ejecuta una operación sobre el almacén y devuelve su resultado. */
async function operar(modo, accion) {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction('casos', modo);
    const peticion = accion(tx.objectStore('casos'));
    tx.oncomplete = () => resolver(peticion ? peticion.result : undefined);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
}

export const guardarCaso = (caso) => operar('readwrite', (s) => s.put(caso));
export const obtenerCaso = (id) => operar('readonly', (s) => s.get(id));
export const borrarCaso = (id) => operar('readwrite', (s) => s.delete(id));

/** Todos los casos, del más reciente al más antiguo. */
export async function listarCasos() {
  const todos = await operar('readonly', (s) => s.getAll());
  return (todos || []).sort((a, b) => b.actualizadoEn - a.actualizadoEn);
}
