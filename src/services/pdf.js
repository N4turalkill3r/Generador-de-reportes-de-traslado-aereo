/**
 * pdf.js — Genera el reporte final en PDF (tamaño carta) con jsPDF.
 *
 * Reglas del reporte:
 *  - Membrete en CADA página: logo 132 SEM · título · logo Ministerio de Salud.
 *  - Ningún campo vacío se imprime.
 *  - Página 1: paciente, tripulación y hallazgo inicial.
 *  - Luego un bloque por cada estado iniciado (hora en 24 h): signos con PAM,
 *    cambios de ventilador y medicamentos (o la leyenda en rojo desde Echo Alfa),
 *    historia, nota en negrita y fotos.
 *  - Al final: responsables con firma, nombre, profesión y JVPM/JVPE.
 */
import { LOGO_IZQUIERDO, LOGO_DERECHO, TITULO_REPORTE, COLORES } from '../config/constantes.js';
import { ESTADOS } from '../config/estados.js';
import { formatoHora, formatoFechaLarga } from '../utils/formatoHora.js';
import { signosFormateados } from '../utils/formatoSignos.js';
import { textoEdad } from '../utils/edadPediatrica.js';
import { describirPAM } from '../components/insigniaPAM.js';
import { textoMedicamento, textoVentilador } from '../utils/formatoRegistros.js';

// ----- Medidas de la página (en puntos; carta = 612 x 792) -----
const PAG_W = 612, PAG_H = 792;
const M = 36;                  // margen lateral
const ANCHO = PAG_W - 2 * M;   // ancho útil: 540
const ALTO_MEMBRETE = 78;      // espacio reservado arriba en cada página
const MARGEN_INFERIOR = 40;
const LINEA = 11.5;            // alto de cada línea de texto
const TAM = 9;                 // tamaño de letra base
const GRIS = [217, 217, 217];  // fondo de las bandas de sección

const hexARgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const vacio = (v) => v === null || v === undefined || String(v).trim() === '';

// =====================================================================
//  Utilidades de imágenes
// =====================================================================
function blobADataURL(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(blob);
  });
}

async function urlADataURL(ruta) {
  const respuesta = await fetch(ruta);
  return blobADataURL(await respuesta.blob());
}

function dimensiones(dataURL) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = rechazar;
    img.src = dataURL;
  });
}

const formatoImagen = (dataURL) => (dataURL.startsWith('data:image/png') ? 'PNG' : 'JPEG');

// =====================================================================
//  Punto de entrada
// =====================================================================
/** Devuelve un Blob con el PDF del caso. */
export async function generarPDF(caso) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const [izq, der] = await Promise.all([urlADataURL(LOGO_IZQUIERDO), urlADataURL(LOGO_DERECHO)]);
  const logos = {
    izq: { data: izq, ...(await dimensiones(izq)) },
    der: { data: der, ...(await dimensiones(der)) }
  };

  const ctx = { doc, y: ALTO_MEMBRETE, logos };
  membrete(ctx);

  bloquePaciente(ctx, caso);
  bloqueHallazgo(ctx, caso);
  for (const def of ESTADOS) {
    if (caso.estados[def.id].iniciadoEn) await bloqueEstado(ctx, caso, def);
  }
  await bloqueFirmas(ctx, caso);

  numerarPaginas(doc);
  return doc.output('blob');
}

// =====================================================================
//  Membrete y paginación
// =====================================================================
/** Dibuja el membrete (logos y título) en la página actual. */
function membrete({ doc, logos }) {
  const altoIzq = 46;
  doc.addImage(logos.izq.data, formatoImagen(logos.izq.data), M, 14, altoIzq * logos.izq.w / logos.izq.h, altoIzq);
  const altoDer = 36;
  const anchoDer = altoDer * logos.der.w / logos.der.h;
  doc.addImage(logos.der.data, formatoImagen(logos.der.data), M + ANCHO - anchoDer, 19, anchoDer, altoDer);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(TITULO_REPORTE, PAG_W / 2, 42, { align: 'center' });

  doc.setDrawColor(10, 44, 110);
  doc.setLineWidth(1);
  doc.line(M, 68, M + ANCHO, 68);
}

