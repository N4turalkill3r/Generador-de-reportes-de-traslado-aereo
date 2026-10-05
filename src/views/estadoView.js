/**
 * estadoView.js — Pestaña de UN estado (Echo, Echo Lima, … Delta).
 *
 * Contiene: signos vitales, medicamentos (bolo/infusión), cambios de bombas,
 * cambios del ventilador, historia, nota, fotos y el botón "Nuevo estado".
 * Todo es editable y borrable, EXCEPTO la hora (se toma del dispositivo).
 */
import { h, reemplazar } from '../utils/dom.js';
import { abrirModal, confirmar, avisar } from '../components/modal.js';
import { campoTexto, campoSelect, campoArea } from '../components/camposComunes.js';
import { crearCamposSignos } from '../components/camposSignos.js';
import { describirPAM } from '../components/insigniaPAM.js';
import { signosFormateados, tieneSignos } from '../utils/formatoSignos.js';
import { taInvalida } from '../utils/calculoPAM.js';
import { formatoHora } from '../utils/formatoHora.js';
import { textoMedicamento, textoVentilador } from '../utils/formatoRegistros.js';
import { obtenerEstado, siguienteEstado } from '../config/estados.js';
import { MODO_VENTILATORIO, RELACION_IE } from '../config/catalogos.js';
import { signosVacios, uid } from '../models/caso.js';
import { ahora } from '../services/reloj.js';
import { tomarFoto } from '../services/camara.js';
import { persistir, medicamentosDelPaciente, infusionesActivas, ventiladorActual } from '../services/store.js';

const CLASE_PAM = { bajo: 'rojo', normal: 'verde', alto: 'naranja', sinEdad: 'gris' };

/**
 * @param caso        caso abierto
 * @param estadoId    id del estado a mostrar
 * @param contenedor  elemento donde dibujar
 * @param acciones    { irAEstado(id), irAReporte() }
 */
