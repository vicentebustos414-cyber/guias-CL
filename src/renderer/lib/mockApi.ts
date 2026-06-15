/**
 * Mock del API de Electron para preview web / desarrollo en browser.
 * Usa localStorage para persistir datos.
 */
import type { Guia, AppConfig, Viaje } from '../../shared/types';
import { hoy } from './format';

function load<T>(key: string, def: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return def; }
}
function save(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

const DEFAULT_CONFIG: AppConfig = {
  empresa_emisora: { nombre: 'Mi Empresa de Transportes', rut: '76.000.000-0', direccion: 'Av. Providencia 123, Santiago', telefono: '+56 9 1234 5678', email: 'contacto@empresa.cl', giro: 'Transporte de carga' },
  prefijo_guia: 'G',
  ultimo_numero: 3,
};

const SEED_GUIAS: Guia[] = [
  {
    id: 1, numero_guia: 'G000001', fecha: hoy(),
    origen: 'Santiago', destino: 'Concepción',
    empresa_flete: 'Chilexpress', rut_empresa: '76.354.771-K',
    nombre_chofer: 'Carlos Pérez González', rut_chofer: '12.345.678-9',
    patente: 'BBCD12', descripcion_carga: 'Mercadería general - pallets',
    monto_base: 180000, cargos_extra: [{ descripcion: 'Peaje autopista', monto: 12000 }, { descripcion: 'Seguro de carga', monto: 8000 }],
    monto_total: 200000, estado: 'pagado', notas: '', created_at: hoy(),
  },
  {
    id: 2, numero_guia: 'G000002', fecha: hoy(),
    origen: 'Valparaíso', destino: 'Temuco',
    empresa_flete: 'Starken', rut_empresa: '78.629.030-4',
    nombre_chofer: 'Jorge Muñoz Silva', rut_chofer: '15.678.901-2',
    patente: 'FGHJ34', descripcion_carga: 'Alimentos no perecederos',
    monto_base: 250000, cargos_extra: [{ descripcion: 'Espera en destino', monto: 25000 }],
    monto_total: 275000, estado: 'pendiente', notas: 'Entrega urgente antes de las 18:00', created_at: hoy(),
  },
  {
    id: 3, numero_guia: 'G000003', fecha: hoy(),
    origen: 'Antofagasta', destino: 'Santiago',
    empresa_flete: 'Trans Lo Espejo', rut_empresa: '77.123.456-3',
    nombre_chofer: 'Pedro Soto Ramos', rut_chofer: '9.876.543-1',
    patente: 'LMNO56', descripcion_carga: 'Minerales procesados - contenedor',
    monto_base: 520000, cargos_extra: [],
    monto_total: 520000, estado: 'pendiente', notas: '', created_at: hoy(),
  },
];

const SEED_VIAJES: Viaje[] = [
  { id: 1, fecha: hoy(), origen: 'Santiago', destino: 'Concepción', empresa: 'Chilexpress', nombre_chofer: 'Carlos Pérez González', patente: 'BBCD12', kilometros: 520, duracion_horas: 5.5, monto_cobrado: 200000, estado: 'realizado', numero_guia: 'G000001', notas: 'Sin inconvenientes', created_at: hoy() },
  { id: 2, fecha: hoy(), origen: 'Valparaíso', destino: 'Temuco', empresa: 'Starken', nombre_chofer: 'Jorge Muñoz Silva', patente: 'FGHJ34', kilometros: 680, duracion_horas: 7, monto_cobrado: 275000, estado: 'realizado', numero_guia: 'G000002', notas: '', created_at: hoy() },
  { id: 3, fecha: hoy(), origen: 'Antofagasta', destino: 'Santiago', empresa: 'Trans Lo Espejo', nombre_chofer: 'Pedro Soto Ramos', patente: 'LMNO56', kilometros: 1360, duracion_horas: 13, monto_cobrado: 520000, estado: 'pendiente', numero_guia: 'G000003', notas: 'Carga especial - cuidado con temperatura', created_at: hoy() },
  { id: 4, fecha: hoy(), origen: 'Temuco', destino: 'Puerto Montt', empresa: 'Blue Express', nombre_chofer: 'Carlos Pérez González', patente: 'BBCD12', kilometros: 340, duracion_horas: 4, monto_cobrado: 145000, estado: 'realizado', notas: '', created_at: hoy() },
];

function initSeed() {
  if (!localStorage.getItem('guias'))  save('guias',  SEED_GUIAS);
  if (!localStorage.getItem('viajes')) save('viajes', SEED_VIAJES);
  if (!localStorage.getItem('config')) save('config', DEFAULT_CONFIG);
}

initSeed();

export const mockApi = {
  guias: {
    list: async (filtro?: string): Promise<Guia[]> => {
      let data = load<Guia[]>('guias', []);
      if (filtro) {
        const q = filtro.toLowerCase();
        data = data.filter(g =>
          g.numero_guia.toLowerCase().includes(q) ||
          g.empresa_flete.toLowerCase().includes(q) ||
          g.origen.toLowerCase().includes(q) ||
          g.destino.toLowerCase().includes(q)
        );
      }
      return data.slice().reverse();
    },
    get: async (id: number): Promise<Guia | null> => {
      return load<Guia[]>('guias', []).find(g => g.id === id) ?? null;
    },
    create: async (guia: Guia): Promise<Guia> => {
      const data = load<Guia[]>('guias', []);
      const id = Math.max(0, ...data.map(g => g.id!)) + 1;
      const cfg = load<AppConfig>('config', DEFAULT_CONFIG);
      const match = guia.numero_guia.match(/(\d+)$/);
      if (match) cfg.ultimo_numero = Math.max(cfg.ultimo_numero, parseInt(match[1]));
      save('config', cfg);
      const newGuia = { ...guia, id, created_at: hoy() };
      save('guias', [...data, newGuia]);
      return newGuia;
    },
    update: async (guia: Guia): Promise<Guia> => {
      const data = load<Guia[]>('guias', []).map(g => g.id === guia.id ? guia : g);
      save('guias', data);
      return guia;
    },
    delete: async (id: number): Promise<boolean> => {
      save('guias', load<Guia[]>('guias', []).filter(g => g.id !== id));
      return true;
    },
    nextNumero: async (): Promise<string> => {
      const cfg = load<AppConfig>('config', DEFAULT_CONFIG);
      const next = cfg.ultimo_numero + 1;
      return `${cfg.prefijo_guia}${String(next).padStart(6, '0')}`;
    },
    exportPath: async (numeroGuia: string): Promise<string | null> => `Guia_${numeroGuia}.pdf`,
    savePdf: async (buf: number[], path: string): Promise<boolean> => {
      const blob = new Blob([new Uint8Array(buf)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = path.split(/[/\\]/).pop() || 'guia.pdf';
      a.click();
      URL.revokeObjectURL(url);
      return true;
    },
  },
  viajes: {
    list: async (filtro?: string): Promise<Viaje[]> => {
      let data = load<Viaje[]>('viajes', []);
      if (filtro) {
        const q = filtro.toLowerCase();
        data = data.filter(v =>
          v.empresa.toLowerCase().includes(q) ||
          v.origen.toLowerCase().includes(q) ||
          v.destino.toLowerCase().includes(q) ||
          v.nombre_chofer.toLowerCase().includes(q) ||
          (v.patente || '').toLowerCase().includes(q)
        );
      }
      return data.slice().reverse();
    },
    get: async (id: number): Promise<Viaje | null> => {
      return load<Viaje[]>('viajes', []).find(v => v.id === id) ?? null;
    },
    create: async (v: Viaje): Promise<Viaje> => {
      const data = load<Viaje[]>('viajes', []);
      const id = Math.max(0, ...data.map(x => x.id!)) + 1;
      const newViaje = { ...v, id, created_at: hoy() };
      save('viajes', [...data, newViaje]);
      return newViaje;
    },
    update: async (v: Viaje): Promise<Viaje> => {
      save('viajes', load<Viaje[]>('viajes', []).map(x => x.id === v.id ? v : x));
      return v;
    },
    delete: async (id: number): Promise<boolean> => {
      save('viajes', load<Viaje[]>('viajes', []).filter(v => v.id !== id));
      return true;
    },
  },
  config: {
    get: async (): Promise<AppConfig> => load<AppConfig>('config', DEFAULT_CONFIG),
    save: async (cfg: AppConfig): Promise<boolean> => { save('config', cfg); return true; },
  },
};
