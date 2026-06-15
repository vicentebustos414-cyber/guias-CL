import React from 'react';
import { LayoutDashboard, FilePlus2, ClipboardList, Settings, Truck, Route, LogOut, Zap } from 'lucide-react';
import type { Page } from '../App';

interface Props {
  currentPage: Page;
  onNavigate: (p: Page) => void;
  isWeb?: boolean;
  onPricing?: () => void;
  onLogout?: () => void;
}

const items = [
  { id: 'dashboard' as Page,   label: 'Inicio',        icon: LayoutDashboard },
  { id: 'nueva-guia' as Page,  label: 'Nueva Guía',    icon: FilePlus2 },
  { id: 'historial' as Page,   label: 'Historial',     icon: ClipboardList },
  { id: 'viajes' as Page,      label: 'Mis Viajes',    icon: Route },
  { id: 'config' as Page,      label: 'Configuración', icon: Settings },
];

export default function Sidebar({ currentPage, onNavigate, isWeb, onPricing, onLogout }: Props) {
  return (
    <aside className="w-56 bg-slate-900 flex flex-col shrink-0 h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Guías Flete</p>
          <p className="text-slate-400 text-xs">Chile</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-2">
        {isWeb && onPricing && (
          <button
            onClick={onPricing}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-yellow-400 hover:bg-slate-800 transition-colors"
          >
            <Zap className="w-4 h-4 shrink-0" />
            Ver planes
          </button>
        )}
        {isWeb && onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        )}
        <div className="px-1 pt-1 border-t border-slate-700">
          <p className="text-slate-500 text-xs text-center">v1.0.0 · Peso Chileno</p>
        </div>
      </div>
    </aside>
  );
}
