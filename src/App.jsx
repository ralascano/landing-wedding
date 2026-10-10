import './App.css';
import { useLayoutEffect } from 'react';
import UploadPhotos from './components/UploadPhotos';

function App({ config, technicalConfig }) {
  useLayoutEffect(() => {
    // Root scope also reaches Reactstrap's modal portal under document.body.
    const root = document.documentElement;
    const previousVariables = Object.keys(config.theme.variables).map((name) => [
      name,
      root.style.getPropertyValue(name),
    ]);
    for (const [name, value] of Object.entries(config.theme.variables)) {
      root.style.setProperty(name, value);
    }
    const previousTitle = document.title;
    const previousLanguage = root.lang;
    const favicon = document.querySelector('link[rel="icon"]');
    const previousFavicon = favicon?.getAttribute('href');
    document.title = config.metadata.title;
    root.lang = config.event.locale;
    favicon?.setAttribute('href', config.metadata.favicon);

    return () => {
      for (const [name, value] of previousVariables) {
        if (value) root.style.setProperty(name, value);
        else root.style.removeProperty(name);
      }
      document.title = previousTitle;
      root.lang = previousLanguage;
      if (previousFavicon !== null && previousFavicon !== undefined) {
        favicon?.setAttribute('href', previousFavicon);
      }
    };
  }, [config]);

  // A single explicit choice today; no registry or plugin system needed.
  if (config.template !== 'photo-hero') {
    throw new Error(`Unsupported template: ${config.template}`);
  }
  return <UploadPhotos config={config} technicalConfig={technicalConfig} />;
}

export default App;
