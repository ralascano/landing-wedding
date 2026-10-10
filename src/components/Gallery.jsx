import { useEffect, useState } from 'react';
import { api, downloadPhoto } from '../services/firebase-client';

function Photo({ item }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    downloadPhoto(item.id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id]);
  return src ? (
    <a href={src} download={`${item.id}.${item.contentType.split('/')[1]}`}>
      <img src={src} alt="Fotografía compartida en el evento" loading="lazy" />
    </a>
  ) : (
    <span>{error || 'Cargando foto…'}</span>
  );
}
export default function Gallery({ eventId, publicGallery = true }) {
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState(!publicGallery);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setItems([]);
    api('listMedia', { eventId, mine })
      .then((r) => {
        if (active) {
          setItems(r.items);
          setNext(r.next);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [eventId, mine]);
  return (
    <section className="rq-page">
      <h2>{mine ? 'Mis fotografías' : 'Galería del evento'}</h2>
      {publicGallery && (
        <label className="rq-check">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Mostrar solo mis fotos
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      {!items.length && <p>{busy ? 'Cargando…' : 'Todavía no hay fotos disponibles.'}</p>}
      <div className="rq-gallery">
        {items.map((item) => (
          <Photo key={item.id} item={item} />
        ))}
      </div>
      {next && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api('listMedia', { eventId, mine, after: next });
              setItems((old) => [...old, ...r.items]);
              setNext(r.next);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Cargar más
        </button>
      )}
    </section>
  );
}