/** Salta a una página nueva (con su membrete). */
function nuevaPagina(ctx) {
  ctx.doc.addPage();
  membrete(ctx);
  ctx.y = ALTO_MEMBRETE;
}

/** Si no cabe `alto` en la página actual, salta de página. */
function asegurarEspacio(ctx, alto) {
  if (ctx.y + alto > PAG_H - MARGEN_INFERIOR) nuevaPagina(ctx);
}

/** "Página 1 de 3" al pie de cada página. */
function numerarPaginas(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`Página ${i} de ${total}`, PAG_W / 2, PAG_H - 20, { align: 'center' });
  }
}

// =====================================================================
//  Motor de filas y celdas
//  Una celda: { label?, texto, bold?, fill?, color?, dot?, align?, w? }
//   - label: etiqueta en negrita a la izquierda; el valor se alinea a su derecha
//   - color: color del texto (hex) · dot: círculo de color antes del texto
//   - w: ancho; las celdas sin w se reparten el espacio restante
// =====================================================================
const PAD = 4;

function medirCelda(doc, celda, ancho) {
  doc.setFontSize(TAM);
  const dotAncho = celda.dot ? 12 : 0;
  let anchoEtiqueta = 0;
  if (celda.label) {
    doc.setFont('helvetica', 'bold');
    anchoEtiqueta = doc.getTextWidth(`${celda.label} `);
  }
  doc.setFont('helvetica', celda.bold ? 'bold' : 'normal');
  const disponible = Math.max(24, ancho - 2 * PAD - anchoEtiqueta - dotAncho);
  celda._lineas = doc.splitTextToSize(String(celda.texto ?? ''), disponible);
  celda._anchoEtiqueta = anchoEtiqueta;
  celda._dotAncho = dotAncho;
  return Math.max(1, celda._lineas.length) * LINEA + 2 * PAD - 2;
}

/** Dibuja una fila de celdas con bordes y devuelve su alto. */
function fila(ctx, celdas) {
  const { doc } = ctx;
  celdas = celdas.filter(Boolean);
  if (!celdas.length) return 0;

  // Reparto de anchos.
  const fijo = celdas.reduce((s, c) => s + (c.w || 0), 0);
  const sinAncho = celdas.filter((c) => !c.w).length;
  const resto = (ANCHO - fijo) / Math.max(1, sinAncho);
  const anchos = celdas.map((c) => c.w || resto);

  const alto = Math.max(...celdas.map((c, i) => medirCelda(doc, c, anchos[i])));
  asegurarEspacio(ctx, alto);

  let x = M;
  celdas.forEach((c, i) => {
    const w = anchos[i];
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    if (c.fill) { doc.setFillColor(...c.fill); doc.rect(x, ctx.y, w, alto, 'FD'); }
    else doc.rect(x, ctx.y, w, alto, 'S');

    const rgb = c.color ? hexARgb(c.color) : [0, 0, 0];
    const baseY = ctx.y + PAD + 7.5;
    let xTexto = x + PAD;

    if (c.dot) {
      doc.setFillColor(...rgb);
      doc.circle(x + PAD + 4, ctx.y + PAD + 5, 3.6, 'F');
      xTexto += c._dotAncho;
    }
    if (c.label) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(TAM);
      doc.setTextColor(0, 0, 0);
      doc.text(c.label, xTexto, baseY);
      xTexto += c._anchoEtiqueta;
    }
    doc.setFont('helvetica', c.bold ? 'bold' : 'normal');
    doc.setFontSize(TAM);
    doc.setTextColor(...rgb);
    const alinear = !c.label && !c.dot ? c.align : undefined;
    const xAlineado = alinear === 'center' ? x + w / 2 : alinear === 'right' ? x + w - PAD : xTexto;
    doc.text(c._lineas, xAlineado, baseY, { align: alinear, lineHeightFactor: LINEA / TAM });
    x += w;
  });

  ctx.y += alto;
  doc.setTextColor(0, 0, 0);
  return alto;
}

