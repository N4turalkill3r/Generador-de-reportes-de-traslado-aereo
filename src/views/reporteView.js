/**
 * reporteView.js — Pestaña "Reporte": número de asistencia, responsables con firma,
 * descarga del PDF y botón "Guardar registro" (envía el caso al Historial).
 */
import { h } from '../utils/dom.js';
import { abrirModal, avisar } from '../components/modal.js';
import { campoTexto, campoSelect } from '../components/camposComunes.js';
import { crearLienzoFirma } from '../components/firma.js';
import { JUNTAS } from '../config/constantes.js';
import { uid } from '../models/caso.js';
import { nombreArchivo } from '../services/nombreArchivo.js';
import { generarPDF } from '../services/pdf.js';
import { guardarAhora, persistir } from '../services/store.js';

/**
 * Genera el PDF del caso y lo descarga. Si falta el número de asistencia lo pregunta.
 * `despues` se llama cuando cambia algún dato del caso (para refrescar pantallas).
 */
export async function generarYDescargar(caso, despues) {
  if (!String(caso.numeroAsistencia ?? '').trim()) {
    const ok = await pedirNumeroAsistencia(caso);
    if (!ok) return;
    if (despues) despues();
  }
  let nombre;
  try {
    nombre = nombreArchivo(caso, caso.numeroAsistencia);
  } catch (e) {
    await avisar('No se puede generar el PDF', e.message);
    return;
  }
  try {
    const blob = await generarPDF(caso);
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    console.error(e);
    await avisar('Error al generar el PDF', String(e.message || e));
  }
}

/** Pregunta el número de asistencia (1, 2, 3…) y lo guarda en el caso. */
function pedirNumeroAsistencia(caso) {
  return new Promise((resolver) => {
    const v = { numero: caso.numeroAsistencia || '' };
    abrirModal({
      titulo: 'Número de asistencia',
      contenido: h('div', {},
        h('p', { class: 'texto-suave' }, '¿Cuál es el número de la asistencia que está registrando? Se agrega al final del nombre del archivo (_1, _2, _3…).'),
        campoTexto({ etiqueta: 'Número de asistencia', obj: v, clave: 'numero', tipo: 'text', modo: 'numeric', placeholder: '1' })),
      botones: [
        { texto: 'Cancelar', accion: () => resolver(false) },
        {
          texto: 'Continuar', clase: 'primario',
          accion: async () => {
            if (!String(v.numero).trim()) { await avisar('Falta el número', 'Escriba el número de asistencia.'); return false; }
            caso.numeroAsistencia = String(v.numero).trim();
            await guardarAhora();
            resolver(true);
          }
        }
      ]
    });
  });
}

