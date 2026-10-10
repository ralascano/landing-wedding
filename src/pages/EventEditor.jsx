import { useState } from 'react';
import initialConfig from '../config/event-config.json';
import { api } from '../services/firebase-client';
import QrEditor from '../components/QrEditor';
import Gallery from '../components/Gallery';
import { validateEventConfig } from '../config/validate-event-config';

export default function EventEditor({ event, customers, legal, onSaved, run }) {
  const [eventId] = useState(event?.id || crypto.randomUUID());
  const [config, setConfig] = useState(structuredClone(event?.config || initialConfig));
  const [json, setJson] = useState('');
  const [legalIds, setLegalIds] = useState(event?.legalDocumentIds || []);
  const update = (block, key, value) =>
    setConfig((c) => ({ ...c, [block]: { ...c[block], [key]: value } }));
  const theme = (key, value) =>
    setConfig((c) => ({
      ...c,
      theme: { ...c.theme, variables: { ...c.theme.variables, [key]: value } },
    }));
  return (
    <>
      <form
        className="rq-card"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(async () => {
            await api('saveEvent', {
              id: eventId,
              version: event?.version,
              customerId: f.get('customerId'),
              slug: f.get('slug'),
              plan: f.get('plan'),
              galleryEnabled: f.get('galleryEnabled') === 'on',
              maxPhotos: Number(f.get('maxPhotos')),
              maxBytes: Number(f.get('maxMB')) * 1048576,
              config,
            });
            await onSaved(eventId);
          });
        }}
      >
        <h2>{event ? 'Configurar evento' : 'Crear evento'}</h2>
        <div className="rq-fields">
          <label>
            Cliente
            <select name="customerId" required defaultValue={event?.customerId || ''}>
              <option value="" disabled>
                Selecciona un cliente
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            URL permanente /e/
            <input
              name="slug"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              readOnly={!!event}
              defaultValue={event?.slug || ''}
              placeholder="maria-xv-2026"
            />
          </label>
          <label>
            Plan
            <select name="plan" defaultValue={event?.plan || 'basic'}>
              <option value="basic">Básico · $39,99</option>
              <option value="premium">Premium · cotización</option>
            </select>
          </label>
          <label>
            Tipo
            <input
              value={config.event.type}
              onChange={(e) => update('event', 'type', e.target.value)}
              required
            />
          </label>
          <label>
            Título
            <input
              value={config.event.title}
              onChange={(e) => update('event', 'title', e.target.value)}
              required
            />
          </label>
          <label>
            Nombres (separados por coma)
            <input
              value={config.event.names.join(',')}
              onChange={(e) => update('event', 'names', e.target.value.split(','))}
              required
            />
          </label>
          <label>
            Fecha
            <input
              type="date"
              value={config.event.date || ''}
              onChange={(e) => update('event', 'date', e.target.value || null)}
            />
          </label>
          <label>
            Fecha visible
            <input
              value={config.event.dateLabel || ''}
              onChange={(e) => update('event', 'dateLabel', e.target.value || null)}
            />
          </label>
          <label>
            Fondo escritorio
            <input
              value={config.images.backgroundDesktop}
              onChange={(e) => update('images', 'backgroundDesktop', e.target.value)}
              required
            />
          </label>
          <label>
            Fondo móvil
            <input
              value={config.images.backgroundMobile || ''}
              onChange={(e) => update('images', 'backgroundMobile', e.target.value || null)}
            />
          </label>
          <label>
            Color principal
            <input
              value={config.theme.variables['--event-primary'] || '#853ac0'}
              onChange={(e) => theme('--event-primary', e.target.value)}
            />
          </label>
          <label>
            Acento
            <input
              value={config.theme.variables['--event-accent'] || '#df4dab'}
              onChange={(e) => theme('--event-accent', e.target.value)}
            />
          </label>
          <label>
            Color texto
            <input
              value={config.theme.variables['--event-text']}
              onChange={(e) => theme('--event-text', e.target.value)}
            />
          </label>
          <label>
            Superficie formulario
            <input
              value={config.theme.variables['--event-panel-active']}
              onChange={(e) => theme('--event-panel-active', e.target.value)}
            />
          </label>
          <label>
            Identidad
            <select
              value={config.templateOptions.identityPosition}
              onChange={(e) => update('templateOptions', 'identityPosition', e.target.value)}
            >
              {['top-left', 'top-center', 'top-right'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Formulario
            <select
              value={config.templateOptions.formPosition}
              onChange={(e) => update('templateOptions', 'formPosition', e.target.value)}
            >
              {['bottom-left', 'bottom-center', 'bottom-right'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Cuota de fotos
            <input
              name="maxPhotos"
              type="number"
              min="1"
              max="10000"
              defaultValue={event?.maxPhotos || 1000}
              required
            />
          </label>
          <label>
            Cuota MB
            <input
              name="maxMB"
              type="number"
              min="1"
              max="10240"
              defaultValue={(event?.maxBytes || 1073741824) / 1048576}
              required
            />
          </label>
        </div>
        <label className="rq-check">
          <input
            name="galleryEnabled"
            type="checkbox"
            defaultChecked={event?.galleryEnabled ?? true}
          />
          Galería accesible a invitados con el enlace y consentimiento vigente
        </label>
        <fieldset>
          <legend>Secciones</legend>
          {Object.entries(config.sections).map(([key, value]) => (
            <label className="rq-check" key={key}>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => update('sections', key, e.target.checked)}
              />
              {key}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Textos del formulario</legend>
          {Object.entries(config.texts.upload).map(([key, value]) => (
            <label key={key}>
              {key}
              <input
                value={value}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    texts: { ...c.texts, upload: { ...c.texts.upload, [key]: e.target.value } },
                  }))
                }
              />
            </label>
          ))}
        </fieldset>
        <details>
          <summary>Contrato JSON completo / plantilla premium registrada</summary>
          <p>
            La plantilla premium requiere código registrado manualmente para este evento en frontend
            y backend.
          </p>
          <button type="button" onClick={() => setJson(JSON.stringify(config, null, 2))}>
            Copiar configuración al editor
          </button>
          <textarea
            aria-label="Configuración JSON"
            rows="18"
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
          <button
            type="button"
            onClick={() =>
              run(async () => {
                const parsed = JSON.parse(json);
                if (
                  !parsed.event ||
                  !parsed.texts?.upload ||
                  !parsed.theme?.variables ||
                  !parsed.images ||
                  !parsed.templateOptions ||
                  !parsed.sections
                )
                  throw new Error('Faltan bloques del contrato.');
                setConfig(validateEventConfig(parsed));
              })
            }
          >
            Aplicar JSON al formulario
          </button>
        </details>
        <button type="submit" disabled={!customers.length}>
          Guardar evento
        </button>
      </form>
      {event && (
        <>
          <section className="rq-card">
            <h3>Estado: {event.status}</h3>
            <p>
              URL:{' '}
              <a href={`/e/${event.slug}`} target="_blank" rel="noreferrer">
                /e/{event.slug}
              </a>
            </p>
            <p>
              Reservas: {event.reservedPhotos} fotos · {(event.reservedBytes / 1048576).toFixed(1)}{' '}
              MB
            </p>
            {{
              draft: ['active'],
              active: ['closed'],
              closed: ['active', 'finished'],
              finished: [],
            }[event.status].map((status) => (
              <button
                key={status}
                onClick={() =>
                  run(async () => {
                    await api('changeState', { eventId: event.id, version: event.version, status });
                    await onSaved(event.id);
                  })
                }
              >
                {status === 'active'
                  ? 'Activar'
                  : status === 'closed'
                    ? 'Cerrar cargas'
                    : 'Finalizar'}
              </button>
            ))}
            <h3>Documentos legales requeridos</h3>
            <p>
              Selecciona versiones revisadas. Para cambiarlas, el evento debe estar en borrador o
              cerrado.
            </p>
            {legal.map((d) => (
              <label key={d.id} className="rq-check">
                <input
                  type="checkbox"
                  checked={legalIds.includes(d.id)}
                  onChange={(e) =>
                    setLegalIds(
                      e.target.checked ? [...legalIds, d.id] : legalIds.filter((x) => x !== d.id),
                    )
                  }
                />
                {d.title} · {d.version}
              </label>
            ))}
            <button
              onClick={() =>
                run(async () => {
                  await api('setPrivacy', {
                    eventId: event.id,
                    version: event.version,
                    documentIds: legalIds,
                  });
                  await onSaved(event.id);
                })
              }
            >
              Guardar requisitos legales
            </button>
          </section>
          <QrEditor eventId={event.id} />
          <Gallery eventId={event.id} />
        </>
      )}
    </>
  );
}