/** Banda gris de título de sección (con texto opcional a la derecha, como la hora). */
function banda(ctx, texto, derecha) {
  // Evita dejar una banda sola al final de una página.
  asegurarEspacio(ctx, 44);
  fila(ctx, [
    { texto, bold: true, fill: GRIS, w: derecha ? ANCHO - 60 : undefined },
    derecha ? { texto: derecha, bold: true, fill: GRIS, align: 'right', w: 60 } : null
  ]);
}

/** Reparte una lista de celdas en filas de `porFila`, ocupando todo el ancho. */
function filasEnRejilla(ctx, celdas, porFila) {
  for (let i = 0; i < celdas.length; i += porFila) fila(ctx, celdas.slice(i, i + porFila));
}

/** Celda con etiqueta solo si el valor no está vacío. */
const par = (label, valor, extra = {}) => (vacio(valor) ? null : { label, texto: String(valor).trim(), ...extra });

/** Agrega " cm" si el valor es solo un número. */
const conCm = (v) => (/^\d+([.,]\d+)?$/.test(String(v ?? '').trim()) ? `${String(v).trim()} cm` : v);

/** Celda de la PAM con su color. */
function celdaPAM(signos, edad) {
  const d = describirPAM(signos, edad);
  if (!d) return null;
  const color = d.clasificacion.color || '#5b6577';
  return { texto: d.texto, bold: true, color, dot: true };
}

// =====================================================================
//  Bloques del reporte
// =====================================================================
function bloquePaciente(ctx, caso) {
  const p = caso.paciente;
  const t = caso.tripulacion;

  fila(ctx, [
    par('Fecha:', formatoFechaLarga(p.fecha), { w: vacio(p.bosem) ? undefined : 360 }),
    par('BOSEM/US:', p.bosem)
  ]);
  fila(ctx, [par('Nombre de paciente:', p.nombre)]);
  fila(ctx, [par('Edad:', textoEdad(p.edad))]);
  fila(ctx, [par('Diagnóstico:', p.diagnostico)]);
  fila(ctx, [par('Número de ticket:', p.ticket)]);
  fila(ctx, [par('Peso del paciente:', p.peso)]);

  const tripulacion = [
    par('Capitán:', t.capitan), par('Médico:', t.medico), par('Médico especialista:', t.medicoEspecialista),
    par('T.E.M:', t.tem), par('A.E.M:', t.aem)
  ].filter(Boolean);
  if (tripulacion.length) {
    banda(ctx, 'Nombre de la persona que reporta y cargo:');
    tripulacion.forEach((c) => fila(ctx, [c]));
  }
  fila(ctx, [par('Nombre de la persona a quien reporta y cargo:', p.reportaA)]);
}

