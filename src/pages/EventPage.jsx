import { useEffect, useState } from 'react';
import App from '../App';
import { technicalConfig } from '../config/technical-config';
import { resolveEventAssets } from '../config/resolve-assets';
import { validateEventConfig } from '../config/validate-event-config';
import { api, ensureGuest, uploadEventPhotos } from '../services/firebase-client';
import Gallery from '../components/Gallery';
import './saas.css';

export default function EventPage({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [history, setHistory] = useState([]);
  async function load() {
    await ensureGuest();
    const result = await api('resolveEvent', { slug });
    result.event.config = resolveEventAssets(validateEventConfig(result.event.config));
    setData(result);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureGuest();
        const result = await api('resolveEvent', { slug });
        result.event.config = resolveEventAssets(validateEventConfig(result.event.config));
        if (active) setData(result);
      } catch (e) {
        if (active) setError(e.message);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);
  async function privacyAction(action) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const receipt = await api(action, {
        eventId: data.event.id,
        requestId: crypto.randomUUID(),
        accepted: true,
        revision: data.event.privacyRevision,
        documentIds: data.documents.map((d) => d.id),
      });
      setNotice(
        action === 'requestDeletion'
          ? `Solicitud ${receipt.id} registrada para revisión. No se han borrado fotografías.`
          : `Preferencia registrada. Referencia: ${receipt.id}`,
      );
      await load();
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="rq-page">
        <h1>RecuerdosQR</h1>
        <p role="status">{error || 'Abriendo evento…'}</p>
        <a href="/">Volver</a>
      </main>
    );
  const { event } = data;
  const config = {
    ...event.config,
    sections: {
      ...event.config.sections,
      upload: event.config.sections.upload && event.status === 'active' && data.accepted,
    },
  };
  return (
    <>
      {!data.accepted && (
        <a className="rq-privacy-link" href="#event-privacy">
          Revisa los documentos para habilitar tus fotografías
        </a>
      )}
      <App
        config={config}
        technicalConfig={technicalConfig}
        uploadFiles={async (files, name) => {
          await uploadEventPhotos(event.id, files, name);
          setRefresh((n) => n + 1);
        }}
      />
      <section id="event-privacy" className="rq-page rq-privacy" aria-label="Privacidad del evento">
        <h2>Antes de compartir tus fotos</h2>
        {event.status === 'closed' && <p>El evento está cerrado para nuevas fotografías.</p>}
        {error && (
          <p role="alert" className="rq-error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {data.documents.map((doc) => (
          <details key={doc.id} open={!data.accepted}>
            <summary>
              {doc.title} · versión {doc.version}
            </summary>
            <p>
              <strong>Finalidad:</strong> {doc.purpose}
            </p>
            <div className="rq-legal-body">{doc.body}</div>
            {!data.accepted && (
              <label className="rq-check">
                <input
                  type="checkbox"
                  checked={!!accepted[doc.id]}
                  onChange={(e) => setAccepted({ ...accepted, [doc.id]: e.target.checked })}
                />
                He leído y acepto este documento.
              </label>
            )}
          </details>
        ))}
        {!data.accepted ? (
          <button
            disabled={
              busy || !data.documents.length || !data.documents.every((d) => accepted[d.id])
            }
            onClick={() => privacyAction('acceptConsent')}
          >
            Aceptar y habilitar fotografías
          </button>
        ) : (
          <>
            <p>Tu aceptación de la versión vigente está registrada.</p>
            <button disabled={busy} onClick={() => privacyAction('withdrawConsent')}>
              Retirar mi consentimiento
            </button>
          </>
        )}
        <button
          className="rq-secondary"
          disabled={busy}
          onClick={() => privacyAction('requestDeletion')}
        >
          Solicitar eliminación de mis fotografías
        </button>
        <button
          className="rq-secondary"
          onClick={async () => {
            try {
              const r = await api('myConsents', { eventId: event.id });
              setHistory(r.items);
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Consultar mis registros
        </button>
        {history.map((item) => (
          <p key={item.id}>
            {item.kind} · {item.createdAt} · {item.id}
          </p>
        ))}
        <p className="rq-muted">
          Estas opciones se vinculan a la sesión de este navegador. Conserva el identificador de tus
          solicitudes para contactar al organizador.
        </p>
        {notice && <p className="rq-muted">Puedes consultar tus registros arriba.</p>}
      </section>
      {data.accepted && (
        <Gallery
          key={`${event.id}-${refresh}`}
          eventId={event.id}
          publicGallery={event.galleryEnabled}
        />
      )}
    </>
  );
}