export function renderEstado(caso, estadoId, contenedor, acciones) {
  const def = obtenerEstado(estadoId);
  const est = caso.estados[estadoId];
  const edad = () => caso.paciente.edad;

  // Vuelve a dibujar esta misma pestaña (después de agregar, editar o borrar).
  const refrescar = () => { persistir(); renderEstado(caso, estadoId, contenedor, acciones); };

  // ---------- Cabecera ----------
  const esActual = caso.estadoActual === estadoId;
  const cabecera = h('section', { class: 'tarjeta' },
    h('div', { class: 'estado-cabecera' },
      h('div', {},
        h('div', { class: 'nombre' }, def.codigo),
        h('div', { class: 'codigo' }, def.nombre)),
      est.iniciadoEn
        ? h('div', { style: 'text-align:right' },
            h('span', { class: `sello ${esActual ? 'activo' : 'cerrado'}` }, esActual ? 'En curso' : 'Cerrado'),
            h('div', { class: 'hora', style: 'font-weight:800;color:var(--azul)' }, `Inicio ${formatoHora(est.iniciadoEn)}`),
            est.finalizadoEn ? h('div', { class: 'texto-suave' }, `Fin ${formatoHora(est.finalizadoEn)}`) : null)
        : null
    )
  );

  if (!est.iniciadoEn) {
    contenedor.replaceChildren(cabecera,
      h('div', { class: 'tarjeta vacio' }, 'Este estado aún no ha iniciado. Se abre con el botón «Nuevo estado» del estado anterior.'));
    return;
  }

  // ---------- Signos vitales ----------
  const listaSignos = [...est.signos].sort((a, b) => a.hora - b.hora).map((e) => {
    const pam = describirPAM(e, edad());
    return entrada({
      hora: e.hora,
      detalle: signosFormateados(e).map((s) => s.texto).join('  ·  ') || '(sin datos)',
      extra: pam ? h('div', { class: `insignia-pam ${CLASE_PAM[pam.clasificacion.nivel]}` }, h('span', { class: 'bola' }), pam.texto) : null,
      alEditar: () => formSignos(e),
      alBorrar: () => borrar(est.signos, e, '¿Borrar esta toma de signos?')
    });
  });

  const tarjetaSignos = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Signos vitales'),
    listaSignos.length ? listaSignos : h('div', { class: 'vacio' }, 'Sin tomas de signos en este estado.'),
    h('button', { class: 'btn primario ancho', type: 'button', onclick: () => formSignos(null) }, '＋ Agregar nuevos signos')
  );

  // ---------- Medicamentos, bombas y ventilador ----------
  const listaMeds = [...est.medicamentos].sort((a, b) => a.hora - b.hora).map((m) => entrada({
    hora: m.hora,
    etiqueta: `${m.tipo === 'infusion' ? 'Infusión' : 'Bolo'}${m.cambioBomba ? ' · cambio de bomba' : ''}`,
    detalle: textoMedicamento(m),
    alEditar: () => formMedicamento(m),
    alBorrar: () => borrar(est.medicamentos, m, '¿Borrar este registro de medicamento?')
  }));

  const listaVent = [...est.ventilador].sort((a, b) => a.hora - b.hora).map((v) => entrada({
    hora: v.hora,
    etiqueta: 'Ventilador',
    detalle: textoVentilador(v),
    alEditar: () => formVentilador(v),
    alBorrar: () => borrar(est.ventilador, v, '¿Borrar este cambio del ventilador?')
  }));

  const tarjetaMeds = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Medicamentos y bombas'),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'btn primario', type: 'button', onclick: () => formMedicamento(null) }, 'Registrar'),
      h('button', { class: 'btn', type: 'button', onclick: formCambioBomba }, 'Cambiar bomba')
    ),
    listaMeds.length
      ? listaMeds
      : h('div', { class: def.leyendas ? 'leyenda-roja' : 'vacio' }, def.leyendas ? 'Sin modificaciones de medicamentos' : 'Sin registros de medicamentos.'),
    h('h3', {}, 'Ventilador mecánico'),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'btn', type: 'button', onclick: () => formVentilador(null) }, 'Cambios en ventilador')
    ),
    listaVent.length
      ? listaVent
      : h('div', { class: def.leyendas ? 'leyenda-roja' : 'vacio' }, def.leyendas ? 'Sin modificaciones de ventilador mecánico' : 'Sin cambios del ventilador.')
  );

  // ---------- Historia y nota ----------
  const tarjetaHistoria = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Historia'),
    campoArea({ etiqueta: 'Describa el proceso en este estado', obj: est, clave: 'historia', placeholder: 'Se puede editar después de cambiar de estado.' }),
    campoArea({ etiqueta: 'Nota (se imprime en negrita al final)', obj: est, clave: 'nota' })
  );

  // ---------- Fotos ----------
  const tarjetaFotos = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Fotos'),
    est.fotos.length
      ? h('div', { class: 'fotos' }, est.fotos.map((f) => {
          const url = URL.createObjectURL(f.blob);
          return h('div', { class: 'foto' },
            h('img', { src: url, alt: `Foto ${formatoHora(f.hora)}` }),
            h('div', { class: 'hora-foto' }, formatoHora(f.hora)),
            h('button', {
              type: 'button', 'aria-label': 'Borrar foto',
              onclick: () => borrar(est.fotos, f, '¿Borrar esta foto?')
            }, '✕'));
        }))
      : h('div', { class: 'vacio' }, 'Sin fotos en este estado.'),
    h('button', {
      class: 'btn ancho', type: 'button',
      onclick: async () => {
        const blob = await tomarFoto();
        if (!blob) return;
        est.fotos.push({ id: uid(), hora: ahora(), blob });
        refrescar();
      }
    }, '📷 Tomar foto')
  );

  // ---------- Nuevo estado ----------
  const siguiente = siguienteEstado(estadoId);
  let tarjetaCambio = null;
  if (esActual) {
    tarjetaCambio = h('section', { class: 'tarjeta' },
      siguiente
        ? h('button', {
            class: 'btn primario ancho', type: 'button',
            onclick: async () => {
              const prox = obtenerEstado(siguiente);
              if (!await confirmar('Nuevo estado', `Se cerrará «${def.codigo}» y se abrirá «${prox.codigo} — ${prox.nombre}» con la hora actual del dispositivo.`, 'Cambiar estado')) return;
              const t = ahora();
              est.finalizadoEn = t;
              caso.estados[siguiente].iniciadoEn = t;
              caso.estadoActual = siguiente;
              persistir();
              acciones.irAEstado(siguiente);
            }
          }, `Nuevo estado → ${obtenerEstado(siguiente).codigo}`)
        : h('button', { class: 'btn primario ancho', type: 'button', onclick: acciones.irAReporte }, 'Ir al reporte y firmas')
    );
  }

  reemplazar(contenedor, cabecera, tarjetaSignos, tarjetaMeds, tarjetaHistoria, tarjetaFotos, tarjetaCambio);

  // =====================================================================
  //  Formularios (se abren en una hoja inferior)
  // =====================================================================

  /** Bloque de hora de solo lectura. */
  function bloqueHora(registro) {
    return h('div', { class: 'campo' },
      h('label', {}, 'Hora (del dispositivo, no editable)'),
      h('input', { readOnly: true, value: registro ? formatoHora(registro.hora) : 'Se registra al guardar' }));
  }

  /** Agregar o editar una toma de signos. */
  function formSignos(registro) {
    const valores = registro ? { ...registro } : signosVacios();
    abrirModal({
      titulo: registro ? 'Editar signos vitales' : 'Agregar nuevos signos',
      contenido: h('div', {}, bloqueHora(registro), crearCamposSignos(valores, edad)),
      botones: [
        { texto: 'Cancelar' },
        {
          texto: 'Guardar', clase: 'primario',
          accion: async () => {
            if (!tieneSignos(valores)) { await avisar('Sin datos', 'Escriba al menos un signo vital.'); return false; }
            if (taInvalida(valores.ta_s, valores.ta_d)) { await avisar('Tensión arterial', 'La diastólica debe ser menor que la sistólica.'); return false; }
            if (registro) Object.assign(registro, valores);          // la hora NO se toca
            else est.signos.push({ id: uid(), hora: ahora(), ...valores });
            refrescar();
          }
        }
      ]
    });
  }

  /** Agregar o editar un medicamento (Bolo o Infusión). */
  function formMedicamento(registro) {
    const v = registro ? { ...registro } : { tipo: 'bolo', medicamento: '', dosis: '', velocidad: '' };
    const filaVelocidad = campoTexto({ etiqueta: 'Velocidad de infusión', obj: v, clave: 'velocidad', placeholder: 'Ej. 2 cc/h' });
    const mostrarVelocidad = () => filaVelocidad.classList.toggle('oculto', v.tipo !== 'infusion');

    // Medicamentos ya administrados a ESTE paciente: se pueden tocar para elegirlos.
    const previos = medicamentosDelPaciente(caso);
    const campoMed = campoTexto({ etiqueta: 'Medicamento', obj: v, clave: 'medicamento', placeholder: 'Escriba el medicamento' });
    const inputMed = campoMed.querySelector('input');
    const chips = previos.length
      ? h('div', {},
          h('div', { class: 'texto-suave' }, 'Ya administrados a este paciente:'),
          h('div', { class: 'chips' }, previos.map((n) => h('button', {
            class: 'chip', type: 'button',
            onclick: () => { v.medicamento = n; inputMed.value = n; }
          }, n))))
      : null;

    const contenido = h('div', {},
      bloqueHora(registro),
      campoSelect({
        etiqueta: 'Tipo', obj: v, clave: 'tipo', vacio: null,
        opciones: [{ valor: 'bolo', texto: 'Bolo' }, { valor: 'infusion', texto: 'Infusión' }],
        alCambiar: mostrarVelocidad
      }),
      campoMed, chips,
      campoTexto({ etiqueta: 'Dosis', obj: v, clave: 'dosis', placeholder: 'Ej. 20 mcg' }),
      filaVelocidad
    );
    mostrarVelocidad();

    abrirModal({
      titulo: registro ? 'Editar medicamento' : 'Registrar medicamento',
      contenido,
      botones: [
        { texto: 'Cancelar' },
        {
          texto: 'Guardar', clase: 'primario',
          accion: async () => {
            if (!String(v.medicamento).trim()) { await avisar('Falta el medicamento', 'Escriba el nombre del medicamento.'); return false; }
            const datos = {
              tipo: v.tipo, medicamento: String(v.medicamento).trim(), dosis: v.dosis,
              velocidad: v.tipo === 'infusion' ? v.velocidad : ''
            };
            if (registro) Object.assign(registro, datos);
            else est.medicamentos.push({ id: uid(), hora: ahora(), ...datos });
            refrescar();
          }
        }
      ]
    });
  }

  /** Cambio de una bomba existente: crea un registro NUEVO sin borrar el anterior. */
  async function formCambioBomba() {
    const activas = infusionesActivas(caso);
    if (!activas.length) {
      await avisar('Sin bombas registradas', 'No hay infusiones registradas todavía. Use «Registrar» y elija Infusión para agregar una.');
      return;
    }
    const v = { medicamento: activas[0].medicamento, dosis: activas[0].dosis, velocidad: activas[0].velocidad };
    const contenedorCampos = h('div');
    const dibujarCampos = () => contenedorCampos.replaceChildren(
      campoTexto({ etiqueta: 'Nueva dosis', obj: v, clave: 'dosis' }),
      campoTexto({ etiqueta: 'Nueva velocidad de infusión', obj: v, clave: 'velocidad' })
    );
    dibujarCampos();

    abrirModal({
      titulo: 'Cambiar bomba',
      contenido: h('div', {},
        h('p', { class: 'texto-suave' }, 'Elija la bomba. Se crea un registro nuevo con la hora actual; el anterior se conserva.'),
        campoSelect({
          etiqueta: 'Bomba / infusión', obj: v, clave: 'medicamento', vacio: null,
          opciones: activas.map((a) => a.medicamento),
          alCambiar: (nombre) => {
            const a = activas.find((x) => x.medicamento === nombre);
            v.dosis = a.dosis; v.velocidad = a.velocidad;
            dibujarCampos();
          }
        }),
        contenedorCampos),
      botones: [
        { texto: 'Cancelar' },
        {
          texto: 'Guardar cambio', clase: 'primario',
          accion: () => {
            est.medicamentos.push({
              id: uid(), hora: ahora(), tipo: 'infusion', cambioBomba: true,
              medicamento: v.medicamento, dosis: v.dosis, velocidad: v.velocidad
            });
            refrescar();
          }
        }
      ]
    });
  }

  /** Cambio de parámetros del ventilador (registro nuevo, el anterior se conserva). */
  function formVentilador(registro) {
    const base = registro ? { ...registro } : { ...ventiladorActual(caso) };
    const v = {
      modo: base.modo || '', peep: base.peep || '', volumen: base.volumen || '',
      fr: base.fr || '', ie: base.ie || '', fio2: base.fio2 || '', tot: base.tot || ''
    };
    abrirModal({
      titulo: registro ? 'Editar cambio del ventilador' : 'Cambios en ventilador',
      contenido: h('div', {},
        bloqueHora(registro),
        h('p', { class: 'texto-suave' }, 'Parte de los últimos parámetros. Modifique lo que cambió.'),
        h('div', { class: 'rejilla' },
          campoSelect({ etiqueta: 'Modo ventilatorio', obj: v, clave: 'modo', opciones: MODO_VENTILATORIO }),
          campoTexto({ etiqueta: 'TOT fijado (cm)', obj: v, clave: 'tot', modo: 'decimal' }),
          campoTexto({ etiqueta: 'PEEP', obj: v, clave: 'peep', modo: 'decimal' }),
          campoTexto({ etiqueta: 'Volumen', obj: v, clave: 'volumen', modo: 'decimal' }),
          campoTexto({ etiqueta: 'F.R', obj: v, clave: 'fr', modo: 'decimal' }),
          campoSelect({ etiqueta: 'I:E', obj: v, clave: 'ie', opciones: RELACION_IE }),
          campoTexto({ etiqueta: 'FiO2', obj: v, clave: 'fio2', modo: 'decimal' }))),
      botones: [
        { texto: 'Cancelar' },
        {
          texto: 'Guardar', clase: 'primario',
          accion: () => {
            if (registro) Object.assign(registro, v);
            else est.ventilador.push({ id: uid(), hora: ahora(), ...v });
            refrescar();
          }
        }
      ]
    });
  }

  /** Borra un elemento de un arreglo después de confirmar. */
  async function borrar(arreglo, elemento, pregunta) {
    if (!await confirmar('Borrar', pregunta, 'Borrar', true)) return;
    const i = arreglo.indexOf(elemento);
    if (i >= 0) arreglo.splice(i, 1);
    refrescar();
  }
}

/** Tarjeta de una entrada con hora fija y botones Editar / Borrar. */
function entrada({ hora, etiqueta, detalle, extra, alEditar, alBorrar }) {
  return h('div', { class: 'entrada' },
    h('div', { class: 'cabecera' },
      h('span', { class: 'hora' }, formatoHora(hora)),
      etiqueta ? h('span', { class: 'etiqueta' }, etiqueta) : null),
    h('div', { class: 'detalle' }, detalle),
    extra,
    h('div', { class: 'acciones' },
      h('button', { class: 'btn chico', type: 'button', onclick: alEditar }, 'Editar'),
      h('button', { class: 'btn chico peligro', type: 'button', onclick: alBorrar }, 'Borrar'))
  );
}
