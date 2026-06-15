import React, { useEffect, useState } from 'react';
import { Save, Building2, Hash } from 'lucide-react';
import type { AppConfig, Empresa } from '../../shared/types';
import { formatRut } from '../lib/format';

const EMPTY_EMPRESA: Empresa = { nombre: '', rut: '', direccion: '', telefono: '', email: '', giro: '' };

export default function ConfigPage() {
  const api = (window as any).api;
  const [empresa, setEmpresa] = useState<Empresa>(EMPTY_EMPRESA);
  const [prefijo, setPrefijo] = useState('G');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!api) return;
    api.config.get().then((c: AppConfig) => {
      setEmpresa(c.empresa_emisora || EMPTY_EMPRESA);
      setPrefijo(c.prefijo_guia || 'G');
    });
  }, []);

  async function handleSave() {
    if (!api) return;
    const current = await api.config.get();
    await api.config.save({ empresa_emisora: empresa, prefijo_guia: prefijo, ultimo_numero: current.ultimo_numero });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function setE<K extends keyof Empresa>(key: K, value: string) {
    setEmpresa(e => ({ ...e, [key]: value }));
  }

  return (
    <div className="p-6 fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500 text-sm">Datos de tu empresa emisora de guías</p>
      </div>

      {/* Empresa emisora */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" /> Empresa Emisora
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Razón Social / Nombre</label>
            <input className="input-field" value={empresa.nombre} onChange={e => setE('nombre', e.target.value)}
              placeholder="Transportes XYZ Ltda." />
          </div>
          <div>
            <label className="label">RUT</label>
            <input className="input-field" value={empresa.rut}
              onChange={e => setE('rut', formatRut(e.target.value))} placeholder="76.543.210-K" maxLength={12} />
          </div>
          <div>
            <label className="label">Giro</label>
            <input className="input-field" value={empresa.giro} onChange={e => setE('giro', e.target.value)}
              placeholder="Transporte de carga" />
          </div>
          <div className="col-span-2">
            <label className="label">Dirección</label>
            <input className="input-field" value={empresa.direccion} onChange={e => setE('direccion', e.target.value)}
              placeholder="Av. Los Libertadores 1234, Santiago" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input-field" value={empresa.telefono} onChange={e => setE('telefono', e.target.value)}
              placeholder="+56 9 1234 5678" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" value={empresa.email}
              onChange={e => setE('email', e.target.value)} placeholder="contacto@empresa.cl" />
          </div>
        </div>
      </div>

      {/* Numeración */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Hash className="w-4 h-4 text-blue-600" /> Numeración de Guías
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prefijo</label>
            <input className="input-field font-mono font-bold" value={prefijo}
              onChange={e => setPrefijo(e.target.value.toUpperCase().slice(0, 3))} placeholder="G" maxLength={3} />
            <p className="text-xs text-slate-400 mt-1">Ej: con prefijo "G" → G000001</p>
          </div>
          <div>
            <label className="label">Ejemplo siguiente guía</label>
            <p className="input-field font-mono font-bold text-blue-700 bg-blue-50">{prefijo}000001</p>
          </div>
        </div>
      </div>

      <button onClick={handleSave} className={`btn-primary ${saved ? '!bg-emerald-600' : ''}`}>
        <Save className="w-4 h-4" />
        {saved ? '¡Guardado correctamente!' : 'Guardar configuración'}
      </button>
    </div>
  );
}
