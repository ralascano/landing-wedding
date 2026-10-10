import { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { api } from '../services/firebase-client';

export default function QrEditor({ eventId }) {
  const host = useRef(null);
  const qr = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    api('getQr', { eventId })
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [eventId]);
  useEffect(() => {
    if (!data || !host.current) return;
    const code = new QRCodeStyling({
      width: 280,
      height: 280,
      type: 'svg',
      data: data.targetUrl,
      margin: 12,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: data.settings.color, type: data.settings.dots },
      backgroundOptions: { color: data.settings.background },
      image: data.settings.logo || undefined,
      imageOptions: { crossOrigin: 'anonymous', margin: 5, imageSize: 0.3 },
    });
    host.current.replaceChildren();
    code.append(host.current);
    qr.current = code;
    return () => {
      qr.current = null;
    };
  }, [data]);
  const change = (key, value) => {
    setSaved(false);
    setData({ ...data, settings: { ...data.settings, [key]: value } });
  };
  return (
    <section className="rq-card">
      <h3>QR del evento</h3>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>
            <a href={data.targetUrl} target="_blank" rel="noreferrer">
              {data.targetUrl}
            </a>
          </p>
          <div className="rq-fields">
            <label>
              Color
              <input
                type="color"
                value={data.settings.color}
                onChange={(e) => change('color', e.target.value)}
              />
            </label>
            <label>
              Fondo
              <input
                type="color"
                value={data.settings.background}
                onChange={(e) => change('background', e.target.value)}
              />
            </label>
            <label>
              Estilo
              <select value={data.settings.dots} onChange={(e) => change('dots', e.target.value)}>
                {['square', 'dots', 'rounded', 'classy'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Logotipo HTTPS (opcional)
              <input
                type="url"
                value={data.settings.logo || ''}
                onChange={(e) => change('logo', e.target.value)}
              />
            </label>
          </div>
          <div ref={host} className="rq-qr" />
          <p className="rq-muted">
            Usa contraste alto y prueba el QR impreso. El servidor del logotipo debe permitir CORS.
          </p>
          <button
            onClick={async () => {
              try {
                setError('');
                const r = await api('saveQr', { eventId, ...data.settings });
                setData(r);
                setSaved(true);
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Guardar QR
          </button>
          {['png', 'svg'].map((extension) => (
            <button
              className="rq-secondary"
              key={extension}
              onClick={async () => {
                try {
                  await qr.current.download({ name: `recuerdosqr-${eventId}`, extension });
                } catch (e) {
                  setError(`No se pudo descargar: ${e.message}`);
                }
              }}
            >
              Descargar {extension.toUpperCase()}
            </button>
          ))}
          {saved && <p role="status">QR guardado. Su URL permanece fija.</p>}
        </>
      )}
    </section>
  );
}
