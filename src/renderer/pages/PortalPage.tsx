import React, { useEffect, useState } from 'react';
import { Truck, CheckCircle, Clock, XCircle, Download, FileText } from 'lucide-react';
import { formatCLP, formatFecha } from '../lib/format';
import type { Guia, CargoExtra } from '../../shared/types';

export default function PortalPage() {
  const token = window.location.pathname.split('/').pop() ?? '';
  const [guia, setGuia] = useState<Guia | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error)))
      .then(setGuia)
      .catch(e => setError(typeof e === 'string' ? e : 'No se pudo cargar la guía'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-500 text-sm">Cargando guía...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <XCircle className="w-14 h-14 text-red-400 mb-4" />
      <h1 className="text-xl font-bold text-slate-800 mb-2">Guía no disponible</h1>
      <p className="text-slate-500 text-sm">{error}</p>
    </div>
  );

  if (!guia) return null;

  const estadoIcon = guia.estado === 'pagado'
    ? <CheckCircle className="w-5 h-5 text-emerald-500" />
    : guia.estado === 'anulado'
    ? <XCircle className="w-5 h-5 text-red-500" />
    : <Clock className="w-5 h-5 text-amber-500" />;

  const cargos: CargoExtra[] = Array.isArray(guia.cargos_extra) ? guia.cargos_extra : [];

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="bg-blue-700 p-2 rounded-xl"><Truck className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-slate-800 text-lg">Guías Flete Chile</span>
          </div>
          <p className="text-slate-500 text-sm">Portal del receptor · Guía de despacho</p>
        </div>

        {/* Guía card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Número y estado */}
          <div className="bg-blue-700 px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide">Guía N°</p>
              <p className="text-white font-mono font-bold text-2xl">{guia.numero_guia}</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              {estadoIcon}
              <span className="text-white text-sm font-semibold capitalize">{guia.estado}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Datos básicos */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fecha" value={formatFecha(guia.fecha)} />
              <Field label="Patente vehículo" value={guia.patente || '—'} />
              <Field label="Origen" value={guia.origen} />
              <Field label="Destino" value={guia.destino} />
            </div>

            <hr className="border-slate-100" />

            {/* Empresa */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Empresa de flete</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Razón social" value={guia.empresa_flete} />
                <Field label="RUT empresa" value={guia.rut_empresa || '—'} />
                <Field label="Chofer" value={guia.nombre_chofer || '—'} />
                <Field label="RUT chofer" value={guia.rut_chofer || '—'} />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Carga */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Descripción de carga</p>
              <p className="text-slate-700 text-sm bg-slate-50 rounded-xl p-3">{guia.descripcion_carga || '—'}</p>
            </div>

            <hr className="border-slate-100" />

            {/* Montos */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Detalle de cobro</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Flete base</span>
                  <span className="font-medium">{formatCLP(guia.monto_base)}</span>
                </div>
                {cargos.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">{c.descripcion}</span>
                    <span className="font-medium">{formatCLP(c.monto)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-800">TOTAL</span>
                  <span className="text-blue-700">{formatCLP(guia.monto_total)}</span>
                </div>
              </div>
            </div>

            {guia.notas && (
              <>
                <hr className="border-slate-100" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notas</p>
                  <p className="text-slate-600 text-sm">{guia.notas}</p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Documento de control interno</span>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Imprimir / Guardar
            </button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Generado por Guías Flete Chile · guiasflete.cl
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-slate-800 font-medium text-sm">{value}</p>
    </div>
  );
}
