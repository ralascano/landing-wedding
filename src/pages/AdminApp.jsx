import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { api, getClient } from '../services/firebase-client';
import EventEditor from './EventEditor';
import './saas.css';

const money = (cents) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(cents / 100);
export default function AdminApp() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [records, setRecords] = useState({
    customers: [],
    events: [],
    orders: [],
    legal_documents: [],
    users: [],
    audit_logs: [],
  });
  const [cursors, setCursors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [consents, setConsents] = useState([]);
  const [consentEvent, setConsentEvent] = useState('');
  const [consentNext, setConsentNext] = useState(null);
  const [notice, setNotice] = useState('');
  async function loadCollection(collection, after) {
    const r = await api('listRecords', { collection, after });
    setRecords((old) => ({
      ...old,
      [collection]: after ? [...old[collection], ...r.items] : r.items,
    }));
    setCursors((old) => ({ ...old, [collection]: r.next }));
    return r.items;
  }
  const refresh = useCallback(async () => {
    const results = await Promise.all(
      ['customers', 'events', 'orders', 'legal_documents'].map((c) =>
        api('listRecords', { collection: c }),
      ),
    );
    const keys = ['customers', 'events', 'orders', 'legal_documents'];
    setRecords((old) => ({
      ...old,
      ...Object.fromEntries(keys.map((key, i) => [key, results[i].items])),
    }));
    setCursors((old) => ({
      ...old,
      ...Object.fromEntries(keys.map((key, i) => [key, results[i].next])),
    }));
    return results[1].items;
  }, []);
  async function run(work) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice('Operación completada.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let unsubscribe;
    let active = true;
    try {
      unsubscribe = onAuthStateChanged(getClient().auth, async (user) => {
        if (!active) return;
        setProfile(null);
        if (!user || user.isAnonymous) return;
        try {
          const p = await api('session');
          if (active) {
            setProfile(p);
            await refresh();
          }
        } catch (e) {
          if (active) setError(e.message);
        }
      });
    } catch (e) {
      setError(e.message);
    }
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [refresh]);
  if (!profile)
    return (
      <main className="rq-login">
        <form
          className="rq-card"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(async () => {
              await signInWithEmailAndPassword(getClient().auth, f.get('email'), f.get('password'));
            });
          }}
        >
          <p className="rq-brand">RecuerdosQR</p>
          <h1>Administración</h1>
          <p>Acceso interno para cuentas autorizadas.</p>
          {error && (
            <p role="alert" className="rq-error">
              {error}
            </p>
          )}
          <label>
            Correo
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Contraseña
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button disabled={busy}>Entrar</button>
          <p>
            <a href="/">Ver demo</a>
          </p>
        </form>
      </main>
    );
  const menu = {
    dashboard: 'Resumen',
    customers: 'Clientes',
    events: 'Eventos',
    orders: 'Contrataciones',
    consents: 'Consentimientos',
    legal_documents: 'Documentos legales',
    ...(profile.role === 'superadmin' ? { users: 'Roles', audit_logs: 'Auditoría' } : {}),
  };
  const more = (collection) =>
    cursors[collection] && (
      <button
        className="rq-secondary"
        onClick={() => run(() => loadCollection(collection, cursors[collection]))}
      >
        Cargar más
      </button>
    );
  return (
    <main className="rq-admin">
      <header className="rq-admin-header">
        <div>
          <a className="rq-brand" href="/admin">
            RecuerdosQR
          </a>
          <small>
            {profile.email} · {profile.role}
          </small>
        </div>
        <button className="rq-secondary" onClick={() => run(() => signOut(getClient().auth))}>
          Salir
        </button>
      </header>
      <nav aria-label="Administración">
        {Object.entries(menu).map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => {
              setTab(key);
              if (['users', 'audit_logs'].includes(key)) run(() => loadCollection(key));
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="rq-page">
        {error && (
          <p role="alert" className="rq-error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {busy && <p role="status">Procesando…</p>}
        <fieldset disabled={busy} className="rq-workspace">
          {tab === 'dashboard' && (
            <>
              <h1>Resumen</h1>
              <div className="rq-stats">
                {['customers', 'events', 'orders'].map((k) => (
                  <article key={k} className="rq-card">
                    <strong>{records[k].length}</strong>
                    <span>{menu[k]} cargados</span>
                  </article>
                ))}
              </div>
              <p>
                Vista de los registros cargados (hasta 50 por página). Utiliza «Cargar más» en cada
                sección.
              </p>
              <button onClick={() => run(refresh)}>Actualizar</button>
            </>
          )}
          {tab === 'customers' && (
            <>
              <h1>Clientes</h1>
              <form
                key={customer?.id || 'new'}
                className="rq-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  run(async () => {
                    await api('saveCustomer', {
                      id: customer?.id || crypto.randomUUID(),
                      version: customer?.version,
                      name: f.get('name'),
                      email: f.get('email'),
                      phone: f.get('phone'),
                      notes: f.get('notes'),
                    });
                    setCustomer(null);
                    await loadCollection('customers');
                  });
                }}
              >
                <h2>{customer ? 'Editar cliente' : 'Nuevo cliente'}</h2>
                <div className="rq-fields">
                  {[
                    ['name', 'Nombre'],
                    ['email', 'Correo'],
                    ['phone', 'Teléfono'],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        name={key}
                        type={key === 'email' ? 'email' : 'text'}
                        defaultValue={customer?.[key] || ''}
                        required={key === 'name'}
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Notas
                  <textarea name="notes" defaultValue={customer?.notes || ''} />
                </label>
                <button>Guardar cliente</button>
                {customer && (
                  <button type="button" className="rq-secondary" onClick={() => setCustomer(null)}>
                    Nuevo
                  </button>
                )}
              </form>
              <div className="rq-list">
                {records.customers.map((c) => (
                  <article key={c.id}>
                    <strong>{c.name}</strong>
                    <span>
                      {c.email} · {c.phone}
                    </span>
                    <button onClick={() => setCustomer(c)}>Editar</button>
                  </article>
                ))}
              </div>
              {more('customers')}
            </>
          )}
          {tab === 'events' && (
            <>
              <h1>Eventos</h1>
              <button onClick={() => setSelected(null)}>Nuevo evento</button>
              <div className="rq-list">
                {records.events.map((e) => (
                  <article key={e.id}>
                    <strong>
                      {e.config.event.title} · {e.config.event.names.join(', ')}
                    </strong>
                    <span>
                      {e.status} · /e/{e.slug}
                    </span>
                    <button onClick={() => setSelected(e)}>Administrar</button>
                  </article>
                ))}
              </div>
              {more('events')}
              <EventEditor
                key={selected ? `${selected.id}-${selected.version}` : 'new'}
                event={selected}
                customers={records.customers}
                legal={records.legal_documents}
                run={run}
                onSaved={async (eventId) => {
                  await refresh();
                  setSelected(await api('getRecord', { collection: 'events', id: eventId }));
                }}
              />
            </>
          )}
          {tab === 'orders' && (
            <>
              <h1>Contrataciones y pagos manuales</h1>
              <form
                className="rq-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  run(async () => {
                    await api('createOrder', {
                      id: crypto.randomUUID(),
                      eventId: f.get('eventId'),
                      totalCents: Math.round(Number(f.get('quote')) * 100),
                    });
                    await loadCollection('orders');
                  });
                }}
              >
                <label>
                  Evento
                  <select name="eventId" required>
                    {records.events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.config.event.title} · {e.plan}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cotización Premium (USD; Básico siempre $39,99)
                  <input name="quote" type="number" min="0.01" step="0.01" />
                </label>
                <button disabled={!records.events.length}>Registrar contratación</button>
              </form>
              {records.orders.map((o) => (
                <article className="rq-card" key={o.id}>
                  <h3>
                    {records.events.find((e) => e.id === o.eventId)?.config.event.title ||
                      o.eventId}
                  </h3>
                  <p>
                    {o.plan} · {money(o.paidCents)} / {money(o.totalCents)} · {o.status}
                  </p>
                  {o.payments.map((p) => (
                    <p key={p.id}>
                      {money(p.amountCents)} · {p.method} · {p.reference} · {p.recordedAt}
                    </p>
                  ))}
                  {o.status !== 'paid' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        run(async () => {
                          await api('recordPayment', {
                            orderId: o.id,
                            paymentId: crypto.randomUUID(),
                            amountCents: Math.round(Number(f.get('amount')) * 100),
                            method: f.get('method'),
                            reference: f.get('reference'),
                          });
                          await loadCollection('orders');
                        });
                      }}
                    >
                      <div className="rq-fields">
                        <label>
                          Importe USD
                          <input
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={(o.totalCents - o.paidCents) / 100}
                            required
                          />
                        </label>
                        <label>
                          Método
                          <select name="method">
                            <option value="transfer">Transferencia</option>
                            <option value="cash">Efectivo</option>
                            <option value="other">Otro</option>
                          </select>
                        </label>
                        <label>
                          Referencia
                          <input name="reference" />
                        </label>
                      </div>
                      <button>Registrar pago recibido</button>
                    </form>
                  )}
                </article>
              ))}
              {more('orders')}
            </>
          )}
          {tab === 'consents' && (
            <>
              <h1>Consentimientos y solicitudes</h1>
              <label>
                Evento
                <select
                  value={consentEvent}
                  onChange={(e) => {
                    const eventId = e.target.value;
                    setConsentEvent(eventId);
                    run(async () => {
                      const r = await api('listRecords', { collection: 'consents', eventId });
                      setConsents(r.items);
                      setConsentNext(r.next);
                    });
                  }}
                >
                  <option value="" disabled>
                    Selecciona
                  </option>
                  {records.events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.config.event.title} · {e.slug}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Registros inmutables. Las solicitudes de eliminación requieren revisión manual; esta
                pantalla no borra datos.
              </p>
              {consents.map((c) => (
                <article className="rq-card" key={c.id}>
                  <strong>{c.kind}</strong>
                  <p>ID: {c.id}</p>
                  <p>
                    Invitado: {c.uid} · {c.createdAt} · revisión {c.revision ?? '—'}
                  </p>
                  {c.evidence?.map((d) => (
                    <p key={d.documentId}>
                      {d.documentId} · {d.version} · {d.purpose}
                    </p>
                  ))}
                  {c.reason && <p>{c.reason}</p>}
                </article>
              ))}
              {consentNext && (
                <button
                  onClick={() =>
                    run(async () => {
                      const r = await api('listRecords', {
                        collection: 'consents',
                        eventId: consentEvent,
                        after: consentNext,
                      });
                      setConsents((old) => [...old, ...r.items]);
                      setConsentNext(r.next);
                    })
                  }
                >
                  Cargar más
                </button>
              )}
            </>
          )}
          {tab === 'legal_documents' && (
            <>
              <h1>Documentos legales</h1>
              <p>
                No se incluyen textos legales definitivos. Publica únicamente versiones revisadas
                para tu operación.
              </p>
              {profile.role === 'superadmin' && (
                <form
                  className="rq-card"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    run(async () => {
                      await api('publishLegal', {
                        id: f.get('id'),
                        title: f.get('title'),
                        version: f.get('version'),
                        purpose: f.get('purpose'),
                        body: f.get('body'),
                        reviewed: f.get('reviewed') === 'on',
                      });
                      await loadCollection('legal_documents');
                    });
                  }}
                >
                  <div className="rq-fields">
                    {[
                      ['id', 'ID único de esta versión'],
                      ['title', 'Título'],
                      ['version', 'Versión'],
                      ['purpose', 'Finalidad'],
                    ].map(([k, label]) => (
                      <label key={k}>
                        {label}
                        <input name={k} required />
                      </label>
                    ))}
                  </div>
                  <label>
                    Texto revisado
                    <textarea name="body" rows="12" required />
                  </label>
                  <label className="rq-check">
                    <input type="checkbox" name="reviewed" required />
                    Confirmo que este documento está revisado y listo para uso.
                  </label>
                  <button>Publicar versión inmutable</button>
                </form>
              )}
              {records.legal_documents.map((d) => (
                <details key={d.id} className="rq-card">
                  <summary>
                    {d.title} · {d.version}
                  </summary>
                  <p>
                    ID: {d.id} · finalidad: {d.purpose}
                  </p>
                  <div className="rq-legal-body">{d.body}</div>
                </details>
              ))}
              {more('legal_documents')}
            </>
          )}
          {tab === 'users' && profile.role === 'superadmin' && (
            <>
              <h1>Roles</h1>
              <p>
                Crea previamente la cuenta Email/Password en Firebase Auth. Las cuentas de clientes
                aún no tienen portal.
              </p>
              <form
                className="rq-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  run(async () => {
                    await api('assignRole', {
                      uid: f.get('uid'),
                      role: f.get('role'),
                      enabled: f.get('enabled') === 'on',
                    });
                    await loadCollection('users');
                  });
                }}
              >
                <label>
                  UID
                  <input name="uid" required />
                </label>
                <label>
                  Rol
                  <select name="role">
                    <option>seller</option>
                    <option>superadmin</option>
                    <option>customer</option>
                  </select>
                </label>
                <label className="rq-check">
                  <input name="enabled" type="checkbox" defaultChecked />
                  Cuenta activa
                </label>
                <button>Asignar rol</button>
              </form>
              {records.users.map((u) => (
                <p key={u.id}>
                  {u.email} · {u.id} · {u.role} · {u.enabled ? 'activo' : 'inactivo'}
                </p>
              ))}
              {more('users')}
            </>
          )}
          {tab === 'audit_logs' && (
            <>
              <h1>Auditoría</h1>
              {records.audit_logs.map((a) => (
                <article className="rq-card" key={a.id}>
                  <strong>{a.action}</strong>
                  <p>
                    {a.actorUid} → {a.targetId}
                  </p>
                  <small>{a.createdAt}</small>
                </article>
              ))}
              {more('audit_logs')}
            </>
          )}
        </fieldset>
      </div>
    </main>
  );
}
