import React, { useEffect, useState } from 'react';
import { FilePlus2, TrendingUp, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import type { Page } from '../App';
import type { Guia } from '../../shared/types';
import { formatCLP, formatFecha } from '../lib/format';

interface Props { onNavigate: (p: Page, id?: number) => void; }

interface Stats {
  total: number;
  pendiente: number;
  pagado: number;
  anulado: number;
  monto_mes: number;
}

export default function DashboardPage({ onNavigate }: Props) {
  const api = (window as any).api;
  const [guias, setGuias] = useState<Guia[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pendiente: 0, pagado: 0, anulado: 0, monto_mes: 0 });

  useEffect(() => {
    if (!api) return;
    api.guias.list().then((data: Guia[]) => {
      setGuias(data);
      const hoy = new Date();
      const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      setStats({
        total:     data.length,
        pendiente: data.filter(g => g.estado === 'pendiente').length,
        pagado:    data.filter(g => g.estado === 'pagado').length,
        anulado:   data.filter(g => g.estado === 'anulado').length,
        monto_mes: data.filter(g => g.fecha.startsWith(mesActual)).reduce((s, g) => s + g.monto_total, 0),
      });
    });
  }, []);

  const recientes = guias.slice(0, 6);

  return (
    <div className="p-6 fade-in">
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

      {/* Tarjetas estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Guías" value={String(stats.total)} icon={<TrendingUp className="w-5 h-5 text-blue-600"/>} color="blue" />
        <StatCard label="Pendientes"  value={String(stats.pendiente)} icon={<Clock className="w-5 h-5 text-amber-600"/>} color="amber" />
        <StatCard label="Pagadas"     value={String(stats.pagado)}    icon={<CheckCircle2 className="w-5 h-5 text-emerald-600"/>} color="emerald" />
        <StatCard label="Monto del Mes" value={formatCLP(stats.monto_mes)} icon={<TrendingUp className="w-5 h-5 text-purple-600"/>} color="purple" small />
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
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recientes.map(g => (
              <div key={g.id} className="flex items-center px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => onNavigate('nueva-guia', g.id)}>
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
                <div className="ml-4">
                  <span className={`badge-${g.estado}`}>{g.estado}</span>
                </div>
              </div>
            ))}
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
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`font-bold text-slate-900 mt-1 ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
        </div>
        <div className={`${bg[color]} p-2 rounded-lg`}>{icon}</div>
      </div>
    </div>
  );
}
