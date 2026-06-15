import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import GuiaFormPage from './pages/GuiaFormPage';
import HistorialPage from './pages/HistorialPage';
import ViajesPage from './pages/ViajesPage';
import ConfigPage from './pages/ConfigPage';
import LoginPage from './pages/LoginPage';
import PricingPage from './pages/PricingPage';
import LandingPage from './pages/LandingPage';

export type Page = 'dashboard' | 'nueva-guia' | 'historial' | 'viajes' | 'config';

const IS_WEB = !(window as any).api;

function getInitialRoute(): 'landing' | 'login' | 'pricing' | 'app' {
  const path = window.location.pathname;
  if (path === '/pricing') return 'pricing';
  if (path === '/login')   return 'login';
  if (path === '/app')     return 'app';
  // Root '/' → landing si es web sin sesión
  if (IS_WEB && !localStorage.getItem('jwt_token')) return 'landing';
  return 'app';
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [editId, setEditId] = useState<number | null>(null);
  const [route, setRoute] = useState<'landing' | 'login' | 'pricing' | 'app'>(getInitialRoute);

  useEffect(() => {
    if (IS_WEB && route === 'app' && !localStorage.getItem('jwt_token')) {
      setRoute('landing');
    }
  }, [route]);

  function navigate(p: Page, id?: number) {
    setEditId(id ?? null);
    setPage(p);
  }

  function goTo(r: typeof route, path?: string) {
    setRoute(r);
    if (path) window.history.pushState({}, '', path);
  }

  if (IS_WEB && route === 'landing') {
    return (
      <LandingPage
        onLogin={() => goTo('login', '/login')}
        onRegister={() => goTo('login', '/login')}
      />
    );
  }

  if (IS_WEB && route === 'login') {
    return (
      <LoginPage
        onLogin={() => { goTo('app', '/app'); }}
      />
    );
  }

  if (IS_WEB && route === 'pricing') {
    return <PricingPage onNavigateApp={() => goTo('app', '/app')} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        currentPage={page}
        onNavigate={navigate}
        isWeb={IS_WEB}
        onPricing={() => goTo('pricing', '/pricing')}
        onLogout={() => {
          localStorage.removeItem('jwt_token');
          goTo('landing', '/');
        }}
      />
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
