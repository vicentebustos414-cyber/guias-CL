import React, { useEffect, useState, useCallback } from 'react';
import { Save, Printer, ArrowLeft, Plus, Trash2, ChevronDown, Sparkles, FileSpreadsheet, AlertCircle } from 'lucide-react';
import type { Page } from '../App';
import type { Guia, CargoExtra } from '../../shared/types';
import { formatCLP, hoy, formatRut } from '../lib/format';
import { generatePDF } from '../lib/pdf';
import { exportarGuiaExcel } from '../lib/excel';
import ImportModal from '../components/ImportModal';
import type { ParsedGuia } from '../lib/parser';

interface Props {
  editId: number | null;
  onNavigate: (p: Page, id?: number) => void;
}

const EMPRESAS_SUGERIDAS = [
  'Correos de Chile', 'Chilexpress', 'Starken', 'Blue Express', 'DHL Chile',
  'FedEx Chile', 'TNT Chile', 'Trans Lo Espejo', 'Logística SOPROLE',
  'Transportes Andrés Lara', 'SOPRAVAL', 'ENEX', 'COPEC Logística',
];

const CIUDADES_CHILE = [
  'Arica', 'Iquique', 'Antofagasta', 'Calama', 'Copiapó', 'La Serena', 'Coquimbo',
  'Valparaíso', 'Viña del Mar', 'Santiago', 'Rancagua', 'Talca', 'Chillán',
  'Concepción', 'Los Ángeles', 'Temuco', 'Valdivia', 'Osorno', 'Puerto Montt',
  'Coyhaique', 'Punta Arenas',
];

const CARGOS_EXTRA_SUGERIDOS = [
  'Peaje', 'Espera', 'Descarga', 'Carga', 'Seguro de carga',
  'Combustible extra', 'Pernocte', 'Recargo nocturno',
];

const EMPTY: Omit<Guia, 'id'> = {
  numero_guia: '', fecha: hoy(), origen: '', destino: '',
  empresa_flete: '', rut_empresa: '', nombre_chofer: '',
  rut_chofer: '', patente: '', descripcion_carga: '',
  monto_base: 0, cargos_extra: [], monto_total: 0,
  estado: 'pendiente', notas: '',
};

