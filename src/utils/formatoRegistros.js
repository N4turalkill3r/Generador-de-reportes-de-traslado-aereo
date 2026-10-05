/**
 * formatoRegistros.js — Textos de una línea para registros de medicamentos y ventilador.
 * Se usan tanto en pantalla (estadoView) como en el PDF (services/pdf.js).
 */

/** "Fentanilo · 20 mcg" o "Noradrenalina · 0.1 mcg/kg/min · vel. 2 cc/h". */
export function textoMedicamento(m) {
  const partes = [m.medicamento];
  if (String(m.dosis ?? '').trim()) partes.push(m.dosis);
  if (m.tipo === 'infusion' && String(m.velocidad ?? '').trim()) partes.push(`vel. ${m.velocidad}`);
  return partes.join(' · ');
}

/** "Modo VC/V · PEEP 5 · Vol. 120 · FR 30 · I:E 1:2 · FiO2 60 · TOT 15 cm". */
export function textoVentilador(v) {
  const t = (x) => String(x ?? '').trim();
  const partes = [];
  if (t(v.modo)) partes.push(`Modo ${v.modo}`);
  if (t(v.peep)) partes.push(`PEEP ${v.peep}`);
  if (t(v.volumen)) partes.push(`Vol. ${v.volumen}`);
  if (t(v.fr)) partes.push(`FR ${v.fr}`);
  if (t(v.ie)) partes.push(`I:E ${v.ie}`);
  if (t(v.fio2)) partes.push(`FiO2 ${v.fio2}`);
  if (t(v.tot)) partes.push(`TOT ${/^\d+([.,]\d+)?$/.test(t(v.tot)) ? t(v.tot) + ' cm' : v.tot}`);
  return partes.join(' · ') || '(sin datos)';
}