function bloqueHallazgo(ctx, caso) {
  const hl = caso.hallazgo;
  const v = hl.ventilacion;

  // --- Signos vitales ---
  const signos = signosFormateados(hl.signos).map((s) => ({ texto: s.texto, bold: false }));
  const pam = celdaPAM(hl.signos, caso.paciente.edad);
  const cond = [par('Condición:', hl.condicion), par('Asistencia:', hl.asistencia)].filter(Boolean);
  if (signos.length || pam || cond.length) {
    banda(ctx, 'Signos vitales presentados');
    filasEnRejilla(ctx, signos, 3);
    if (pam) fila(ctx, [pam]);
    if (cond.length) fila(ctx, cond);
  }

  // --- Asistencia ventilatoria ---
  const vent = [
    par('Asistencia ventilatoria:', hl.ventilacionTipo), par('Modo ventilatorio:', v.modo),
    par('TOT fijado:', conCm(v.tot)), par('PEEP:', v.peep), par('Volumen:', v.volumen),
    par('F.R:', v.fr), par('I:E:', v.ie), par('FiO2:', v.fio2), par('# TOT:', hl.numTot)
  ].filter(Boolean);
  const dispositivo = par('Dispositivo:', hl.dispositivo);
  if (vent.length || dispositivo) {
    banda(ctx, 'Asistencia ventilatoria');
    filasEnRejilla(ctx, vent, 3);
    if (dispositivo) fila(ctx, [dispositivo]);
  }

  // --- Vías venosas y bombas ---
  const vias = [
    par('Accesos venosos periféricos:', hl.perifericos), par('Bombas infusoras:', hl.bombasInfusoras),
    par('Accesos venosos centrales:', hl.centrales), par('Bombas perfusoras:', hl.bombasPerfusoras)
  ].filter(Boolean);
  if (vias.length) {
    banda(ctx, 'Control de hemorragias y vías venosas');
    filasEnRejilla(ctx, vias, 2);
  }

  // --- Bolos / soluciones iniciales ---
  const bolos = hl.bolos.filter((b) => !vacio(b.medicamento) || !vacio(b.dosis));
  if (bolos.length) {
    banda(ctx, 'Bolos / soluciones encontrados');
    bolos.forEach((b, i) => fila(ctx, [
      { texto: `${i + 1})`, bold: true, w: 26 },
      par('Solución:', b.medicamento, { w: vacio(b.dosis) ? undefined : 320 }),
      par('Goteo/Vel.:', b.dosis)
    ]));
  }

  // --- Infusiones iniciales ---
  const inf = hl.infusiones.filter((i) => !vacio(i.medicamento) || !vacio(i.dosis) || !vacio(i.velocidad));
  if (inf.length) {
    banda(ctx, 'Infusión de medicamentos');
    inf.forEach((m, i) => fila(ctx, [
      { texto: `${i + 1})`, bold: true, w: 26 },
      par('Medicación:', m.medicamento, { w: 240 }),
      par('Dosis:', m.dosis, { w: 120 }),
      par('Vel. infusión:', m.velocidad)
    ]));
  }
}

async function bloqueEstado(ctx, caso, def) {
  const est = caso.estados[def.id];
  const edad = caso.paciente.edad;
  const HORA = 44;

  ctx.y += 10;
  banda(ctx, `${def.codigo} — ${def.nombre}`, formatoHora(est.iniciadoEn));

  // --- Signos vitales de cada toma ---
  [...est.signos].sort((a, b) => a.hora - b.hora).forEach((s) => {
    const texto = signosFormateados(s).map((x) => x.texto).join('     ');
    const pam = celdaPAM(s, edad);
    if (!texto && !pam) return;
    fila(ctx, [{ texto: formatoHora(s.hora), bold: true, w: HORA }, { texto: texto || ' ' }]);
    if (pam) fila(ctx, [{ texto: '', w: HORA }, pam]);
  });

  // --- Ventilador ---
  const vent = [...est.ventilador].sort((a, b) => a.hora - b.hora);
  if (vent.length) {
    vent.forEach((v) => fila(ctx, [
      { texto: formatoHora(v.hora), bold: true, w: HORA },
      { label: 'Cambio en ventilador:', texto: textoVentilador(v) }
    ]));
  } else if (def.leyendas) {
    fila(ctx, [{ texto: 'Sin modificaciones de ventilador mecánico', bold: true, color: COLORES.rojo }]);
  }

  // --- Medicamentos y bombas ---
  const meds = [...est.medicamentos].sort((a, b) => a.hora - b.hora);
  if (meds.length) {
    meds.forEach((m) => fila(ctx, [
      { texto: formatoHora(m.hora), bold: true, w: HORA },
      { label: `${m.cambioBomba ? 'Cambio de bomba' : m.tipo === 'infusion' ? 'Infusión' : 'Bolo'}:`, texto: textoMedicamento(m) }
    ]));
  } else if (def.leyendas) {
    fila(ctx, [{ texto: 'Sin modificaciones de medicamentos', bold: true, color: COLORES.rojo }]);
  }

  // --- Historia y nota (la nota va en negrita, al final) ---
  if (!vacio(est.historia)) fila(ctx, [{ texto: est.historia.trim() }]);
  if (!vacio(est.nota)) fila(ctx, [{ texto: `Nota: ${est.nota.trim()}`, bold: true }]);

  // --- Fotos ---
  if (est.fotos.length) await dibujarFotos(ctx, est.fotos);
}