export default function GuiaFormPage({ editId, onNavigate }: Props) {
  const api = (window as any).api;
  const [form, setForm] = useState<Omit<Guia, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const isEdit = editId !== null;

  useEffect(() => {
    if (isEdit && api) {
      api.guias.get(editId).then((g: Guia | null) => {
        if (g) setForm(g);
      });
    } else if (!isEdit && api) {
      api.guias.nextNumero().then((n: string) => setForm(f => ({ ...f, numero_guia: n })));
    }
  }, [editId]);

  const total = form.monto_base + form.cargos_extra.reduce((s, c) => s + (c.monto || 0), 0);

  useEffect(() => {
    setForm(f => ({ ...f, monto_total: total }));
  }, [form.monto_base, form.cargos_extra]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
    setSaveErrorMsg('');
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.numero_guia.trim()) e.numero_guia = 'Requerido';
    if (!form.fecha)               e.fecha       = 'Requerido';
    if (!form.origen.trim())       e.origen      = 'Requerido';
    if (!form.destino.trim())      e.destino     = 'Requerido';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const campos = Object.keys(e).map(k => ({
        numero_guia: 'N° Guía', fecha: 'Fecha', origen: 'Origen', destino: 'Destino',
      }[k] || k)).join(', ');
      setSaveErrorMsg(`Completa los campos requeridos: ${campos}`);
      // Scroll al primer error
      setTimeout(() => document.querySelector('.border-red-400')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    } else {
      setSaveErrorMsg('');
    }
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !api) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.guias.update({ ...form, id: editId });
      } else {
        await api.guias.create(form);
      }
      onNavigate('historial');
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint() {
    if (!validate() || !api) return;
    setPrinting(true);
    try {
      // Guardar primero si es nuevo
      let guiaToprint = { ...form, id: editId };
      if (!isEdit) {
        const saved = await api.guias.create(form);
        guiaToprint = saved;
      }
      const config = await api.config.get();
      const filePath = await api.guias.exportPath(form.numero_guia);
      if (!filePath) { setPrinting(false); return; }
      const pdfBytes = await generatePDF(guiaToprint as Guia, config.empresa_emisora);
      await api.guias.savePdf(Array.from(pdfBytes), filePath);
      onNavigate('historial');
    } finally {
      setPrinting(false);
    }
  }

  function handleImport(data: ParsedGuia) {
    setForm(f => ({
      ...f,
      ...(data.numero_guia     ? { numero_guia: data.numero_guia } : {}),
      ...(data.fecha           ? { fecha: data.fecha } : {}),
      ...(data.origen          ? { origen: data.origen } : {}),
      ...(data.destino         ? { destino: data.destino } : {}),
      ...(data.empresa_flete   ? { empresa_flete: data.empresa_flete } : {}),
      ...(data.rut_empresa     ? { rut_empresa: data.rut_empresa } : {}),
      ...(data.nombre_chofer   ? { nombre_chofer: data.nombre_chofer } : {}),
      ...(data.rut_chofer      ? { rut_chofer: data.rut_chofer } : {}),
      ...(data.patente         ? { patente: data.patente } : {}),
      ...(data.descripcion_carga ? { descripcion_carga: data.descripcion_carga } : {}),
      ...(data.monto_base !== undefined ? { monto_base: data.monto_base } : {}),
      ...(data.cargos_extra && data.cargos_extra.length > 0 ? { cargos_extra: data.cargos_extra } : {}),
    }));
    setErrors({});
  }

  async function handleBatchImport(guias: ParsedGuia[], batch: { nombre_chofer: string; patente: string; fecha: string }) {
    if (!api) return;
    setSaving(true);
    try {
      for (const data of guias) {
        const nextNum = await api.guias.nextNumero();
        const cargos = data.cargos_extra || [];
        const base = data.monto_base || 0;
        const total = data.monto_total || (base + cargos.reduce((s: number, c: { monto: number }) => s + c.monto, 0));
        await api.guias.create({
          ...EMPTY,
          numero_guia:      data.numero_guia || nextNum,
          fecha:            data.fecha || batch.fecha,
          origen:           data.origen || '',
          destino:          data.destino || '',
          empresa_flete:    data.empresa_flete || '',
          rut_empresa:      data.rut_empresa || '',
          nombre_chofer:    data.nombre_chofer || batch.nombre_chofer,
          rut_chofer:       data.rut_chofer || '',
          patente:          data.patente || batch.patente,
          descripcion_carga: data.descripcion_carga || '',
          monto_base:       base,
          cargos_extra:     cargos,
          monto_total:      total,
          estado:           'pendiente',
          notas:            data.notas || '',
        });
      }
      onNavigate('historial');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportExcel() {
    if (!validate() || !api) return;
    setSaving(true);
    try {
      let savedGuia: Guia;
      if (isEdit) {
        savedGuia = await api.guias.update({ ...form, id: editId });
      } else {
        savedGuia = await api.guias.create(form);
      }
      exportarGuiaExcel(savedGuia);
      onNavigate('historial');
    } finally {
      setSaving(false);
    }
  }

  function addCargo() {
    set('cargos_extra', [...form.cargos_extra, { descripcion: '', monto: 0 }]);
  }

  function updateCargo(i: number, field: keyof CargoExtra, value: string | number) {
    const arr = [...form.cargos_extra];
    arr[i] = { ...arr[i], [field]: value };
    set('cargos_extra', arr);
  }

  function removeCargo(i: number) {
    set('cargos_extra', form.cargos_extra.filter((_, j) => j !== i));
  }

  return (
    <div className="p-6 fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => onNavigate('historial')} className="btn-secondary px-2 py-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Editar Guía' : 'Nueva Guía de Flete'}</h1>
          <p className="text-slate-500 text-sm">{isEdit ? `Editando ${form.numero_guia}` : 'Complete los datos del despacho'}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary border-purple-300 text-purple-700 hover:bg-purple-50">
            <Sparkles className="w-4 h-4" />
            Importar
          </button>
          <button onClick={handleExportExcel} disabled={saving} className="btn-secondary">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Guardar y Excel
          </button>
          <button onClick={handlePrint} disabled={printing} className="btn-secondary">
            <Printer className="w-4 h-4" />
            Guardar y PDF
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>

      {/* Banner de error de validación */}
      {saveErrorMsg && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{saveErrorMsg}</p>
          <button onClick={() => setSaveErrorMsg('')} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      <div className="space-y-4">
        {/* Sección 1: Identificación */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">1</span>
            Identificación de la Guía
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">N° de Guía *</label>
              <input className={`input-field font-mono font-bold ${errors.numero_guia ? 'border-red-400' : ''}`}
                value={form.numero_guia} onChange={e => set('numero_guia', e.target.value)} placeholder="G000001" />
              {errors.numero_guia && <p className="text-red-500 text-xs mt-1">{errors.numero_guia}</p>}
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className={`input-field ${errors.fecha ? 'border-red-400' : ''}`}
                value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input-field" value={form.estado} onChange={e => set('estado', e.target.value as Guia['estado'])}>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="anulado">Anulado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sección 2: Tramo */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">2</span>
            Tramo (Origen → Destino)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Origen *</label>
              <DatalistInput id="origen" list="ciudades" value={form.origen} onChange={v => set('origen', v)}
                error={errors.origen} placeholder="Ciudad de origen" options={CIUDADES_CHILE} />
            </div>
            <div>
              <label className="label">Destino *</label>
              <DatalistInput id="destino" list="ciudades2" value={form.destino} onChange={v => set('destino', v)}
                error={errors.destino} placeholder="Ciudad de destino" options={CIUDADES_CHILE} />
            </div>
          </div>
          {/* Flecha visual */}
          {form.origen && form.destino && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-2">
              <span className="font-semibold text-blue-700">{form.origen}</span>
              <span className="text-slate-400 flex-1 text-center">────────────────→</span>
              <span className="font-semibold text-blue-700">{form.destino}</span>
            </div>
          )}
        </div>

        {/* Sección 3: Empresa */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">3</span>
            Empresa del Flete (Importadora)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Empresa *</label>
              <DatalistInput id="empresa" list="empresas" value={form.empresa_flete} onChange={v => set('empresa_flete', v)}
                error={errors.empresa_flete} placeholder="Nombre empresa importadora" options={EMPRESAS_SUGERIDAS} />
            </div>
            <div>
              <label className="label">RUT Empresa</label>
              <input className="input-field" value={form.rut_empresa}
                onChange={e => set('rut_empresa', formatRut(e.target.value))}
                placeholder="12.345.678-9" maxLength={12} />
            </div>
          </div>
        </div>

        {/* Sección 4: Conductor */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">4</span>
            Datos del Conductor
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="label">Nombre Chofer</label>
              <input className="input-field" value={form.nombre_chofer}
                onChange={e => set('nombre_chofer', e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <label className="label">RUT Chofer</label>
              <input className="input-field" value={form.rut_chofer}
                onChange={e => set('rut_chofer', formatRut(e.target.value))}
                placeholder="12.345.678-9" maxLength={12} />
            </div>
            <div>
              <label className="label">Patente Vehículo</label>
              <input className="input-field font-mono uppercase" value={form.patente}
                onChange={e => set('patente', e.target.value.toUpperCase())} placeholder="ABCD12" maxLength={8} />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Descripción de la Carga</label>
            <textarea className="input-field resize-none h-16" value={form.descripcion_carga}
              onChange={e => set('descripcion_carga', e.target.value)} placeholder="Ej: Mercadería general, alimentos no perecederos…" />
          </div>
        </div>

        {/* Sección 5: Montos */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">5</span>
            Montos (CLP)
          </h2>

          {/* Monto base */}
          <div className="mb-4">
            <label className="label">Monto Base del Flete</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">$</span>
              <input type="number" min="0" className="input-field pl-7 font-semibold text-lg"
                value={form.monto_base || ''} onChange={e => set('monto_base', Number(e.target.value))}
                placeholder="0" />
            </div>
            {form.monto_base > 0 && <p className="text-xs text-slate-400 mt-1">{formatCLP(form.monto_base)}</p>}
          </div>

          {/* Cargos extra */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Cargos Extra</label>
              <button className="btn-secondary text-xs px-2 py-1" onClick={addCargo}>
                <Plus className="w-3 h-3" /> Agregar cargo
              </button>
            </div>

            {form.cargos_extra.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                Sin cargos extra. Haz clic en "Agregar cargo" si corresponde.
              </p>
            )}

            <div className="space-y-2">
              {form.cargos_extra.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <DatalistInput id={`cargo-desc-${i}`} list={`cargos-list-${i}`}
                      value={c.descripcion} onChange={v => updateCargo(i, 'descripcion', v)}
                      placeholder="Descripción del cargo" options={CARGOS_EXTRA_SUGERIDOS} />
                  </div>
                  <div className="w-36 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                    <input type="number" min="0" className="input-field pl-6"
                      value={c.monto || ''} onChange={e => updateCargo(i, 'monto', Number(e.target.value))}
                      placeholder="0" />
                  </div>
                  <button className="text-red-400 hover:text-red-600 p-2 mt-0.5" onClick={() => removeCargo(i)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="space-y-1 text-sm text-slate-600 mb-3">
              <div className="flex justify-between">
                <span>Monto base flete</span>
                <span className="font-medium">{formatCLP(form.monto_base)}</span>
              </div>
              {form.cargos_extra.map((c, i) => (
                <div key={i} className="flex justify-between">
                  <span>{c.descripcion || `Cargo ${i + 1}`}</span>
                  <span className="font-medium">{formatCLP(c.monto)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-base">TOTAL A PAGAR</span>
              <span className="font-extrabold text-2xl text-blue-700">{formatCLP(total)}</span>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="card p-5">
          <label className="label">Notas / Observaciones</label>
          <textarea className="input-field resize-none h-20" value={form.notas || ''}
            onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones adicionales, instrucciones especiales, referencias…" />
        </div>

        {/* Botones inferiores */}
        <div className="flex justify-end gap-3 pb-6">
          <button onClick={() => onNavigate('historial')} className="btn-secondary">Cancelar</button>
          <button onClick={handleExportExcel} disabled={saving} className="btn-secondary">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Guardar y exportar Excel
          </button>
          <button onClick={handlePrint} disabled={printing} className="btn-secondary">
            <Printer className="w-4 h-4" />
            Guardar y exportar PDF
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            Guardar Guía
          </button>
        </div>
      </div>

      {/* Modal de importación */}
      {showImport && (
        <ImportModal
          onImport={handleImport}
          onBatchImport={handleBatchImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

// Componente reutilizable para inputs con datalist
function DatalistInput({ id, list, value, onChange, placeholder, options, error }: {
  id: string; list: string; value: string; onChange: (v: string) => void;
  placeholder?: string; options: string[]; error?: string;
}) {
  return (
    <>
      <input list={list} className={`input-field ${error ? 'border-red-400' : ''}`}
        id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      <datalist id={list}>
        {options.map(o => <option key={o} value={o} />)}
      </datalist>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </>
  );
}