export function renderReporte(caso, contenedor, acciones) {
  const refrescar = () => { persistir(); renderReporte(caso, contenedor, acciones); };

  // Vista previa del nombre del archivo.
  let nombre = '';
  let problema = '';
  try { nombre = nombreArchivo(caso, caso.numeroAsistencia); } catch (e) { problema = e.message; }

  const tarjetaNumero = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Número de asistencia'),
    campoTexto({
      etiqueta: 'Número de asistencia (va al final del nombre del archivo)', obj: caso, clave: 'numeroAsistencia',
      modo: 'numeric', placeholder: '1', alCambiar: () => actualizarNombre()
    }),
    h('div', { class: 'texto-suave', id: 'vista-nombre' }, nombre ? `Archivo: ${nombre}` : problema)
  );

  function actualizarNombre() {
    const el = tarjetaNumero.querySelector('#vista-nombre');
    try { el.textContent = `Archivo: ${nombreArchivo(caso, caso.numeroAsistencia)}`; }
    catch (e) { el.textContent = e.message; }
  }

  const tarjetaFirmas = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Responsables del reporte'),
    h('p', { class: 'texto-suave' }, 'Pueden firmar varias personas. Cada una con nombre, profesión y JVPM o JVPE.'),
    caso.firmas.length
      ? caso.firmas.map((f) => h('div', { class: 'entrada' },
          h('div', { class: 'firmante' },
            f.imagen ? h('img', { src: f.imagen, alt: 'Firma' }) : h('div', { class: 'texto-suave' }, 'Sin firma'),
            h('div', { class: 'datos' },
              h('strong', {}, f.nombre),
              h('div', { class: 'texto-suave' }, f.profesion),
              h('div', { class: 'texto-suave' }, f.junta ? `${f.junta} No. ${f.numero || '—'}` : ''))),
          h('div', { class: 'acciones', style: 'margin-top:8px' },
            h('button', { class: 'btn chico', type: 'button', onclick: () => formFirma(f) }, 'Editar'),
            h('button', {
              class: 'btn chico peligro', type: 'button',
              onclick: () => { caso.firmas.splice(caso.firmas.indexOf(f), 1); refrescar(); }
            }, 'Quitar'))))
      : h('div', { class: 'vacio' }, 'Aún no hay responsables.'),
    h('button', { class: 'btn primario ancho', type: 'button', onclick: () => formFirma(null) }, '＋ Agregar responsable')
  );

  const tarjetaAcciones = h('section', { class: 'tarjeta' },
    h('button', {
      class: 'btn primario ancho', type: 'button',
      onclick: () => generarYDescargar(caso, refrescar)
    }, 'Generar y descargar PDF'),
    h('div', { style: 'height:8px' }),
    h('button', {
      class: 'btn ancho', type: 'button',
      onclick: async () => {
        caso.guardado = true;
        await guardarAhora();
        acciones.irAHistorial();
      }
    }, 'Guardar registro')
  );

  contenedor.replaceChildren(tarjetaNumero, tarjetaFirmas, tarjetaAcciones);

  /** Agregar o editar un responsable con su firma. */
  function formFirma(existente) {
    const v = existente
      ? { ...existente }
      : { id: uid(), nombre: '', profesion: '', junta: 'JVPM', numero: '', imagen: '' };
    const lienzo = crearLienzoFirma();
    const contenidoFirma = h('div', { class: 'campo' },
      h('label', {}, 'Firma (dibuje con el dedo)'),
      lienzo.el,
      h('div', { class: 'fila-botones' },
        h('button', { class: 'btn chico', type: 'button', onclick: () => { lienzo.limpiar(); v.imagen = ''; } }, 'Borrar firma')),
      existente && existente.imagen ? h('div', { class: 'texto-suave' }, 'Ya tiene una firma guardada; si no dibuja otra, se conserva.') : null
    );

    abrirModal({
      titulo: existente ? 'Editar responsable' : 'Agregar responsable',
      contenido: h('div', {},
        campoTexto({ etiqueta: 'Nombre completo', obj: v, clave: 'nombre' }),
        campoTexto({ etiqueta: 'Profesión', obj: v, clave: 'profesion', placeholder: 'Ej. Médico pediatra, Enfermero, T.E.M' }),
        campoSelect({ etiqueta: 'Junta de vigilancia', obj: v, clave: 'junta', opciones: JUNTAS.map((j) => ({ valor: j.valor, texto: j.texto })), vacio: null }),
        campoTexto({ etiqueta: 'Número de JVPM / JVPE', obj: v, clave: 'numero' }),
        contenidoFirma),
      botones: [
        { texto: 'Cancelar' },
        {
          texto: 'Guardar', clase: 'primario',
          accion: async () => {
            if (!String(v.nombre).trim()) { await avisar('Falta el nombre', 'Escriba el nombre del responsable.'); return false; }
            if (!lienzo.estaVacio()) v.imagen = lienzo.obtenerImagen();
            if (existente) Object.assign(existente, v);
            else caso.firmas.push(v);
            refrescar();
          }
        }
      ]
    });
  }

}
