import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// In Electron: window.api is injected by preload.ts
// In web (Render): use webApi backed by real HTTP API
if (!(window as any).api) {
  // Lazy import to avoid bundling Electron-only code paths
  import('./lib/webApi').then(({ webApi }) => {
    (window as any).api = webApi;
    renderApp();
  });
} else {
  renderApp();
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
