import React, { useEffect, useState } from 'react';
import { Check, Zap, Building2, Truck } from 'lucide-react';
import { webApi } from '../lib/webApi';

interface Props {
  onNavigateApp: () => void;
}

export default function PricingPage({ onNavigateApp }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [me, setMe] = useState<{ plan: string; guias_usadas: number; limite_mensual: number | null } | null>(null);

  useEffect(() => {
    if (webApi.auth.isLoggedIn()) webApi.billing.me().then(setMe).catch(() => {});
  }, []);

  async function handleCheckout(plan: 'pro' | 'business') {
    if (!webApi.auth.isLoggedIn()) { window.location.href = '/login'; return; }
    setLoading(plan);
    try {
      const { url } = await webApi.billing.checkout(plan);
      window.location.href = url;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-blue-700" />
          <span className="font-bold text-slate-900">Guías de Flete Chile</span>
        </div>
        <div className="flex gap-3">
          {webApi.auth.isLoggedIn() ? (
            <button onClick={onNavigateApp} className="text-sm font-medium text-blue-700 hover:underline">Ir a la app →</button>
          ) : (
            <a href="/login" className="text-sm font-medium text-blue-700 hover:underline">Iniciar sesión</a>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Planes simples y transparentes</h1>
          <p className="text-slate-500 text-lg">Sin sorpresas. Cancela cuando quieras.</p>
          {me && <p className="mt-2 text-sm text-blue-700 font-medium">Plan actual: <span className="uppercase">{me.plan}</span> — {me.guias_usadas}/{me.limite_mensual ?? '∞'} guías este mes</p>}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-slate-800 text-lg">Gratuito</h2>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">$0</span>
              <span className="text-slate-500 ml-1">/ mes</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-slate-600">
              {['10 guías por mes', 'Exportar PDF y Excel', '1 usuario', 'Soporte por email'].map(f => (
                <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />{f}</li>
              ))}
            </ul>
            {me?.plan === 'free' ? (
              <div className="w-full text-center py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-medium">Plan actual</div>
            ) : (
              <a href="/login" className="block w-full text-center py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Empezar gratis</a>
            )}
          </div>

          {/* Pro */}
          <div className="bg-blue-700 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">MÁS POPULAR</div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-blue-200" />
              <h2 className="font-bold text-white text-lg">Pro</h2>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">$9.990</span>
              <span className="text-blue-200 ml-1">CLP / mes</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-blue-100">
              {['Guías ilimitadas', 'Exportar PDF y Excel', '1 usuario', 'Historial completo', 'Soporte prioritario'].map(f => (
                <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-300" />{f}</li>
              ))}
            </ul>
            {me?.plan === 'pro' ? (
              <button onClick={() => webApi.billing.portal().then(r => window.location.href = r.url)} className="w-full py-2.5 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 transition-colors">
                Gestionar plan
              </button>
            ) : (
              <button onClick={() => handleCheckout('pro')} disabled={loading === 'pro'} className="w-full py-2.5 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 disabled:opacity-60 transition-colors">
                {loading === 'pro' ? 'Redirigiendo...' : 'Suscribirse a Pro'}
              </button>
            )}
          </div>

          {/* Business */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-slate-700" />
              <h2 className="font-bold text-slate-800 text-lg">Business</h2>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">$24.990</span>
              <span className="text-slate-500 ml-1">CLP / mes</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-slate-600">
              {['Todo de Pro', 'Hasta 5 usuarios', 'Reportes avanzados', 'Branding personalizado', 'Soporte telefónico'].map(f => (
                <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />{f}</li>
              ))}
            </ul>
            {me?.plan === 'business' ? (
              <button onClick={() => webApi.billing.portal().then(r => window.location.href = r.url)} className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                Gestionar plan
              </button>
            ) : (
              <button onClick={() => handleCheckout('business')} disabled={loading === 'business'} className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors">
                {loading === 'business' ? 'Redirigiendo...' : 'Suscribirse a Business'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-400 mt-10">Precios en CLP. Cobro mensual. Cancela en cualquier momento desde tu portal de cliente.</p>
      </main>
    </div>
  );
}
