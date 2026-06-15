import React, { useEffect, useState } from 'react';
import {
  Search, FilePlus2, Edit2, Trash2, Printer, FileSpreadsheet,
  Receipt, X, AlertTriangle, CheckSquare, Square, CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import type { Page } from '../App';
import type { Guia } from '../../shared/types';
import { formatCLP, formatFecha, formatRut } from '../lib/format';
import { generatePDF, generateFactura, generateNotaCredito, type ReceptorFactura } from '../lib/pdf';
import { exportarExcel } from '../lib/excel';

interface Props { onNavigate: (p: Page, id?: number) => void; }

// ── Modal confirmar eliminación ───────────────────────────────────────────────
function DeleteModal({ guia, onConfirm, onCancel }: {
  guia: Guia;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm fade-in p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100 p-2.5 rounded-full">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Eliminar guía</h3>
            <p className="text-xs text-slate-500">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-5">
          ¿Estás seguro que quieres eliminar la guía{' '}
          <span className="font-bold text-blue-600">{guia.numero_guia}</span>
          {guia.empresa_flete ? ` de ${guia.empresa_flete}` : ''}?
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal generar factura ─────────────────────────────────────────────────────
function FacturaModal({
  guias,
  onClose,
  onGenerar,
}: {
  guias: Guia[];
  onClose: () => void;
  onGenerar: (receptor: ReceptorFactura, numFactura: string) => Promise<void>;
}) {
  const firstGuia = guias[0];
  const [numFactura, setNumFactura] = useState('001');
  const [nombre, setNombre]         = useState(firstGuia?.empresa_flete || '');
  const [rut, setRut]               = useState(firstGuia?.rut_empresa || '');
  const [direccion, setDireccion]   = useState('');
  const [giro, setGiro]             = useState('Importación / Exportación');
  const [comuna, setComuna]         = useState('');
  const [loading, setLoading]       = useState(false);

  const neto  = guias.reduce((s, g) => s + g.monto_total, 0);
  const iva   = Math.round(neto * 0.19);
  const total = neto + iva;

  async function handleGenerar() {
    if (!nombre.trim() || !rut.trim()) return;
    setLoading(true);
    try {
      await onGenerar({ nombre, rut, direccion, giro, comuna }, numFactura);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-white text-lg">Generar Factura</h2>
              <p className="text-red-200 text-xs">
                {guias.length} guía{guias.length > 1 ? 's' : ''} seleccionada{guias.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-red-700 rounded-lg text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[68vh]">
          {/* N° Factura + Resumen */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">N° de Factura *</label>
              <input
                className="input-field font-mono font-bold text-lg text-red-700"
                value={numFactura}
                onChange={e => setNumFactura(e.target.value)}
                placeholder="001"
              />
            </div>
            <div className="bg-slate-50 rounded-xl p-3 flex flex-col justify-center">
              <p className="text-xs text-slate-500 mb-1">Resumen</p>
              <div className="text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span>Neto:</span>
                  <span className="font-medium">{formatCLP(neto)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>IVA 19%:</span>
                  <span className="font-medium">{formatCLP(iva)}</span>
                </div>
                <div className="flex justify-between text-blue-700 font-bold border-t border-slate-200 pt-1 mt-1">
                  <span>Total:</span>
                  <span>{formatCLP(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Receptor */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">R</span>
              Datos del Receptor (Cliente)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Razón Social *</label>
                <input
                  className="input-field"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Empresa importadora SA"
                />
              </div>
              <div>
                <label className="label">RUT *</label>
                <input
                  className="input-field font-mono"
                  value={rut}
                  onChange={e => setRut(formatRut(e.target.value))}
                  placeholder="76.354.771-K"
                  maxLength={12}
                />
              </div>
              <div>
                <label className="label">Giro</label>
                <input
                  className="input-field"
                  value={giro}
                  onChange={e => setGiro(e.target.value)}
                  placeholder="Importación / Exportación"
                />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input
                  className="input-field"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  placeholder="Av. Principal 1234"
                />
              </div>
              <div>
                <label className="label">Comuna</label>
                <input
                  className="input-field"
                  value={comuna}
                  onChange={e => setComuna(e.target.value)}
                  placeholder="Santiago"
                />
              </div>
            </div>
          </div>

          {/* Guías incluidas */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Guías incluidas en esta factura
            </h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden max-h-44 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">N° Guía</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Tramo</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Chofer</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {guias.map((g, i) => (
                    <tr key={g.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-1.5 font-mono font-bold text-blue-600">{g.numero_guia}</td>
                      <td className="px-3 py-1.5 text-slate-700">{g.origen} → {g.destino}</td>
                      <td className="px-3 py-1.5 text-slate-500">{g.nombre_chofer || '—'}</td>
                      <td className="px-3 py-1.5 text-slate-500">{formatFecha(g.fecha)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{formatCLP(g.monto_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-400">El PDF se descargará automáticamente</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleGenerar}
              disabled={loading || !nombre.trim() || !rut.trim() || !numFactura.trim()}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              {loading ? 'Generando…' : `Generar Factura N° ${numFactura}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal Nota de Crédito ─────────────────────────────────────────────────────
function NotaCreditoModal({
  guias,
  onClose,
  onGenerar,
}: {
  guias: Guia[];
  onClose: () => void;
  onGenerar: (receptor: ReceptorFactura, numNota: string, facturaRef: string, motivo: string) => Promise<void>;
}) {
  const firstGuia = guias[0];
  const [numNota, setNumNota]       = useState('001');
  const [facturaRef, setFacturaRef] = useState('');
  const [motivo, setMotivo]         = useState('');
  const [nombre, setNombre]         = useState(firstGuia?.empresa_flete || '');
  const [rut, setRut]               = useState(firstGuia?.rut_empresa || '');
  const [direccion, setDireccion]   = useState('');
  const [giro, setGiro]             = useState('Importación / Exportación');
  const [comuna, setComuna]         = useState('');
  const [loading, setLoading]       = useState(false);

  const neto  = guias.reduce((s, g) => s + g.monto_total, 0);
  const iva   = Math.round(neto * 0.19);
  const total = neto + iva;

  async function handleGenerar() {
    if (!nombre.trim() || !rut.trim() || !facturaRef.trim() || !motivo.trim()) return;
    setLoading(true);
    try {
      await onGenerar({ nombre, rut, direccion, giro, comuna }, numNota, facturaRef, motivo);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden">
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-white text-lg">Nota de Crédito</h2>
              <p className="text-emerald-200 text-xs">
                {guias.length} guía{guias.length > 1 ? 's' : ''} · {formatCLP(total)} a acreditar
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-emerald-800 rounded-lg text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[68vh]">
          {/* N° Nota + resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">N° Nota de Crédito *</label>
              <input className="input-field font-mono font-bold text-lg text-emerald-700"
                value={numNota} onChange={e => setNumNota(e.target.value)} placeholder="001" />
            </div>
            <div>
              <label className="label">Ref. Factura que anula *</label>
              <input className="input-field font-mono font-bold text-red-700"
                value={facturaRef} onChange={e => setFacturaRef(e.target.value)} placeholder="N° de factura" />
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 flex flex-col justify-center">
              <p className="text-xs text-slate-500 mb-1">Crédito a emitir</p>
              <div className="text-xs space-y-0.5">
                <div className="flex justify-between"><span>Neto:</span><span className="font-medium">{formatCLP(neto)}</span></div>
                <div className="flex justify-between text-amber-700"><span>IVA 19%:</span><span className="font-medium">{formatCLP(iva)}</span></div>
                <div className="flex justify-between text-emerald-700 font-bold border-t border-emerald-200 pt-1 mt-1"><span>Total crédito:</span><span>{formatCLP(total)}</span></div>
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="label">Motivo de la nota de crédito *</label>
            <input className="input-field" value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Error en monto facturado, anulación de servicio, descuento acordado…" />
          </div>

          {/* Servicios internos detalle */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Servicios a acreditar</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden max-h-44 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">N° Guía</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Tramo</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Servicio</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {guias.flatMap((g, gi) => {
                    const rows = [
                      <tr key={`${g.id}-base`} className={gi % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-3 py-1.5 font-mono font-bold text-blue-600">{g.numero_guia}</td>
                        <td className="px-3 py-1.5 text-slate-700">{g.origen} → {g.destino}</td>
                        <td className="px-3 py-1.5 text-slate-500">Flete base</td>
                        <td className="px-3 py-1.5 text-right font-semibold">{formatCLP(g.monto_base || g.monto_total)}</td>
                      </tr>,
                    ];
                    for (const c of (g.cargos_extra || [])) {
                      if (!c.monto) continue;
                      rows.push(
                        <tr key={`${g.id}-${c.descripcion}`} className="bg-emerald-50">
                          <td className="px-3 py-1 text-slate-400">↳</td>
                          <td className="px-3 py-1 text-slate-500 col-span-1">{g.origen} → {g.destino}</td>
                          <td className="px-3 py-1 text-emerald-700 font-medium">{c.descripcion}</td>
                          <td className="px-3 py-1 text-right text-emerald-800 font-semibold">{formatCLP(c.monto)}</td>
                        </tr>
                      );
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receptor */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Datos del Receptor</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Razón Social *</label>
                <input className="input-field" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Empresa SA" />
              </div>
              <div>
                <label className="label">RUT *</label>
                <input className="input-field font-mono" value={rut} onChange={e => setRut(formatRut(e.target.value))} placeholder="76.354.771-K" maxLength={12} />
              </div>
              <div>
                <label className="label">Giro</label>
                <input className="input-field" value={giro} onChange={e => setGiro(e.target.value)} placeholder="Importación / Exportación" />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input className="input-field" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Av. Principal 1234" />
              </div>
              <div>
                <label className="label">Comuna</label>
                <input className="input-field" value={comuna} onChange={e => setComuna(e.target.value)} placeholder="Santiago" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-400">El PDF se descargará automáticamente</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleGenerar}
              disabled={loading || !nombre.trim() || !rut.trim() || !facturaRef.trim() || !motivo.trim()}
              className="bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {loading ? 'Generando…' : `Generar N/C N° ${numNota}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function HistorialPage({ onNavigate }: Props) {
  const api = (window as any).api;

  const [guias, setGuias]                 = useState<Guia[]>([]);
  const [search, setSearch]               = useState('');
  const [filtroEstado, setFiltroEstado]   = useState<string>('todos');
  const [selected, setSelected]           = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<Guia | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [showFactura, setShowFactura]     = useState(false);
  const [showNotaCredito, setShowNotaCredito] = useState(false);

  async function load(q?: string) {
    if (!api) return;
    const data = await api.guias.list(q);
    setGuias(data);
    // Limpiar selección de guías que ya no existen
    setSelected(prev => {
      const ids = new Set(data.map((g: Guia) => g.id!));
      return new Set([...prev].filter(id => ids.has(id)));
    });
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Selección ───────────────────────────────────────────────────────────────
  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(g => g.id!)));
    }
  }

  // ── Eliminar ────────────────────────────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!confirmDelete || !api) return;
    setDeleting(true);
    await api.guias.delete(confirmDelete.id!);
    setConfirmDelete(null);
    setDeleting(false);
    await load(search || undefined);
  }

  // ── PDF guía ─────────────────────────────────────────────────────────────────
  async function handlePrint(g: Guia) {
    const config   = await api.config.get();
    const filePath = await api.guias.exportPath(g.numero_guia);
    if (!filePath) return;
    const pdfBytes = await generatePDF(g, config.empresa_emisora);
    await api.guias.savePdf(Array.from(pdfBytes), filePath);
  }

  async function handleChangeEstado(g: Guia, estado: Guia['estado']) {
    await api.guias.update({ ...g, estado });
    await load(search || undefined);
  }

  // ── Factura ──────────────────────────────────────────────────────────────────
  async function handleGenerarFactura(receptor: ReceptorFactura, numFactura: string) {
    if (!api) return;
    const config       = await api.config.get();
    const pdfBytes     = await generateFactura(
      guiasParaFactura,
      config.empresa_emisora,
      receptor,
      numFactura,
    );
    const nombre   = `Factura_${numFactura}_${receptor.nombre.replace(/\s+/g, '_').slice(0, 20)}.pdf`;
    const filePath = await api.guias.exportPath(nombre);
    if (filePath) await api.guias.savePdf(Array.from(pdfBytes), filePath);
  }

  // ── Nota de Crédito ──────────────────────────────────────────────────────────
  async function handleGenerarNotaCredito(
    receptor: ReceptorFactura,
    numNota: string,
    facturaRef: string,
    motivo: string,
  ) {
    if (!api) return;
    const config   = await api.config.get();
    const pdfBytes = await generateNotaCredito(
      guiasParaFactura,
      config.empresa_emisora,
      receptor,
      numNota,
      facturaRef,
      motivo,
    );
    const nombre   = `NC_${numNota}_Ref_F${facturaRef}_${receptor.nombre.replace(/\s+/g,'_').slice(0,20)}.pdf`;
    const filePath = await api.guias.exportPath(nombre);
    if (filePath) await api.guias.savePdf(Array.from(pdfBytes), filePath);
  }

  // ── Datos derivados ──────────────────────────────────────────────────────────
  const filtered = filtroEstado === 'todos'
    ? guias
    : guias.filter(g => g.estado === filtroEstado);

  const allChecked  = filtered.length > 0 && selected.size === filtered.length;
  const someChecked = selected.size > 0 && !allChecked;

  // Las guías que entran en la factura: seleccionadas primero; si ninguna → todas las filtradas
  const guiasParaFactura = selected.size > 0
    ? filtered.filter(g => selected.has(g.id!))
    : filtered;

  const totalFiltrado   = filtered.reduce((s, g) => s + g.monto_total, 0);
  const totalSeleccion  = filtered
    .filter(g => selected.has(g.id!))
    .reduce((s, g) => s + g.monto_total, 0);

  const facturaLabel = selected.size > 0
    ? `Factura (${selected.size} sel.)`
    : `Factura (${filtered.length})`;

  return (
    <div className="p-6 fade-in">
      {/* ── Cabecera ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de Guías</h1>
          <p className="text-slate-500 text-sm">
            {filtered.length} guía{filtered.length !== 1 ? 's' : ''} · Total: {formatCLP(totalFiltrado)}
            {selected.size > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                · {selected.size} seleccionada{selected.size > 1 ? 's' : ''}: {formatCLP(totalSeleccion)}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {selected.size > 0 && (
            <button
              className="text-xs text-slate-500 hover:text-slate-700 underline"
              onClick={() => setSelected(new Set())}
            >
              Limpiar selección
            </button>
          )}
          <button
            className="bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
            onClick={() => setShowNotaCredito(true)}
            disabled={filtered.length === 0}
            title="Generar Nota de Crédito"
          >
            <RotateCcw className="w-4 h-4" />
            N/C
          </button>
          <button
            className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
            onClick={() => setShowFactura(true)}
            disabled={filtered.length === 0}
            title={selected.size > 0
              ? `Factura con ${selected.size} guías seleccionadas`
              : `Factura con todas las ${filtered.length} guías filtradas`}
          >
            <Receipt className="w-4 h-4" />
            {facturaLabel}
          </button>
          <button
            className="btn-secondary"
            onClick={() => exportarExcel(filtered, 'Guias_Flete_Chile')}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel
          </button>
          <button className="btn-primary" onClick={() => onNavigate('nueva-guia')}>
            <FilePlus2 className="w-4 h-4" /> Nueva Guía
          </button>
        </div>
      </div>

      {/* ── Búsqueda y filtros ── */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-9"
            placeholder="Buscar por N° guía, empresa, origen, destino…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-40"
          value={filtroEstado}
          onChange={e => { setFiltroEstado(e.target.value); setSelected(new Set()); }}
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      {/* ── Hint selección ── */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-400 mb-2 ml-1">
          ☑ Marca guías para incluir solo esas en la factura. Sin marca = se incluyen todas.
        </p>
      )}

      {/* ── Tabla ── */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {search ? 'Sin resultados para esa búsqueda.' : 'No hay guías registradas.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {/* Checkbox "seleccionar todo" */}
                  <th className="px-3 py-3 w-10">
                    <button
                      onClick={toggleAll}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                      title={allChecked ? 'Desmarcar todo' : 'Seleccionar todo'}
                    >
                      {allChecked
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : someChecked
                        ? <CheckSquare className="w-4 h-4 text-blue-400" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">N° Guía</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Empresa</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Tramo</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Total</th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Estado</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(g => {
                  const isSelected = selected.has(g.id!);
                  return (
                    <tr
                      key={g.id}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleOne(g.id!)}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 w-10">
                        <button
                          onClick={e => { e.stopPropagation(); toggleOne(g.id!); }}
                          className="text-slate-300 hover:text-blue-600 transition-colors"
                        >
                          {isSelected
                            ? <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            : <Square className="w-4 h-4" />
                          }
                        </button>
                      </td>

                      <td className="px-3 py-3">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          isSelected ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {g.numero_guia}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatFecha(g.fecha)}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">{g.empresa_flete}</p>
                        {g.nombre_chofer && (
                          <p className="text-xs text-slate-400">
                            {g.nombre_chofer}{g.patente ? ` · ${g.patente}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span className="text-blue-600 font-medium">{g.origen}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-blue-600 font-medium">{g.destino}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">
                        {formatCLP(g.monto_total)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <select
                          value={g.estado}
                          onChange={e => { e.stopPropagation(); handleChangeEstado(g, e.target.value as Guia['estado']); }}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                            g.estado === 'pagado'  ? 'bg-emerald-100 text-emerald-800' :
                            g.estado === 'anulado' ? 'bg-red-100 text-red-800' :
                                                     'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <option value="pendiente">pendiente</option>
                          <option value="pagado">pagado</option>
                          <option value="anulado">anulado</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            title="Editar"
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            onClick={e => { e.stopPropagation(); onNavigate('nueva-guia', g.id); }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title="Exportar guía PDF"
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            onClick={e => { e.stopPropagation(); handlePrint(g); }}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            title="Generar factura para esta guía"
                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            onClick={e => { e.stopPropagation(); setSelected(new Set([g.id!])); setShowFactura(true); }}
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            title="Eliminar guía"
                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            onClick={e => { e.stopPropagation(); setConfirmDelete(g); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal eliminar ── */}
      {confirmDelete && (
        <DeleteModal
          guia={confirmDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ── Modal factura ── */}
      {showFactura && guiasParaFactura.length > 0 && (
        <FacturaModal
          guias={guiasParaFactura}
          onClose={() => setShowFactura(false)}
          onGenerar={handleGenerarFactura}
        />
      )}

      {/* ── Modal nota de crédito ── */}
      {showNotaCredito && guiasParaFactura.length > 0 && (
        <NotaCreditoModal
          guias={guiasParaFactura}
          onClose={() => setShowNotaCredito(false)}
          onGenerar={handleGenerarNotaCredito}
        />
      )}
    </div>
  );
}
