import React, { useEffect, useState } from 'react';
import { FilePlus2, TrendingUp, Clock, CheckCircle2, ArrowRight, AlertTriangle, Zap, BarChart2 } from 'lucide-react';
import type { Page } from '../App';
import type { Guia } from '../../shared/types';
import { formatCLP, formatFecha, diasDesde } from '../lib/format';

interface Props { onNavigate: (p: Page, id?: number) => void; }

interface Stats {
  total: number;
  pendiente: number;
  pagado: number;
  anulado: number;
  monto_mes: number;
  monto_pendiente: number;
  monto_pagado: number;
}

export default function DashboardPage({ onNavigate }: Props) {
  const api = (window as any).api;
  const [guias, setGuias] = useState<Guia[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pendiente: 0, pagado: 0, anulado: 0, monto_mes: 0, monto_pendiente: 0, monto_pagado: 0 });
  const [planInfo, setPlanInfo] = useState<{ plan: string; guias_usadas: number; limite_mensual: number | null } | null>(null);

  useEffect(() => {
    if (!api) return;
    api.guias.list().then((data: Guia[]) => {
      setGuias(data);
      const mesActual = new Date().toISOString().slice(0, 7);
      setStats({
        total:           data.length,
        pendiente:       data.filter(g => g.estado === 'pendiente').length,
        pagado:          data.filter(g => g.estado === 'pagado').length,
        anulado:         data.filter(g => g.estado === 'anulado').length,
        monto_mes:       data.filter(g => g.fecha.startsWith(mesActual)).reduce((s, g) => s + g.monto_total, 0),
        monto_pendiente: data.filter(g => g.estado === 'pendiente').reduce((s, g) => s + g.monto_total, 0),
        monto_pagado:    data.filter(g => g.estado === 'pagado').reduce((s, g) => s + g.monto_total, 0),
      });
    });
    // Billing info only available in web mode
    if (api.billing) {
      api.billing.me().then(setPlanInfo).catch(() => {});
    }
  }, []);

  const recientes = guias.slice(0, 6);
  const vencidas  = guias.filter(g => g.estado === 'pendiente' && diasDesde(g.fecha) > 30);

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inicio</h1>
          <p className="text-slate-500 text-sm mt-0.5">Resumen de guías de flete</p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate('nueva-guia')}>
          <FilePlus2 className="w-4 h-4" />
          Nueva Guía
        </button>
      </div>

      {/* Banner plan free casi al límite */}
      {planInfo && planInfo.plan === 'free' && planInfo.limite_mensual && planInfo.guias_usadas >= planInfo.limite_mensual * 0.8 && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Zap className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Has usado {planInfo.guias_usadas} de {planInfo.limite_mensual} guías este mes
            </p>
            <p className="text-xs text-amber-600">Actualiza a Pro para guías ilimitadas</p>
          </div>
          <button
            onClick={() => api.billing?.checkout('pro').then((r: any) => window.location.href = r.url)}
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Actualizar a Pro
          </button>
        </div>
      )}

      {/* Alerta guías vencidas */}
      {vencidas.length > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{vencidas.length} guía{vencidas.length > 1 ? 's' : ''} pendiente{vencidas.length > 1 ? 's' : ''}</span>
            {' '}con más de 30 días sin pago.
          </p>
          <button onClick={() => onNavigate('historial')} className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 shrink-0">
            Ver historial →
          </button>
        </div>
      )}

      {/* Tarjetas estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Guías"     value={String(stats.total)}            icon={<BarChart2 className="w-5 h-5 text-blue-600" />}    color="blue" />
        <StatCard label="Pendientes"      value={String(stats.pendiente)}        icon={<Clock className="w-5 h-5 text-amber-600" />}       color="amber" />
        <StatCard label="Cobrado (mes)"   value={formatCLP(stats.monto_mes)}     icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} color="emerald" small />
        <StatCard label="Por cobrar"      value={formatCLP(stats.monto_pendiente)} icon={<CheckCircle2 className="w-5 h-5 text-purple-600" />} color="purple" small />
      </div>

      {/* Resumen financiero */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Distribución de estados</h3>
          <div className="space-y-3">
            {[
              { label: 'Pendientes', count: stats.pendiente, total: stats.total, color: 'bg-amber-400' },
              { label: 'Pagadas',    count: stats.pagado,    total: stats.total, color: 'bg-emerald-500' },
              { label: 'Anuladas',   count: stats.anulado,   total: stats.total, color: 'bg-slate-300' },
            ].map(({ label, count, total, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-800">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: total ? `${(count / total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Resumen financiero</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Cobrado este mes</span>
              <span className="font-bold text-emerald-700">{formatCLP(stats.monto_mes)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Por cobrar (pendiente)</span>
              <span className="font-bold text-amber-600">{formatCLP(stats.monto_pendiente)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Total cobrado histórico</span>
              <span className="font-bold text-blue-700">{formatCLP(stats.monto_pagado)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guías recientes */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Guías Recientes</h2>
          <button className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:text-blue-700" onClick={() => onNavigate('historial')}>
            Ver todas <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recientes.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FilePlus2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay guías aún. ¡Crea la primera!</p>
            <button onClick={() => onNavigate('nueva-guia')} className="mt-4 btn-primary text-sm px-4 py-2">
              Crear primera guía
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recientes.map(g => {
              const dias = diasDesde(g.fecha);
              const esVencida = g.estado === 'pendiente' && dias > 30;
              return (
                <div key={g.id}
                  className="flex items-center px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onNavigate('nueva-guia', g.id)}>
                  <div className="w-28">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{g.numero_guia}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{g.empresa_flete}</p>
                    <p className="text-xs text-slate-500">{g.origen} → {g.destino}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-slate-900">{formatCLP(g.monto_total)}</p>
                    <p className="text-xs text-slate-400">{formatFecha(g.fecha)}</p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1">
                    <span className={`badge-${g.estado}`}>{g.estado}</span>
                    {esVencida && <span className="text-xs text-red-500 font-medium">{dias}d vencida</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, small }: { label: string; value: string; icon: React.ReactNode; color: string; small?: boolean }) {
  const bg: Record<string, string> = { blue: 'bg-blue-50', amber: 'bg-amber-50', emerald: 'bg-emerald-50', purple: 'bg-purple-50' };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`font-bold text-slate-900 mt-1 truncate ${small ? 'text-sm' : 'text-2xl'}`}>{value}</p>
        </div>
        <div className={`${bg[color]} p-2 rounded-lg shrink-0 ml-2`}>{icon}</div>
      </div>
    </div>
  );
}
