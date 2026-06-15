import React, { useEffect, useState } from 'react';
import {
  MapPin, Plus, Edit2, Trash2, Search, TrendingUp,
  Clock, CheckCircle2, Route, ArrowLeft, Save, X, FileSpreadsheet,
  FileText, Link2,
} from 'lucide-react';
import type { Viaje, Guia } from '../../shared/types';
import { formatCLP, formatFecha, hoy } from '../lib/format';
import { exportarViajesExcel } from '../lib/excel';

const CIUDADES = [
  'Arica','Iquique','Antofagasta','Calama','Copiapó','La Serena','Coquimbo',
  'Valparaíso','Viña del Mar','Santiago','Rancagua','Talca','Chillán',
  'Concepción','Los Ángeles','Temuco','Valdivia','Osorno','Puerto Montt',
  'Coyhaique','Punta Arenas',
];

const EMPTY: Omit<Viaje, 'id'> = {
  fecha: hoy(), origen: '', destino: '', empresa: '', nombre_chofer: '',
  patente: '', kilometros: 0, duracion_horas: 0, monto_cobrado: 0,
  estado: 'realizado', numero_guia: '', notas: '',
};

export default function ViajesPage() {
  const api = (window as any).api;
  const [tab, setTab]           = useState<'viajes' | 'guias'>('viajes');
  const [viajes, setViajes]     = useState<Viaje[]>([]);
  const [guias, setGuias]       = useState<Guia[]>([]);
  const [search, setSearch]     = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal, setModal]       = useState<'new' | 'edit' | null>(null);
  const [form, setForm]         = useState<Omit<Viaje,'id'>>(EMPTY);
  const [editId, setEditId]     = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  async function load(q?: string) {
    if (!api) return;
    const [vData, gData] = await Promise.all([
      api.viajes.list(q),
      api.guias.list(q),
    ]);
    setViajes(vData);
    setGuias(gData);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = filtroEstado === 'todos' ? viajes : viajes.filter(v => v.estado === filtroEstado);

  const stats = {
    total:    viajes.length,
    km:       viajes.reduce((s, v) => s + (v.kilometros || 0), 0),
    monto:    viajes.reduce((s, v) => s + (v.monto_cobrado || 0), 0),
    realizado: viajes.filter(v => v.estado === 'realizado').length,
  };

  function openNew() {
    setForm(EMPTY); setEditId(null); setErrors({}); setModal('new');
  }

  async function openEdit(v: Viaje) {
    setForm({ ...v }); setEditId(v.id!); setErrors({}); setModal('edit');
  }

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.fecha)           e.fecha    = 'Requerido';
    if (!form.origen.trim())   e.origen   = 'Requerido';
    if (!form.destino.trim())  e.destino  = 'Requerido';
    if (!form.empresa.trim())  e.empresa  = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !api) return;
    setSaving(true);
    try {
      if (modal === 'edit' && editId !== null) {
        await api.viajes.update({ ...form, id: editId });
      } else {
        await api.viajes.create(form);
      }
      await load(search || undefined);
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este viaje?')) return;
    setDeleting(id);
    await api.viajes.delete(id);
    await load(search || undefined);
    setDeleting(null);
  }

  async function handleChangeEstado(v: Viaje, estado: Viaje['estado']) {
    await api.viajes.update({ ...v, estado });
    await load(search || undefined);
  }

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Viajes</h1>
          <p className="text-slate-500 text-sm">
            {filtered.length} viaje{filtered.length !== 1 ? 's' : ''} · {formatCLP(filtered.reduce((s,v)=>s+v.monto_cobrado,0))} cobrado
            {guias.length > 0 && <span className="ml-2 text-blue-500">· {guias.length} guía{guias.length !== 1 ? 's' : ''} registrada{guias.length !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => exportarViajesExcel(filtered)}>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Excel
          </button>
          <button className="btn-primary" onClick={openNew}>
            <Plus className="w-4 h-4" /> Nuevo Viaje
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        <button
          onClick={() => setTab('viajes')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === 'viajes' ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Route className="w-4 h-4 inline mr-1.5 opacity-70" />Viajes ({viajes.length})
        </button>
        <button
          onClick={() => setTab('guias')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === 'guias' ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText className="w-4 h-4 inline mr-1.5 opacity-70" />Guías Registradas ({guias.length})
        </button>
      </div>

      {/* ── Tab: Guías Registradas ─────────────────────────────────────────────── */}
      {tab === 'guias' && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input-field pl-9" placeholder="Buscar guía, empresa, tramo…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card overflow-hidden">
            {guias.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No hay guías registradas aún.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['N° Guía','Fecha','Tramo','Empresa','Chofer','Monto Total','Estado','Vinculado'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {guias.map(g => {
                      const viajeVinculado = viajes.find(v => v.numero_guia === g.numero_guia);
                      return (
                        <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded">{g.numero_guia}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatFecha(g.fecha)}</td>
                          <td className="px-4 py-3">
                            <span className="text-blue-600 font-medium">{g.origen}</span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="text-blue-600 font-medium">{g.destino}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{g.empresa_flete || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{g.nombre_chofer || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatCLP(g.monto_total)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              g.estado === 'pagado'  ? 'bg-emerald-100 text-emerald-800' :
                              g.estado === 'anulado' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>{g.estado}</span>
                          </td>
                          <td className="px-4 py-3">
                            {viajeVinculado ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                                <Link2 className="w-3 h-3" /> Viaje registrado
                              </span>
                            ) : (
                              <button
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                onClick={() => {
                                  setForm({
                                    fecha: g.fecha || hoy(),
                                    origen: g.origen || '',
                                    destino: g.destino || '',
                                    empresa: g.empresa_flete || '',
                                    nombre_chofer: g.nombre_chofer || '',
                                    patente: g.patente || '',
                                    kilometros: 0,
                                    duracion_horas: 0,
                                    monto_cobrado: g.monto_total || 0,
                                    estado: 'realizado',
                                    numero_guia: g.numero_guia || '',
                                    notas: '',
                                  });
                                  setEditId(null); setErrors({}); setModal('new'); setTab('viajes');
                                }}
                              >
                                <Plus className="w-3 h-3" /> Crear viaje
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Viajes ─────────────────────────────────────────────────────────── */}
      {tab === 'viajes' && <>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Viajes"    value={String(stats.total)}          icon={<Route className="w-5 h-5 text-blue-600"/>}    color="blue" />
        <StatCard label="Realizados"      value={String(stats.realizado)}       icon={<CheckCircle2 className="w-5 h-5 text-emerald-600"/>} color="emerald" />
        <StatCard label="Km Recorridos"   value={stats.km.toLocaleString('es-CL') + ' km'} icon={<MapPin className="w-5 h-5 text-purple-600"/>} color="purple" small />
        <StatCard label="Total Cobrado"   value={formatCLP(stats.monto)}        icon={<TrendingUp className="w-5 h-5 text-amber-600"/>} color="amber" small />
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar empresa, chofer, origen, destino, patente…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-40" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="realizado">Realizado</option>
          <option value="pendiente">Pendiente</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Route className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{search ? 'Sin resultados.' : 'No hay viajes registrados.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Fecha','Tramo','Empresa','Chofer · Patente','Km','Horas','Cobrado','Estado','Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">{h === 'Acciones' ? '' : h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatFecha(v.fecha)}</td>
                    <td className="px-4 py-3">
                      <span className="text-blue-600 font-medium">{v.origen}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="text-blue-600 font-medium">{v.destino}</span>
                      {v.numero_guia && <p className="text-xs text-slate-400 mt-0.5">Guía: {v.numero_guia}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{v.empresa}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{v.nombre_chofer || '—'}</p>
                      {v.patente && <p className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">{v.patente}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.kilometros ? v.kilometros.toLocaleString('es-CL') : '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{v.duracion_horas ? `${v.duracion_horas}h` : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatCLP(v.monto_cobrado)}</td>
                    <td className="px-4 py-3">
                      <select value={v.estado}
                        onChange={e => handleChangeEstado(v, e.target.value as Viaje['estado'])}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                          v.estado === 'realizado' ? 'bg-emerald-100 text-emerald-800' :
                          v.estado === 'cancelado' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                        <option value="realizado">realizado</option>
                        <option value="pendiente">pendiente</option>
                        <option value="cancelado">cancelado</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button title="Editar" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600" onClick={() => openEdit(v)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button title="Eliminar" disabled={deleting === v.id}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600"
                          onClick={() => handleDelete(v.id!)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal formulario */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-bold text-lg text-slate-900">
                {modal === 'new' ? 'Registrar Nuevo Viaje' : 'Editar Viaje'}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Fila 1: fecha, origen, destino */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Fecha *</label>
                  <input type="date" className={`input-field ${errors.fecha ? 'border-red-400':''}`}
                    value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
                <div>
                  <label className="label">Origen *</label>
                  <input list="vj-ciudades1" className={`input-field ${errors.origen ? 'border-red-400':''}`}
                    value={form.origen} onChange={e => set('origen', e.target.value)} placeholder="Ciudad" />
                  <datalist id="vj-ciudades1">{CIUDADES.map(c=><option key={c} value={c}/>)}</datalist>
                  {errors.origen && <p className="text-red-500 text-xs mt-1">{errors.origen}</p>}
                </div>
                <div>
                  <label className="label">Destino *</label>
                  <input list="vj-ciudades2" className={`input-field ${errors.destino ? 'border-red-400':''}`}
                    value={form.destino} onChange={e => set('destino', e.target.value)} placeholder="Ciudad" />
                  <datalist id="vj-ciudades2">{CIUDADES.map(c=><option key={c} value={c}/>)}</datalist>
                  {errors.destino && <p className="text-red-500 text-xs mt-1">{errors.destino}</p>}
                </div>
              </div>

              {/* Fila 2: empresa, guía */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Empresa *</label>
                  <input className={`input-field ${errors.empresa ? 'border-red-400':''}`}
                    value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Empresa contratante" />
                  {errors.empresa && <p className="text-red-500 text-xs mt-1">{errors.empresa}</p>}
                </div>
                <div>
                  <label className="label">N° Guía asociada (opcional)</label>
                  <input className="input-field font-mono" value={form.numero_guia || ''}
                    onChange={e => set('numero_guia', e.target.value)} placeholder="G000001" />
                </div>
              </div>

              {/* Fila 3: chofer, patente */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre Chofer</label>
                  <input className="input-field" value={form.nombre_chofer}
                    onChange={e => set('nombre_chofer', e.target.value)} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="label">Patente</label>
                  <input className="input-field font-mono uppercase" value={form.patente}
                    onChange={e => set('patente', e.target.value.toUpperCase())} placeholder="ABCD12" maxLength={8} />
                </div>
              </div>

              {/* Fila 4: km, horas, monto */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Kilómetros</label>
                  <input type="number" min="0" className="input-field"
                    value={form.kilometros || ''} onChange={e => set('kilometros', Number(e.target.value))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Duración (horas)</label>
                  <input type="number" min="0" step="0.5" className="input-field"
                    value={form.duracion_horas || ''} onChange={e => set('duracion_horas', Number(e.target.value))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Monto Cobrado (CLP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                    <input type="number" min="0" className="input-field pl-6 font-semibold"
                      value={form.monto_cobrado || ''} onChange={e => set('monto_cobrado', Number(e.target.value))} placeholder="0" />
                  </div>
                  {form.monto_cobrado > 0 && <p className="text-xs text-slate-400 mt-1">{formatCLP(form.monto_cobrado)}</p>}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="label">Estado</label>
                <select className="input-field" value={form.estado} onChange={e => set('estado', e.target.value as Viaje['estado'])}>
                  <option value="realizado">Realizado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="label">Notas / Observaciones</label>
                <textarea className="input-field resize-none h-16" value={form.notas || ''}
                  onChange={e => set('notas', e.target.value)} placeholder="Observaciones del viaje…" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" />
                {saving ? 'Guardando…' : modal === 'new' ? 'Registrar Viaje' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}

function StatCard({ label, value, icon, color, small }: { label: string; value: string; icon: React.ReactNode; color: string; small?: boolean }) {
  const bg: Record<string, string> = { blue: 'bg-blue-50', amber: 'bg-amber-50', emerald: 'bg-emerald-50', purple: 'bg-purple-50' };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`font-bold text-slate-900 mt-1 ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
        </div>
        <div className={`${bg[color]} p-2 rounded-lg`}>{icon}</div>
      </div>
    </div>
  );
}
