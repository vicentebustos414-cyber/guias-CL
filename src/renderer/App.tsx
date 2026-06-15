import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import GuiaFormPage from './pages/GuiaFormPage';
import HistorialPage from './pages/HistorialPage';
import ViajesPage from './pages/ViajesPage';
import ConfigPage from './pages/ConfigPage';
import LoginPage from './pages/LoginPage';
import PricingPage from './pages/PricingPage';

export type Page = 'dashboard' | 'nueva-guia' | 'historial' | 'viajes' | 'config';

const IS_WEB = !(window as any).api;

function getInitialRoute() {
  const path = window.location.pathname;
  if (path === '/pricing') return 'pricing';
  if (path === '/login') return 'login';
  return 'app';
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [editId, setEditId] = useState<number | null>(null);
  const [route, setRoute] = useState(getInitialRoute);
  const [authed, setAuthed] = useState(!IS_WEB || !!localStorage.getItem('jwt_token'));

  useEffect(() => {
    if (IS_WEB && !authed && route === 'app') setRoute('login');
  }, [authed, route]);

  function navigate(p: Page, id?: number) {
    setEditId(id ?? null);
    setPage(p);
  }

  if (IS_WEB && route === 'login') {
    return <LoginPage onLogin={() => { setAuthed(true); setRoute('app'); window.history.replaceState({}, '', '/app'); }} />;
  }

  if (IS_WEB && route === 'pricing') {
    return <PricingPage onNavigateApp={() => setRoute('app')} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={page} onNavigate={navigate} isWeb={IS_WEB} onPricing={() => setRoute('pricing')} onLogout={() => { localStorage.removeItem('jwt_token'); setAuthed(false); setRoute('login'); }} />
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard'  && <DashboardPage onNavigate={navigate} />}
        {page === 'nueva-guia' && <GuiaFormPage editId={editId} onNavigate={navigate} />}
        {page === 'historial'  && <HistorialPage onNavigate={navigate} />}
        {page === 'viajes'     && <ViajesPage />}
        {page === 'config'     && <ConfigPage />}
      </main>
    </div>
  );
}