/** Dibuja las fotos del estado en rejilla de 3 columnas con su hora. */
async function dibujarFotos(ctx, fotos) {
  const { doc } = ctx;
  const columnas = 3, hueco = 8;
  const celdaW = (ANCHO - hueco * (columnas - 1)) / columnas;
  const celdaH = 128, leyendaH = 12;

  ctx.y += 6;
  const ordenadas = [...fotos].sort((a, b) => a.hora - b.hora);
  for (let i = 0; i < ordenadas.length; i += columnas) {
    asegurarEspacio(ctx, celdaH + leyendaH + 6);
    const grupo = ordenadas.slice(i, i + columnas);
    for (let j = 0; j < grupo.length; j++) {
      const data = await blobADataURL(grupo[j].blob);
      const dim = await dimensiones(data);
      const escala = Math.min(celdaW / dim.w, celdaH / dim.h);
      const w = dim.w * escala, h = dim.h * escala;
      const x = M + j * (celdaW + hueco);
      doc.addImage(data, formatoImagen(data), x + (celdaW - w) / 2, ctx.y + (celdaH - h) / 2, w, h, undefined, 'FAST');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 90);
      doc.text(`Foto ${formatoHora(grupo[j].hora)}`, x + celdaW / 2, ctx.y + celdaH + 9, { align: 'center' });
    }
    ctx.y += celdaH + leyendaH + 4;
  }
  doc.setTextColor(0, 0, 0);
}

/** Responsables del reporte: firma, nombre, profesión y JVPM / JVPE. */
async function bloqueFirmas(ctx, caso) {
  const { doc } = ctx;
  const firmas = caso.firmas.filter((f) => !vacio(f.nombre));
  if (!firmas.length) return;

  ctx.y += 14;
  asegurarEspacio(ctx, 44 + 120);
  banda(ctx, 'Responsables del reporte');
  ctx.y += 6;

  const hueco = 12, cajaW = (ANCHO - hueco) / 2, cajaH = 112;
  for (let i = 0; i < firmas.length; i += 2) {
    asegurarEspacio(ctx, cajaH + 6);
    for (let j = 0; j < 2 && i + j < firmas.length; j++) {
      const f = firmas[i + j];
      const x = M + j * (cajaW + hueco);

      if (f.imagen) {
        const dim = await dimensiones(f.imagen);
        const escala = Math.min((cajaW - 24) / dim.w, 52 / dim.h);
        const w = dim.w * escala, h = dim.h * escala;
        doc.addImage(f.imagen, 'PNG', x + (cajaW - w) / 2, ctx.y + 56 - h, w, h);
      }
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);
      doc.line(x + 10, ctx.y + 60, x + cajaW - 10, ctx.y + 60);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(doc.splitTextToSize(f.nombre.trim(), cajaW - 20)[0], x + cajaW / 2, ctx.y + 73, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      if (!vacio(f.profesion)) doc.text(doc.splitTextToSize(f.profesion.trim(), cajaW - 20)[0], x + cajaW / 2, ctx.y + 85, { align: 'center' });
      if (f.junta) doc.text(`${f.junta} No. ${vacio(f.numero) ? '________' : f.numero.trim()}`, x + cajaW / 2, ctx.y + 97, { align: 'center' });
    }
    ctx.y += cajaH;
  }
}
