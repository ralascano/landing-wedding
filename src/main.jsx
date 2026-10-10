import { StrictMode } from 'react';
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App config={config} technicalConfig={technicalConfig} />
  </StrictMode>,
);
