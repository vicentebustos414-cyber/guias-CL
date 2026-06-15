import React, { useEffect, useState } from 'react';
import { BarChart2, Download, TrendingUp, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import type { Guia, Viaje } from '../../shared/types';
import { formatCLP, formatFecha } from '../lib/format';
import { exportarExcel } from '../lib/excel';

export default function ReportesPage() {
  const api = (window as any).api;
  const [guias,  setGuias]  = useState<Guia[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [desde,  setDesde]  = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!api) return;
    api.guias.list().then(setGuias);
    api.viajes?.list().then(setViajes).catch(() => {});
  }, []);

  const filtradas = guias.filter(g => g.fecha >= desde && g.fecha <= hasta);
  const viajesFilt = viajes.filter(v => v.fecha >= desde && v.fecha <= hasta);

  // Estadísticas del período
  const totalGuias     = filtradas.length;
  const montoBruto     = filtradas.reduce((s, g) => s + g.monto_total, 0);
  const montoPagado    = filtradas.filter(g => g.estado === 'pagado').reduce((s, g) => s + g.monto_total, 0);
  const montoPendiente = filtradas.filter(g => g.estado === 'pendiente').reduce((s, g) => s + g.monto_total, 0);
  const kmTotales      = viajesFilt.reduce((s, v) => s + (v.kilometros || 0), 0);

  // Agrupación por empresa
  const porEmpresa = Object.values(
    filtradas.reduce<Record<string, { empresa: string; guias: number; monto: number }>>((acc, g) => {
      const k = g.empresa_flete;
      if (!acc[k]) acc[k] = { empresa: k, guias: 0, monto: 0 };
      acc[k].guias++;
      acc[k].monto += g.monto_total;
      return acc;
    }, {})
  ).sort((a, b) => b.monto - a.monto);

  // Agrupación por mes
  const porMes = Object.entries(
    filtradas.reduce<Record<string, number>>((acc, g) => {
      const m = g.fecha.slice(0, 7);
      acc[m] = (acc[m] || 0) + g.monto_total;
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b));

  const maxMonto = Math.max(...porMes.map(([, v]) => v), 1);

  function exportarReporte() {
    exportarExcel(filtradas, `Reporte_${desde}_${hasta}`);
  }

  return (
    <div className="p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="text-slate-500 text-sm">Análisis de guías y viajes por período</p>
        </div>
        <button onClick={exportarReporte} className="btn-secondary">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Exportar Excel
        </button>
      </div>

      {/* Filtro de fechas */}
      <div className="card p-4 mb-6 flex items-center gap-4 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <label className="text-sm text-slate-600 font-medium">Desde</label>
          <input type="date" className="input-field w-40 text-sm" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">Hasta</label>
          <input type="date" className="input-field w-40 text-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <span className="text-sm text-slate-500 ml-auto">{totalGuias} guías en el período</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total guías',    value: String(totalGuias),        color: 'text-blue-700',    bg: 'bg-blue-50' },
          { label: 'Monto bruto',    value: formatCLP(montoBruto),     color: 'text-slate-900',   bg: 'bg-slate-50' },
          { label: 'Cobrado',        value: formatCLP(montoPagado),    color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Por cobrar',     value: formatCLP(montoPendiente), color: 'text-amber-700',   bg: 'bg-amber-50' },
          { label: 'Km recorridos',  value: `${kmTotales.toLocaleString('es-CL')} km`, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`font-bold text-lg ${color} leading-tight`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico por mes */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Ingresos por mes
          </h3>
          {porMes.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Sin datos en el período</p>
          ) : (
            <div className="space-y-3">
              {porMes.map(([mes, monto]) => {
                const [y, m] = mes.split('-');
                const label = `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m)-1]} ${y}`;
                const pct = (monto / maxMonto) * 100;
                return (
                  <div key={mes}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 font-medium">{label}</span>
                      <span className="font-bold text-slate-900">{formatCLP(monto)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top empresas */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            Top empresas por monto
          </h3>
          {porEmpresa.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Sin datos en el período</p>
          ) : (
            <div className="space-y-3">
              {porEmpresa.slice(0, 8).map(({ empresa, guias: ng, monto }, i) => (
                <div key={empresa} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{empresa}</p>
                    <p className="text-xs text-slate-400">{ng} guía{ng !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="font-bold text-emerald-700 text-sm shrink-0">{formatCLP(monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Detalle del período</h3>
          <button onClick={exportarReporte} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Download className="w-3 h-3" /> Descargar
          </button>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">N° Guía</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tramo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtradas.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Sin guías en el período seleccionado</td></tr>
              ) : filtradas.map(g => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono font-bold text-blue-600 text-xs">{g.numero_guia}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatFecha(g.fecha)}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{g.empresa_flete}</td>
                  <td className="px-4 py-2.5 text-slate-500">{g.origen} → {g.destino}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatCLP(g.monto_total)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`badge-${g.estado}`}>{g.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 font-bold text-slate-700">TOTAL PERÍODO</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCLP(montoBruto)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
