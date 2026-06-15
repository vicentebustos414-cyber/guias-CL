/**
 * API client para la versión web (Render). Reemplaza mockApi en producción web.
 * Usa JWT almacenado en localStorage para autenticación.
 */
import type { Guia, AppConfig, Viaje } from '../../shared/types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('jwt_token');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('jwt_token');
    window.location.href = '/login';
    throw new Error('No autorizado');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

export const webApi = {
  guias: {
    list: (filtro?: string) =>
      request<Guia[]>('GET', `/guias${filtro ? `?filtro=${encodeURIComponent(filtro)}` : ''}`),
    get: (id: number) => request<Guia>('GET', `/guias/${id}`),
    create: (guia: Guia) => request<Guia>('POST', '/guias', guia),
    update: (guia: Guia) => request<Guia>('PUT', `/guias/${guia.id}`, guia),
    delete: (id: number) => request<{ ok: boolean }>('DELETE', `/guias/${id}`),
    nextNumero: () => request<{ numero: string }>('GET', '/guias/meta/next-numero').then(r => r.numero),
    exportPath: (numeroGuia: string) => Promise.resolve(`Guia_${numeroGuia}.pdf`),
    savePdf: async (buf: number[], fileName: string): Promise<boolean> => {
      const blob = new Blob([new Uint8Array(buf)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.split(/[/\\]/).pop() || 'guia.pdf';
      a.click();
      URL.revokeObjectURL(url);
      return true;
    },
  },
  viajes: {
    list: (filtro?: string) =>
      request<Viaje[]>('GET', `/viajes${filtro ? `?filtro=${encodeURIComponent(filtro)}` : ''}`),
    get: (id: number) => request<Viaje>('GET', `/viajes/${id}`),
    create: (v: Viaje) => request<Viaje>('POST', '/viajes', v),
    update: (v: Viaje) => request<Viaje>('PUT', `/viajes/${v.id}`, v),
    delete: (id: number) => request<{ ok: boolean }>('DELETE', `/viajes/${id}`),
  },
  config: {
    get: () => request<AppConfig>('GET', '/config'),
    save: (cfg: AppConfig) => request<{ ok: boolean }>('PUT', '/config', cfg),
  },
  billing: {
    me: () => request<{ plan: string; email: string; guias_usadas: number; limite_mensual: number | null }>('GET', '/billing/me'),
    checkout: (plan: 'pro' | 'business') => request<{ url: string }>('POST', '/billing/checkout', { plan }),
    portal: () => request<{ url: string }>('POST', '/billing/portal'),
    plans: () => fetch('/api/billing/plans').then(r => r.json()),
  },
  auth: {
    login: (email: string, password: string) =>
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        localStorage.setItem('jwt_token', data.token);
        return data as { token: string; plan: string; email: string };
      }),
    register: (email: string, password: string, empresa_nombre: string) =>
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, empresa_nombre }),
      }).then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        localStorage.setItem('jwt_token', data.token);
        return data as { token: string; plan: string; email: string };
      }),
    logout: () => { localStorage.removeItem('jwt_token'); window.location.href = '/login'; },
    isLoggedIn: () => !!getToken(),
  },
};
