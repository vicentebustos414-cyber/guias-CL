import React, { useState } from 'react';
import { Truck, Check, ChevronRight, FileText, BarChart2, Shield, Zap, Download, Star, Menu, X } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function LandingPage({ onLogin, onRegister }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="bg-blue-700 p-1.5 rounded-lg"><Truck className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-slate-900 text-lg">Guías Flete Chile</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#funciones" className="text-sm text-slate-600 hover:text-blue-700 font-medium">Funciones</a>
            <a href="#precios" className="text-sm text-slate-600 hover:text-blue-700 font-medium">Precios</a>
            <a href="#faq" className="text-sm text-slate-600 hover:text-blue-700 font-medium">FAQ</a>
            <button onClick={onLogin} className="text-sm text-slate-700 font-medium hover:text-blue-700">Iniciar sesión</button>
            <button onClick={onRegister} className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-800 transition-colors">
              Empezar gratis
            </button>
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 px-4 py-4 space-y-3 bg-white">
            <a href="#funciones" className="block text-sm font-medium text-slate-700">Funciones</a>
            <a href="#precios" className="block text-sm font-medium text-slate-700">Precios</a>
            <button onClick={onLogin} className="block w-full text-left text-sm font-medium text-slate-700">Iniciar sesión</button>
            <button onClick={onRegister} className="w-full bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">Empezar gratis</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/40 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm font-medium text-blue-100 mb-6">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            El sistema N°1 de guías de flete en Chile
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Olvídate del Excel.<br />
            <span className="text-yellow-400">Digitaliza tus guías de flete</span><br />
            en minutos.
          </h1>
          <p className="text-blue-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Crea, administra y exporta guías de despacho profesionales con PDF y Excel.
            Para transportistas y empresas chilenas. Sin complicaciones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={onRegister}
              className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold px-8 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2">
              Crear cuenta gratis <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={onLogin}
              className="border border-blue-400 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors">
              Ya tengo cuenta
            </button>
          </div>
          <p className="text-blue-300 text-sm mt-4">✓ 30 guías gratis al mes · ✓ Sin tarjeta de crédito · ✓ Cancela cuando quieras</p>
        </div>
      </section>

      {/* STATS RÁPIDAS */}
      <section className="bg-slate-900 text-white py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: '30', label: 'Guías gratis / mes' },
            { n: '< 2 min', label: 'Para crear una guía' },
            { n: 'PDF + Excel', label: 'Exportación incluida' },
            { n: '100% Web', label: 'Sin instalar nada' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-yellow-400">{s.n}</p>
              <p className="text-slate-300 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FUNCIONES */}
      <section id="funciones" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Todo lo que necesitas para gestionar tus fletes</h2>
            <p className="text-slate-500 text-lg">Diseñado específicamente para el mercado chileno</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FileText, color: 'blue', title: 'Guías profesionales', desc: 'Crea guías de flete con todos los campos requeridos: RUT, patente, origen/destino, cargos extra y más.' },
              { icon: Download, color: 'emerald', title: 'PDF y Excel con un clic', desc: 'Exporta cada guía en PDF profesional para enviar al cliente, o en Excel para tu contabilidad.' },
              { icon: BarChart2, color: 'purple', title: 'Dashboard de control', desc: 'Ve tus pendientes, montos cobrados del mes y el historial completo de guías y viajes.' },
              { icon: Shield, color: 'red', title: 'RUT validado', desc: 'Validación automática del dígito verificador del RUT chileno en todos los formularios.' },
              { icon: Zap, color: 'amber', title: 'Rápido y sin papel', desc: 'Crea una guía completa en menos de 2 minutos. Accede desde cualquier computador o celular.' },
              { icon: Truck, color: 'slate', title: 'Registro de viajes', desc: 'Lleva un historial de todos tus viajes con km, horas y montos cobrados por cada trayecto.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-${color}-100 mb-4`}>
                  <Icon className={`w-5 h-5 text-${color}-700`} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Precios simples y transparentes</h2>
            <p className="text-slate-500 text-lg">Sin letra chica. Cancela cuando quieras.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <h3 className="font-bold text-slate-800 text-lg mb-1">Gratuito</h3>
              <div className="mb-5"><span className="text-4xl font-extrabold text-slate-900">$0</span><span className="text-slate-400 ml-1 text-sm">/ mes</span></div>
              <ul className="space-y-3 mb-8 text-sm text-slate-600">
                {['30 guías por mes', 'PDF y Excel incluido', '1 usuario', 'Registro de viajes'].map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />{f}</li>
                ))}
              </ul>
              <button onClick={onRegister} className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Empezar gratis
              </button>
            </div>
            {/* Pro */}
            <div className="bg-blue-700 rounded-2xl p-7 relative shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">MÁS POPULAR</div>
              <h3 className="font-bold text-white text-lg mb-1">Pro</h3>
              <div className="mb-5"><span className="text-4xl font-extrabold text-white">$9.990</span><span className="text-blue-200 ml-1 text-sm">CLP / mes</span></div>
              <ul className="space-y-3 mb-8 text-sm text-blue-100">
                {['Guías ilimitadas', 'PDF y Excel ilimitado', '1 usuario', 'Historial completo', 'Soporte prioritario'].map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-300 shrink-0" />{f}</li>
                ))}
              </ul>
              <button onClick={onRegister} className="w-full py-2.5 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 transition-colors">
                Empezar con Pro
              </button>
            </div>
            {/* Business */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7">
              <h3 className="font-bold text-slate-800 text-lg mb-1">Business</h3>
              <div className="mb-5"><span className="text-4xl font-extrabold text-slate-900">$24.990</span><span className="text-slate-400 ml-1 text-sm">CLP / mes</span></div>
              <ul className="space-y-3 mb-8 text-sm text-slate-600">
                {['Todo de Pro', 'Hasta 5 usuarios', 'Reportes avanzados', 'Branding personalizado', 'Soporte telefónico'].map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />{f}</li>
                ))}
              </ul>
              <button onClick={onRegister} className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Empezar con Business
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-12">Preguntas frecuentes</h2>
          <div className="space-y-6">
            {[
              { q: '¿Necesito instalar algo?', a: 'No. Guías Flete Chile funciona 100% en el navegador. Entra desde cualquier computador, tablet o celular.' },
              { q: '¿Mis datos están seguros?', a: 'Sí. Toda la información se guarda en servidores seguros con cifrado. Nadie más puede acceder a tus guías.' },
              { q: '¿Qué pasa si supero las 30 guías del plan gratis?', a: 'El sistema te avisará y podrás actualizar a Pro en cualquier momento. Tus guías existentes no se borran.' },
              { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, sin multas ni permanencia mínima. Cancelas desde tu portal de cliente con un clic.' },
              { q: '¿Los PDFs son legales en Chile?', a: 'Las guías generadas sirven como respaldo interno. Para documentos tributarios oficiales (DTE), se requiere el SII — una integración que estamos desarrollando.' },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-slate-100 pb-6">
                <h3 className="font-semibold text-slate-900 mb-2">{q}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-blue-700 py-16 px-4 text-center text-white">
        <h2 className="text-3xl font-extrabold mb-4">¿Listo para digitalizar tus fletes?</h2>
        <p className="text-blue-100 mb-8 text-lg">Empieza gratis hoy. Sin tarjeta de crédito.</p>
        <button onClick={onRegister} className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold px-10 py-3.5 rounded-xl text-base transition-colors inline-flex items-center gap-2">
          Crear cuenta gratis <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Truck className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-white">Guías Flete Chile</span>
        </div>
        <p>Sistema profesional de guías de despacho para empresas de transporte en Chile.</p>
        <p className="mt-1">© {new Date().getFullYear()} Guías Flete Chile · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
