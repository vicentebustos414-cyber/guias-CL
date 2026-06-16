import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Guia, Empresa } from '../../shared/types';
import { formatCLP, formatFecha } from './format';

export interface ReceptorFactura {
  nombre: string;
  rut: string;
  direccion?: string;
  giro?: string;
  comuna?: string;
}

export async function generateFactura(
  guias: Guia[],
  emisor: Empresa,
  receptor: ReceptorFactura,
  numeroFactura: string,
  fecha?: string,
): Promise<Uint8Array> {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const mL   = 15;
  const mR   = 15;
  const col  = W - mL - mR;

  const AZUL   = [26, 86, 219]   as [number, number, number];
  const ROJO   = [185, 28, 28]   as [number, number, number];
  const GRIS   = [71, 85, 105]   as [number, number, number];
  const NEGRO  = [15, 23, 42]    as [number, number, number];
  const AZUL_L = [239, 246, 255] as [number, number, number];

  const fechaDoc = fecha ?? new Date().toISOString().split('T')[0];
  const neto     = guias.reduce((s, g) => s + g.monto_total, 0);
  const iva      = Math.round(neto * 0.19);
  const total    = neto + iva;

  // ── Cabecera empresa emisora (izquierda) ─────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NEGRO);
  doc.text(emisor.nombre || 'Empresa Emisora', mL, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  const eLns: string[] = [];
  if (emisor.rut)       eLns.push(`RUT: ${emisor.rut}`);
  if (emisor.giro)      eLns.push(`Giro: ${emisor.giro}`);
  if (emisor.direccion) eLns.push(emisor.direccion);
  if (emisor.telefono)  eLns.push(`Tel: ${emisor.telefono}`);
  eLns.forEach((l, i) => doc.text(l, mL, 22 + i * 5));

  // ── Caja FACTURA (derecha — formato SII Chile) ───────────────────────────────
  const boxW = 58;
  const boxX = W - mR - boxW;

  // Borde exterior
  doc.setDrawColor(...ROJO);
  doc.setLineWidth(1.2);
  doc.rect(boxX, 6, boxW, 36);

  // Franja roja superior
  doc.setFillColor(...ROJO);
  doc.rect(boxX, 6, boxW, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', boxX + boxW / 2, 14.5, { align: 'center' });

  // N° de factura
  doc.setTextColor(...ROJO);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('N°', boxX + boxW / 2, 24, { align: 'center' });
  doc.setFontSize(20);
  doc.text(numeroFactura, boxX + boxW / 2, 36, { align: 'center' });

  // ── Línea divisoria ──────────────────────────────────────────────────────────
  let y = 48;
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.4);
  doc.line(mL, y, W - mR, y);
  y += 6;

  // ── Datos de emisión ─────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRIS);
  doc.text('FECHA EMISIÓN:', mL, y + 4);
  doc.text('CONDICIÓN DE PAGO:', mL + 75, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...NEGRO);
  doc.text(formatFecha(fechaDoc), mL + 30, y + 4);
  doc.text('Contado', mL + 75 + 34, y + 4);
  y += 12;

  // ── Recuadro receptor ────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL_L);
  doc.rect(mL, y, col, 30, 'F');
  doc.setDrawColor(180, 200, 230);
  doc.setLineWidth(0.3);
  doc.rect(mL, y, col, 30);

  const labelX  = mL + 2;
  const valueX  = mL + 22;
  const label2X = mL + col / 2 + 2;
  const value2X = mL + col / 2 + 24;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRIS);
  doc.text('SEÑOR(ES):', labelX, y + 7);
  doc.text('RUT:',       labelX, y + 14);
  doc.text('GIRO:',      labelX, y + 21);
  doc.text('DIRECCIÓN:', label2X, y + 7);
  doc.text('COMUNA:',    label2X, y + 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NEGRO);
  doc.text(receptor.nombre || '—', valueX, y + 7);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(receptor.rut || '—', valueX, y + 14);
  doc.text(receptor.giro || 'Importación / Exportación', valueX, y + 21);
  doc.text(receptor.direccion || '—', value2X, y + 7);
  doc.text(receptor.comuna || '—', value2X, y + 14);
  y += 36;

  // ── Tabla de guías con detalle de servicios internos ────────────────────────
  // Cada guía se desglosa: flete base + cada cargo_extra como sub-ítem
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = [];

  for (const g of guias) {
    // Fila principal: flete base
    rows.push([
      { content: g.numero_guia, styles: { fontStyle: 'bold' } },
      `Servicio de Flete · ${g.origen || '—'} → ${g.destino || '—'}`,
      g.nombre_chofer || '—',
      formatFecha(g.fecha),
      { content: formatCLP(g.monto_base || g.monto_total), styles: { halign: 'right' } },
    ]);
    // Sub-filas: servicios internos / cargos extra
    for (const c of (g.cargos_extra || [])) {
      if (!c.monto) continue;
      rows.push([
        { content: '', styles: { fillColor: [248, 250, 252] } },
        { content: `  ↳ ${c.descripcion || 'Cargo Adicional'}`, styles: { fillColor: [248, 250, 252] } },
        { content: '—', styles: { fillColor: [248, 250, 252] } },
        { content: '—', styles: { fillColor: [248, 250, 252] } },
        { content: formatCLP(c.monto), styles: { halign: 'right', fillColor: [248, 250, 252] } },
      ]);
    }
    // Subtotal por guía si tiene cargos extra
    if ((g.cargos_extra || []).some(c => c.monto > 0)) {
      rows.push([
        { content: '', styles: { fillColor: [239, 246, 255] } },
        { content: 'Subtotal guía', styles: { fontStyle: 'bold', fillColor: [239, 246, 255] } },
        { content: '', styles: { fillColor: [239, 246, 255] } },
        { content: '', styles: { fillColor: [239, 246, 255] } },
        { content: formatCLP(g.monto_total), styles: { halign: 'right', fontStyle: 'bold', fillColor: [239, 246, 255] } },
      ]);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['N° Guía', 'Descripción del Servicio', 'Chofer', 'Fecha', 'Monto Neto']],
    body: rows,
    margin: { left: mL, right: mR },
    headStyles: { fillColor: AZUL, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: NEGRO },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 58 },
      2: { cellWidth: 36 },
      3: { cellWidth: 22 },
      4: { cellWidth: col - 18 - 58 - 36 - 22, halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Totales ──────────────────────────────────────────────────────────────────
  const tX = W - mR - 72;
  const tW = 72;

  // Neto
  doc.setFillColor(248, 250, 252);
  doc.rect(tX, y, tW, 8, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  doc.text('Monto Neto (sin IVA):', tX + 2, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NEGRO);
  doc.text(formatCLP(neto), tX + tW - 2, y + 5.5, { align: 'right' });
  y += 8;

  // IVA
  doc.setFillColor(255, 251, 235);
  doc.rect(tX, y, tW, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  doc.text('IVA (19%):', tX + 2, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(161, 98, 7);
  doc.text(formatCLP(iva), tX + tW - 2, y + 5.5, { align: 'right' });
  y += 8;

  // Total
  doc.setFillColor(...AZUL);
  doc.rect(tX, y, tW, 11, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', tX + 2, y + 7.5);
  doc.text(formatCLP(total), tX + tW - 2, y + 7.5, { align: 'right' });
  y += 18;

  // ── Nota ──────────────────────────────────────────────────────────────────────
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...GRIS);
  doc.text(
    `Incluye ${guias.length} guía${guias.length > 1 ? 's' : ''} de flete. Valores en pesos chilenos (CLP). IVA 19% incluido.`,
    mL, y,
  );

  // ── Líneas de firma ──────────────────────────────────────────────────────────
  const signY = Math.max(y + 12, H - 40);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);

  const fw  = 55;
  const fcs = [mL + fw / 2, W / 2, W - mR - fw / 2];
  const fls = ['Firma Emisor', 'V°B° Receptor', 'Timbre Empresa'];
  fcs.forEach((cx, i) => {
    doc.line(cx - fw / 2, signY + 16, cx + fw / 2, signY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(fls[i], cx, signY + 20, { align: 'center' });
  });

  // ── Pie de página ─────────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL);
  doc.rect(0, H - 9, W, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `Factura N° ${numeroFactura} · ${emisor.nombre || ''} · RUT ${emisor.rut || ''} · Generado por Sistema Guías Flete Chile`,
    W / 2, H - 3.5,
    { align: 'center' },
  );

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

// ── Nota de Crédito ──────────────────────────────────────────────────────────
export async function generateNotaCredito(
  guias: Guia[],
  emisor: Empresa,
  receptor: ReceptorFactura,
  numeroNota: string,
  facturaRef: string,
  motivo: string,
  fecha?: string,
): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();
  const mL  = 15;
  const mR  = 15;
  const col = W - mL - mR;

  const VERDE  = [4, 120, 87]    as [number, number, number];
  const VERDE2 = [6, 95, 70]     as [number, number, number];
  const GRIS   = [71, 85, 105]   as [number, number, number];
  const NEGRO  = [15, 23, 42]    as [number, number, number];
  const VERDE_L= [236, 253, 245] as [number, number, number];

  const fechaDoc = fecha ?? new Date().toISOString().split('T')[0];
  const neto     = guias.reduce((s, g) => s + g.monto_total, 0);
  const iva      = Math.round(neto * 0.19);
  const total    = neto + iva;

  // Cabecera emisor
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NEGRO);
  doc.text(emisor.nombre || 'Empresa Emisora', mL, 16);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
  const eLns: string[] = [];
  if (emisor.rut)       eLns.push(`RUT: ${emisor.rut}`);
  if (emisor.giro)      eLns.push(`Giro: ${emisor.giro}`);
  if (emisor.direccion) eLns.push(emisor.direccion);
  if (emisor.telefono)  eLns.push(`Tel: ${emisor.telefono}`);
  eLns.forEach((l, i) => doc.text(l, mL, 22 + i * 5));

  // Caja NOTA DE CRÉDITO (verde, derecha)
  const boxW = 58;
  const boxX = W - mR - boxW;
  doc.setDrawColor(...VERDE2); doc.setLineWidth(1.2);
  doc.rect(boxX, 6, boxW, 36);
  doc.setFillColor(...VERDE); doc.rect(boxX, 6, boxW, 12, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE CRÉDITO', boxX + boxW / 2, 14.5, { align: 'center' });
  doc.setTextColor(...VERDE2); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('N°', boxX + boxW / 2, 24, { align: 'center' });
  doc.setFontSize(20); doc.text(numeroNota, boxX + boxW / 2, 36, { align: 'center' });

  // Línea
  let y = 48;
  doc.setDrawColor(...VERDE); doc.setLineWidth(0.4);
  doc.line(mL, y, W - mR, y);
  y += 6;

  // Datos emisión + referencia
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRIS);
  doc.text('FECHA EMISIÓN:', mL, y + 4);
  doc.text('ANULA / MODIFICA FACTURA N°:', mL + 75, y + 4);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...NEGRO);
  doc.text(formatFecha(fechaDoc), mL + 30, y + 4);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...VERDE2);
  doc.text(facturaRef, mL + 75 + 56, y + 4);
  y += 12;

  // Motivo
  doc.setFillColor(...VERDE_L);
  doc.rect(mL, y, col, 10, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRIS);
  doc.text('MOTIVO:', mL + 2, y + 4);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...NEGRO);
  doc.text(motivo || '—', mL + 18, y + 4);
  y += 14;

  // Recuadro receptor
  doc.setFillColor(...VERDE_L);
  doc.rect(mL, y, col, 30, 'F');
  doc.setDrawColor(167, 213, 195); doc.setLineWidth(0.3);
  doc.rect(mL, y, col, 30);
  const lX = mL + 2; const vX = mL + 22;
  const l2X = mL + col / 2 + 2; const v2X = mL + col / 2 + 24;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRIS);
  doc.text('SEÑOR(ES):', lX, y + 7);  doc.text('RUT:', lX, y + 14); doc.text('GIRO:', lX, y + 21);
  doc.text('DIRECCIÓN:', l2X, y + 7); doc.text('COMUNA:', l2X, y + 14);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NEGRO);
  doc.text(receptor.nombre || '—', vX, y + 7);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  doc.text(receptor.rut || '—', vX, y + 14);
  doc.text(receptor.giro || 'Importación / Exportación', vX, y + 21);
  doc.text(receptor.direccion || '—', v2X, y + 7);
  doc.text(receptor.comuna || '—', v2X, y + 14);
  y += 36;

  // Tabla servicios acreditados (con desglose de cargos internos)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = [];
  for (const g of guias) {
    rows.push([
      { content: g.numero_guia, styles: { fontStyle: 'bold' } },
      `Flete · ${g.origen || '—'} → ${g.destino || '—'}`,
      formatFecha(g.fecha),
      { content: formatCLP(g.monto_base || g.monto_total), styles: { halign: 'right' } },
    ]);
    for (const c of (g.cargos_extra || [])) {
      if (!c.monto) continue;
      rows.push([
        { content: '', styles: { fillColor: [248, 252, 250] } },
        { content: `  ↳ ${c.descripcion || 'Cargo Adicional'}`, styles: { fillColor: [248, 252, 250] } },
        { content: '—', styles: { fillColor: [248, 252, 250] } },
        { content: formatCLP(c.monto), styles: { halign: 'right', fillColor: [248, 252, 250] } },
      ]);
    }
    if ((g.cargos_extra || []).some(c => c.monto > 0)) {
      rows.push([
        { content: '', styles: { fillColor: VERDE_L } },
        { content: 'Subtotal guía', styles: { fontStyle: 'bold', fillColor: VERDE_L } },
        { content: '', styles: { fillColor: VERDE_L } },
        { content: formatCLP(g.monto_total), styles: { halign: 'right', fontStyle: 'bold', fillColor: VERDE_L } },
      ]);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['N° Guía', 'Servicio Acreditado', 'Fecha', 'Monto Neto']],
    body: rows,
    margin: { left: mL, right: mR },
    headStyles: { fillColor: VERDE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: NEGRO },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: col - 20 - 28 - 30 },
      2: { cellWidth: 28 },
      3: { cellWidth: 30, halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Totales (en verde — representan montos acreditados/devueltos)
  const tX = W - mR - 72; const tW = 72;
  doc.setFillColor(248, 252, 250); doc.rect(tX, y, tW, 8, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
  doc.text('Neto acreditado:', tX + 2, y + 5.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...NEGRO);
  doc.text(formatCLP(neto), tX + tW - 2, y + 5.5, { align: 'right' });
  y += 8;

  doc.setFillColor(240, 253, 244); doc.rect(tX, y, tW, 8, 'F');
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
  doc.text('IVA (19%):', tX + 2, y + 5.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(4, 120, 87);
  doc.text(formatCLP(iva), tX + tW - 2, y + 5.5, { align: 'right' });
  y += 8;

  doc.setFillColor(...VERDE); doc.rect(tX, y, tW, 11, 'F');
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL CRÉDITO:', tX + 2, y + 7.5);
  doc.text(formatCLP(total), tX + tW - 2, y + 7.5, { align: 'right' });
  y += 18;

  doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRIS);
  doc.text(
    `Nota de Crédito que anula/modifica Factura N° ${facturaRef}. Valores en pesos chilenos (CLP). IVA 19%.`,
    mL, y,
  );

  // Firmas
  const signY = Math.max(y + 12, H - 40);
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  const fw = 55;
  const fcs = [mL + fw / 2, W / 2, W - mR - fw / 2];
  ['Firma Emisor', 'V°B° Receptor', 'Timbre Empresa'].forEach((lbl, i) => {
    doc.line(fcs[i] - fw / 2, signY + 16, fcs[i] + fw / 2, signY + 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS);
    doc.text(lbl, fcs[i], signY + 20, { align: 'center' });
  });

  // Footer verde
  doc.setFillColor(...VERDE); doc.rect(0, H - 9, W, 9, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text(
    `Nota de Crédito N° ${numeroNota} · Ref. Factura N° ${facturaRef} · ${emisor.nombre || ''} · RUT ${emisor.rut || ''} · Guías Flete Chile`,
    W / 2, H - 3.5, { align: 'center' },
  );

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

export async function generatePDF(guia: Guia, emisor: Empresa, firmaImagen?: string | null): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const marginL = 15;
  const marginR = 15;
  const col = W - marginL - marginR;

  // ── Colores ─────────────────────────────────────────────────────────────────
  const AZUL  = [26, 86, 219]  as [number, number, number];
  const GRIS  = [71, 85, 105]  as [number, number, number];
  const NEGRO = [15, 23, 42]   as [number, number, number];
  const AZUL_CLARO = [239, 246, 255] as [number, number, number];

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, 38, 'F');

  // Título izquierda
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GUÍA DE FLETE', marginL, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(emisor.nombre || 'Empresa Emisora', marginL, 23);
  if (emisor.rut)       doc.text(`RUT: ${emisor.rut}`, marginL, 28);
  if (emisor.direccion) doc.text(emisor.direccion, marginL, 33);

  // N° guía derecha (caja blanca)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(W - marginR - 55, 6, 55, 26, 3, 3, 'F');
  doc.setTextColor(...AZUL);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('N° GUÍA', W - marginR - 28, 14, { align: 'center' });
  doc.setFontSize(15);
  doc.text(guia.numero_guia, W - marginR - 28, 24, { align: 'center' });

  let y = 46;

  // ── Ficha principal ─────────────────────────────────────────────────────────
  const drawSection = (title: string, yStart: number): number => {
    doc.setFillColor(...AZUL);
    doc.rect(marginL, yStart, col, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginL + 2, yStart + 4.2);
    return yStart + 6;
  };

  const drawRow = (label: string, value: string, xL: number, xV: number, yRow: number, half = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(label, xL, yRow);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...NEGRO);
    doc.text(value || '—', xV, yRow);
  };

  // ── Identificación ──────────────────────────────────────────────────────────
  y = drawSection('IDENTIFICACIÓN', y);
  y += 6;

  const half = col / 2;
  drawRow('Fecha:', formatFecha(guia.fecha),       marginL,          marginL + 16,       y);
  drawRow('Estado:', guia.estado.toUpperCase(),    marginL + half,   marginL + half + 16, y);
  y += 8;

  // ── Tramo ──────────────────────────────────────────────────────────────────
  y = drawSection('TRAMO', y);
  y += 6;

  doc.setFillColor(...AZUL_CLARO);
  doc.rect(marginL, y - 3, col, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...AZUL);
  doc.text(guia.origen || '—', marginL + 4, y + 4);
  doc.text('→', W / 2, y + 4, { align: 'center' });
  doc.text(guia.destino || '—', W - marginR - 4, y + 4, { align: 'right' });
  y += 14;

  // ── Empresa del flete ──────────────────────────────────────────────────────
  y = drawSection('EMPRESA DEL FLETE (IMPORTADORA)', y);
  y += 6;

  drawRow('Empresa:', guia.empresa_flete, marginL, marginL + 16, y);
  if (guia.rut_empresa) drawRow('RUT:', guia.rut_empresa, marginL + half, marginL + half + 10, y);
  y += 10;

  // ── Conductor ──────────────────────────────────────────────────────────────
  if (guia.nombre_chofer || guia.rut_chofer || guia.patente) {
    y = drawSection('DATOS DEL CONDUCTOR', y);
    y += 6;
    drawRow('Chofer:', guia.nombre_chofer || '', marginL, marginL + 14, y);
    drawRow('RUT:', guia.rut_chofer || '',       marginL + half * 0.6, marginL + half * 0.6 + 9, y);
    drawRow('Patente:', guia.patente || '',       marginL + half, marginL + half + 15, y);
    y += 10;
  }

  // ── Descripción carga ──────────────────────────────────────────────────────
  if (guia.descripcion_carga) {
    y = drawSection('DESCRIPCIÓN DE LA CARGA', y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...NEGRO);
    const lines = doc.splitTextToSize(guia.descripcion_carga, col - 4);
    doc.text(lines, marginL + 2, y);
    y += lines.length * 5 + 4;
  }

  // ── Tabla de montos ─────────────────────────────────────────────────────────
  y = drawSection('DETALLE DE MONTOS', y);
  y += 2;

  const filas: [string, string][] = [
    ['Monto base del flete', formatCLP(guia.monto_base)],
    ...guia.cargos_extra.map(c => [c.descripcion || 'Cargo extra', formatCLP(c.monto)] as [string, string]),
  ];

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Monto (CLP)']],
    body: filas,
    margin: { left: marginL, right: marginR },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9, textColor: NEGRO },
    columnStyles: {
      0: { cellWidth: col * 0.7 },
      1: { cellWidth: col * 0.3, halign: 'right', fontStyle: 'bold' },
    },
    foot: [[
      { content: 'TOTAL A PAGAR', styles: { fontStyle: 'bold', fontSize: 11, fillColor: AZUL, textColor: [255,255,255] } },
      { content: formatCLP(guia.monto_total), styles: { fontStyle: 'bold', fontSize: 12, halign: 'right', fillColor: AZUL, textColor: [255,255,255] } },
    ]],
    footStyles: { fillColor: AZUL },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Notas ───────────────────────────────────────────────────────────────────
  if (guia.notas) {
    doc.setFillColor(248, 250, 252);
    doc.rect(marginL, y, col, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text('OBSERVACIONES', marginL + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...NEGRO);
    const lines = doc.splitTextToSize(guia.notas, col - 6);
    doc.text(lines, marginL + 2, y + 11);
    y += 20;
  }

  // ── Firmas ───────────────────────────────────────────────────────────────────
  y = Math.max(y, doc.internal.pageSize.getHeight() - 44);
  doc.setDrawColor(200, 200, 200);

  const fw = 55;
  const fc = [marginL + fw / 2, W / 2, W - marginR - fw / 2];
  const labels = ['Firma Emisor', 'Firma Receptor', 'Firma Conductor'];

  // Incrustar firma del emisor si existe
  if (firmaImagen) {
    try {
      doc.addImage(firmaImagen, 'PNG', fc[0] - fw / 2, y, fw, 18, undefined, 'FAST');
    } catch { /* imagen inválida, continuar sin firma */ }
  }

  fc.forEach((cx, i) => {
    doc.line(cx - fw / 2, y + 18, cx + fw / 2, y + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(labels[i], cx, y + 22, { align: 'center' });
  });

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL);
  doc.rect(0, doc.internal.pageSize.getHeight() - 8, W, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Guía N° ${guia.numero_guia} · ${formatFecha(guia.fecha)} · Generado por Sistema Guías Flete Chile`, W / 2, doc.internal.pageSize.getHeight() - 3, { align: 'center' });

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}
