import * as XLSX from 'xlsx';
import type { Guia, Viaje } from '../../shared/types';
import { formatFecha, formatCLP } from './format';
import { saveAndShare } from './mobileFiles';

function writeFileCompat(wb: XLSX.WorkBook, filename: string) {
  if ((window as any).api && !(window as any).Capacitor) {
    XLSX.writeFile(wb, filename);
  } else {
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    saveAndShare(new Uint8Array(buf), filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

export function exportarGuiaExcel(guia: Guia) {
  // ── Encabezados (fila 1) ───────────────────────────────────────────────────
  const cargosTotal = guia.cargos_extra.reduce((s, c) => s + (c.monto || 0), 0);
  const cargosDesc  = guia.cargos_extra.length > 0
    ? guia.cargos_extra.map(c => `${c.descripcion || 'Extra'}: $${c.monto.toLocaleString('es-CL')}`).join(' | ')
    : '';

  const headers = [
    'N° Guía', 'Fecha', 'Estado',
    'Origen', 'Destino',
    'Empresa Flete', 'RUT Empresa',
    'Nombre Chofer', 'RUT Chofer', 'Patente',
    'N° Contenedor / Carga',
    'Valor Vía (CLP)', 'Cargos Extra', 'Descripción Extras', 'TOTAL (CLP)',
    'Notas',
  ];

  const values = [
    guia.numero_guia,
    formatFecha(guia.fecha),
    guia.estado.charAt(0).toUpperCase() + guia.estado.slice(1),
    guia.origen,
    guia.destino,
    guia.empresa_flete  || '',
    guia.rut_empresa    || '',
    guia.nombre_chofer  || '',
    guia.rut_chofer     || '',
    guia.patente        || '',
    guia.descripcion_carga || '',
    guia.monto_base,
    cargosTotal || '',
    cargosDesc,
    guia.monto_total,
    guia.notas || '',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, values]);

  // ── Anchos de columna ──────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 10 },  // N° Guía
    { wch: 12 },  // Fecha
    { wch: 12 },  // Estado
    { wch: 14 },  // Origen
    { wch: 14 },  // Destino
    { wch: 26 },  // Empresa
    { wch: 14 },  // RUT Empresa
    { wch: 22 },  // Chofer
    { wch: 14 },  // RUT Chofer
    { wch: 10 },  // Patente
    { wch: 22 },  // Contenedor
    { wch: 16 },  // Valor Vía
    { wch: 14 },  // Cargos Extra
    { wch: 30 },  // Desc Extras
    { wch: 16 },  // TOTAL
    { wch: 35 },  // Notas
  ];

  // ── Altura de fila ─────────────────────────────────────────────────────────
  ws['!rows'] = [{ hpt: 22 }, { hpt: 20 }];

  // ── Estilo encabezados (fila 1): fondo azul, texto blanco, negrita ─────────
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill:      { fgColor: { rgb: '1A56DB' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        bottom: { style: 'medium', color: { rgb: 'FFFFFF' } },
        right:  { style: 'thin',   color: { rgb: '3B82F6' } },
      },
    };
  }

  // ── Estilo fila de datos (fila 2): fondo celeste claro ─────────────────────
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 1, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    const isMonto = c === 11 || c === 12 || c === 14;
    ws[addr].s = {
      font:      { sz: 11, bold: isMonto },
      fill:      { fgColor: { rgb: 'EFF6FF' } },
      alignment: { vertical: 'center', wrapText: false },
    };
    if (isMonto) {
      ws[addr].z = '#,##0';
      ws[addr].s.font = { ...ws[addr].s.font, color: { rgb: isMonto && c === 14 ? '1A56DB' : '374151' } };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Guía ${guia.numero_guia}`);
  writeFileCompat(wb, `Guia_${guia.numero_guia}.xlsx`);
}

export function exportarExcel(guias: Guia[], nombreArchivo = 'Guias_Flete_Chile') {
  // ── Hoja principal: detalle de guías ────────────────────────────────────────
  const filas = guias.map(g => ({
    'N° Guía':            g.numero_guia,
    'Fecha':              formatFecha(g.fecha),
    'Origen':             g.origen,
    'Destino':            g.destino,
    'Empresa Flete':      g.empresa_flete,
    'RUT Empresa':        g.rut_empresa || '',
    'Nombre Chofer':      g.nombre_chofer || '',
    'RUT Chofer':         g.rut_chofer || '',
    'Patente':            g.patente || '',
    'Descripción Carga':  g.descripcion_carga || '',
    'Monto Base (CLP)':   g.monto_base,
    'Cargos Extra (CLP)': g.cargos_extra.reduce((s, c) => s + (c.monto || 0), 0),
    'Total (CLP)':        g.monto_total,
    'Estado':             g.estado.charAt(0).toUpperCase() + g.estado.slice(1),
    'Notas':              g.notas || '',
  }));

  const ws = XLSX.utils.json_to_sheet(filas);

  // ── Anchos de columna ───────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 12 },  // N° Guía
    { wch: 12 },  // Fecha
    { wch: 16 },  // Origen
    { wch: 16 },  // Destino
    { wch: 24 },  // Empresa
    { wch: 16 },  // RUT Empresa
    { wch: 22 },  // Chofer
    { wch: 14 },  // RUT Chofer
    { wch: 10 },  // Patente
    { wch: 28 },  // Descripción
    { wch: 16 },  // Monto Base
    { wch: 18 },  // Cargos Extra
    { wch: 16 },  // Total
    { wch: 12 },  // Estado
    { wch: 30 },  // Notas
  ];

  // ── Estilos del encabezado (color azul, negrita) ────────────────────────────
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font:    { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill:    { fgColor: { rgb: '1A56DB' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        bottom: { style: 'medium', color: { rgb: 'FFFFFF' } },
      },
    };
  }

  // ── Formato numérico para columnas de monto ─────────────────────────────────
  const montosCols = [10, 11, 12]; // Monto Base, Cargos Extra, Total
  for (let row = 1; row <= filas.length; row++) {
    montosCols.forEach(col => {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[addr]) ws[addr].z = '#,##0';
    });

    // Colores alternos de fila
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        ...(ws[addr].s || {}),
        fill: { fgColor: { rgb: row % 2 === 0 ? 'EFF6FF' : 'FFFFFF' } },
        alignment: { vertical: 'center' },
      };
    }
  }

  // ── Hoja resumen ────────────────────────────────────────────────────────────
  const total       = guias.reduce((s, g) => s + g.monto_total, 0);
  const pendientes  = guias.filter(g => g.estado === 'pendiente');
  const pagadas     = guias.filter(g => g.estado === 'pagado');
  const anuladas    = guias.filter(g => g.estado === 'anulado');

  const resumen = [
    ['RESUMEN DE GUÍAS DE FLETE', ''],
    ['', ''],
    ['Total guías',              guias.length],
    ['Pendientes',               pendientes.length],
    ['Pagadas',                  pagadas.length],
    ['Anuladas',                 anuladas.length],
    ['', ''],
    ['Monto total (CLP)',        total],
    ['Monto pendiente (CLP)',    pendientes.reduce((s, g) => s + g.monto_total, 0)],
    ['Monto cobrado (CLP)',      pagadas.reduce((s, g) => s + g.monto_total, 0)],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 24 }, { wch: 18 }];

  // Título en negrita y azul
  if (wsResumen['A1']) {
    wsResumen['A1'].s = { font: { bold: true, sz: 14, color: { rgb: '1A56DB' } } };
  }
  // Montos con formato numérico
  ['B8', 'B9', 'B10'].forEach(addr => {
    if (wsResumen[addr]) wsResumen[addr].z = '#,##0';
  });

  // ── Libro y descarga ─────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws,       'Guías');
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  const fecha = new Date().toISOString().split('T')[0];
  writeFileCompat(wb, `${nombreArchivo}_${fecha}.xlsx`);
}

export function exportarViajesExcel(viajes: Viaje[], nombreArchivo = 'Mis_Viajes_Chile') {
  const filas = viajes.map(v => ({
    'Fecha':              formatFecha(v.fecha),
    'Origen':             v.origen,
    'Destino':            v.destino,
    'Empresa':            v.empresa,
    'Chofer':             v.nombre_chofer || '',
    'Patente':            v.patente || '',
    'Kilómetros':         v.kilometros || 0,
    'Duración (hrs)':     v.duracion_horas || 0,
    'Monto Cobrado (CLP)': v.monto_cobrado || 0,
    'Estado':             v.estado.charAt(0).toUpperCase() + v.estado.slice(1),
    'N° Guía':            v.numero_guia || '',
    'Notas':              v.notas || '',
  }));

  const ws = XLSX.utils.json_to_sheet(filas);
  ws['!cols'] = [
    {wch:12},{wch:16},{wch:16},{wch:24},{wch:22},{wch:10},
    {wch:12},{wch:14},{wch:20},{wch:12},{wch:12},{wch:30},
  ];

  // Encabezado verde oscuro para viajes
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill:      { fgColor: { rgb: '065F46' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  // Formato numérico
  for (let row = 1; row <= filas.length; row++) {
    const kmAddr     = XLSX.utils.encode_cell({ r: row, c: 6 });
    const hrsAddr    = XLSX.utils.encode_cell({ r: row, c: 7 });
    const montoAddr  = XLSX.utils.encode_cell({ r: row, c: 8 });
    if (ws[kmAddr])    ws[kmAddr].z    = '#,##0';
    if (ws[hrsAddr])   ws[hrsAddr].z   = '#,##0.0';
    if (ws[montoAddr]) ws[montoAddr].z = '#,##0';

    for (let col = range.s.c; col <= range.e.c; col++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = { ...(ws[addr].s||{}), fill: { fgColor: { rgb: row % 2 === 0 ? 'ECFDF5' : 'FFFFFF' } } };
    }
  }

  // Hoja resumen
  const realizados = viajes.filter(v => v.estado === 'realizado');
  const kmTotal    = viajes.reduce((s, v) => s + (v.kilometros||0), 0);
  const montoTotal = viajes.reduce((s, v) => s + (v.monto_cobrado||0), 0);

  const resumen = [
    ['RESUMEN DE VIAJES', ''],
    ['', ''],
    ['Total viajes',           viajes.length],
    ['Realizados',             realizados.length],
    ['Pendientes',             viajes.filter(v=>v.estado==='pendiente').length],
    ['Cancelados',             viajes.filter(v=>v.estado==='cancelado').length],
    ['', ''],
    ['Total km recorridos',    kmTotal],
    ['Total monto cobrado (CLP)', montoTotal],
    ['Promedio por viaje (CLP)', viajes.length ? Math.round(montoTotal / viajes.length) : 0],
  ];

  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  wsR['!cols'] = [{ wch: 26 }, { wch: 18 }];
  if (wsR['A1']) wsR['A1'].s = { font: { bold: true, sz: 14, color: { rgb: '065F46' } } };
  ['B8','B9','B10'].forEach(a => { if (wsR[a]) wsR[a].z = '#,##0'; });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws,  'Viajes');
  XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

  const fecha = new Date().toISOString().split('T')[0];
  writeFileCompat(wb, `${nombreArchivo}_${fecha}.xlsx`);
}
