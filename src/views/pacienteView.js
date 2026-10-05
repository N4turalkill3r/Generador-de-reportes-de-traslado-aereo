/**
 * pacienteView.js — Pestaña "Paciente": datos del paciente, tripulación y
 * HALLAZGO INICIAL (signos, ventilación, vías venosas, bolos e infusiones
 * encontrados al llegar). Estos datos aparecen al inicio del reporte final.
 */
import { h, reemplazar } from '../utils/dom.js';
import { campoTexto, campoSelect } from '../components/camposComunes.js';
import { crearCamposSignos } from '../components/camposSignos.js';
import { formatoFechaLarga } from '../utils/formatoHora.js';
import { persistir } from '../services/store.js';
import { uid } from '../models/caso.js';
import {
  CONDICION, ASISTENCIA, TIPO_ASISTENCIA_VENTILATORIA, MODO_VENTILATORIO,
  RELACION_IE, SOLUCIONES, SI_NO, UNIDADES_EDAD
} from '../config/catalogos.js';

export function renderPaciente(caso, contenedor) {
  const p = caso.paciente;
  const hl = caso.hallazgo;

  // ---- Signos del hallazgo (se necesita para refrescar la PAM al cambiar la edad) ----
  const camposSignos = crearCamposSignos(hl.signos, () => p.edad);

  const tarjetaPaciente = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Datos del paciente'),
    h('div', { class: 'campo' }, h('label', {}, 'Fecha (del dispositivo)'),
      h('input', { value: formatoFechaLarga(p.fecha), readOnly: true })),
    campoTexto({ etiqueta: 'BOSEM/US', obj: p, clave: 'bosem' }),
    campoTexto({ etiqueta: 'Nombre del paciente', obj: p, clave: 'nombre' }),
    h('div', { class: 'fila-edad' },
      campoTexto({ etiqueta: 'Edad', obj: p.edad, clave: 'valor', modo: 'decimal', placeholder: '4', alCambiar: () => camposSignos.actualizarPAM() }),
      campoSelect({ etiqueta: 'Unidad', obj: p.edad, clave: 'unidad', opciones: UNIDADES_EDAD, vacio: null, alCambiar: () => camposSignos.actualizarPAM() })
    ),
    campoTexto({ etiqueta: 'Diagnóstico', obj: p, clave: 'diagnostico' }),
    campoTexto({ etiqueta: 'Número de ticket', obj: p, clave: 'ticket', placeholder: 'Ej. 20092026TR0013' }),
    campoTexto({ etiqueta: 'Peso del paciente', obj: p, clave: 'peso', placeholder: 'Ej. 16 kg peso por edad' }),
    campoTexto({ etiqueta: 'Nombre y cargo de la persona a quien se reporta', obj: p, clave: 'reportaA' })
  );

  const t = caso.tripulacion;
  const tarjetaTripulacion = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Tripulación'),
    h('p', { class: 'texto-suave' }, 'Los campos que dejes vacíos no aparecerán en el reporte.'),
    campoTexto({ etiqueta: 'Capitán', obj: t, clave: 'capitan' }),
    campoTexto({ etiqueta: 'Médico', obj: t, clave: 'medico' }),
    campoTexto({ etiqueta: 'Médico especialista', obj: t, clave: 'medicoEspecialista' }),
    campoTexto({ etiqueta: 'T.E.M', obj: t, clave: 'tem' }),
    campoTexto({ etiqueta: 'A.E.M', obj: t, clave: 'aem' })
  );

  const tarjetaSignos = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Hallazgo inicial · Signos vitales'),
    camposSignos,
    h('div', { class: 'rejilla', style: 'margin-top:8px' },
      campoSelect({ etiqueta: 'Condición', obj: hl, clave: 'condicion', opciones: CONDICION }),
      campoSelect({ etiqueta: 'Asistencia', obj: hl, clave: 'asistencia', opciones: ASISTENCIA })
    )
  );

  const v = hl.ventilacion;
  const tarjetaVentilacion = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Hallazgo inicial · Asistencia ventilatoria'),
    campoSelect({ etiqueta: 'Asistencia ventilatoria', obj: hl, clave: 'ventilacionTipo', opciones: TIPO_ASISTENCIA_VENTILATORIA }),
    h('div', { class: 'rejilla' },
      campoSelect({ etiqueta: 'Modo ventilatorio', obj: v, clave: 'modo', opciones: MODO_VENTILATORIO }),
      campoTexto({ etiqueta: 'TOT fijado (cm)', obj: v, clave: 'tot', modo: 'decimal' }),
      campoTexto({ etiqueta: 'PEEP', obj: v, clave: 'peep', modo: 'decimal' }),
      campoTexto({ etiqueta: 'Volumen', obj: v, clave: 'volumen', modo: 'decimal' }),
      campoTexto({ etiqueta: 'F.R', obj: v, clave: 'fr', modo: 'decimal' }),
      campoSelect({ etiqueta: 'I:E', obj: v, clave: 'ie', opciones: RELACION_IE }),
      campoTexto({ etiqueta: 'FiO2', obj: v, clave: 'fio2', modo: 'decimal' }),
      campoTexto({ etiqueta: '# TOT', obj: hl, clave: 'numTot', modo: 'decimal' }),
      campoTexto({ etiqueta: 'Dispositivo', obj: hl, clave: 'dispositivo', clase: 'ancho' })
    )
  );

  const tarjetaVias = h('section', { class: 'tarjeta' },
    h('h2', {}, 'Control de hemorragias y vías venosas'),
    h('div', { class: 'rejilla' },
      campoTexto({ etiqueta: 'Accesos venosos periféricos', obj: hl, clave: 'perifericos', lista: ['0', '1', '2', '3'] }),
      campoTexto({ etiqueta: 'Accesos venosos centrales', obj: hl, clave: 'centrales', lista: SI_NO }),
      campoTexto({ etiqueta: 'Bombas infusoras', obj: hl, clave: 'bombasInfusoras', modo: 'numeric' }),
      campoTexto({ etiqueta: 'Bombas perfusoras', obj: hl, clave: 'bombasPerfusoras', modo: 'numeric' })
    )
  );

  const tarjetaBolos = listaFilas({
    titulo: 'Hallazgo inicial · Bolos / soluciones',
    ayuda: 'Primeras dosis encontradas. Sin límite de filas.',
    arreglo: hl.bolos,
    campos: [
      { clave: 'medicamento', etiqueta: 'Solución / medicamento', lista: SOLUCIONES },
      { clave: 'dosis', etiqueta: 'Dosis / goteo / velocidad' }
    ],
    nueva: () => ({ id: uid(), medicamento: '', dosis: '' }),
    textoBoton: '＋ Agregar bolo / solución'
  });

  const tarjetaInfusiones = listaFilas({
    titulo: 'Hallazgo inicial · Infusión de medicamentos',
    ayuda: 'Infusiones encontradas al llegar. Sin límite de filas.',
    arreglo: hl.infusiones,
    campos: [
      { clave: 'medicamento', etiqueta: 'Medicación', lista: SOLUCIONES },
      { clave: 'dosis', etiqueta: 'Dosis' },
      { clave: 'velocidad', etiqueta: 'Vel. infusión' }
    ],
    nueva: () => ({ id: uid(), medicamento: '', dosis: '', velocidad: '' }),
    textoBoton: '＋ Agregar infusión'
  });

  contenedor.replaceChildren(
    tarjetaPaciente, tarjetaTripulacion, tarjetaSignos, tarjetaVentilacion,
    tarjetaVias, tarjetaBolos, tarjetaInfusiones
  );
}

/**
 * Tarjeta con una lista editable de filas (agregar / borrar sin límite).
 * Cada fila usa campos de texto ligados al objeto de la fila.
 */
function listaFilas({ titulo, ayuda, arreglo, campos, nueva, textoBoton }) {
  const tarjeta = h('section', { class: 'tarjeta' });

  function dibujar() {
    reemplazar(tarjeta,
      h('h2', {}, titulo),
      h('p', { class: 'texto-suave' }, ayuda),
      arreglo.map((fila, i) => h('div', { class: 'entrada' },
        h('div', { class: 'cabecera' }, h('span', { class: 'hora' }, `${i + 1})`)),
        campos.map((c) => campoTexto({ etiqueta: c.etiqueta, obj: fila, clave: c.clave, lista: c.lista || null })),
        h('div', { class: 'acciones' },
          h('button', {
            class: 'btn chico peligro', type: 'button',
            onclick: () => { arreglo.splice(i, 1); persistir(); dibujar(); }
          }, 'Borrar'))
      )),
      h('button', {
        class: 'btn ancho', type: 'button',
        onclick: () => { arreglo.push(nueva()); persistir(); dibujar(); }
      }, textoBoton)
    );
  }
  dibujar();
  return tarjeta;
}
