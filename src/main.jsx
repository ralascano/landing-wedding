import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import localEventConfig from './config/event-config.json';
import { resolveEventAssets } from './config/resolve-assets';
import { technicalConfig } from './config/technical-config';
import { validateEventConfig } from './config/validate-event-config';

// Local source today; a future API can supply the same serializable contract.
const config = resolveEventAssets(validateEventConfig(localEventConfig));
const AdminApp = lazy(() => import('./pages/AdminApp'));
const EventPage = lazy(() => import('./pages/EventPage'));
const path = window.location.pathname;
const match = path.match(/^\/e\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
const page =
  path === '/admin' || path.startsWith('/admin/') ? (
    <AdminApp />
  ) : match ? (
    <EventPage slug={match[1]} />
  ) : path === '/' ? (
    <App config={config} technicalConfig={technicalConfig} />
  ) : (
    <main>
      <h1>Página no encontrada</h1>
      <a href="/">Volver al inicio</a>
    </main>
  );

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Cargando…</p>}>{page}</Suspense>
  </StrictMode>,
);
