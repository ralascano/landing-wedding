# RecuerdosQR — SaaS MVP

React + Vite + JavaScript; Firebase Auth, Functions (Node 22), Firestore y Storage.
Frontend preparado para Netlify, sin pagos online ni portal de clientes.

- `/`: demo local existente con contrato JSON y plantilla `photo-hero`.
- `/admin`: clientes, eventos, pagos manuales, QR y privacidad.
- `/e/:slug`: evento remoto, consentimiento y fotografías privadas por evento.

**Guía técnica y preparación comercial:** [docs/SAAS.md](docs/SAAS.md).
**Archivos y verificaciones:** [docs/VERIFICATION.md](docs/VERIFICATION.md).
**Contrato de la etapa anterior:** [docs/V0.md](docs/V0.md) (documentación histórica).

Requisitos: Node 22, npm y Java 21 únicamente para emuladores oficiales de Firebase.
Java no forma parte del backend ni del producto.

```powershell
npm ci
npm ci --prefix functions
Copy-Item .env.example .env.local
npm run emulators
```

No sobrescribir un `.env.local` existente: combinar sus valores. En otra terminal:

```powershell
npm run seed:emulator
npm run dev -- --port 5173 --strictPort
```

Abrir `http://localhost:5173/admin`. Cuenta exclusiva del emulador:
`admin@example.test` / `Local-test-password-42!`. El seed nunca usa un proyecto real.

```powershell
npm test
npm run test:integration
npm run lint
npm run build
```

Detener los emuladores interactivos antes de `test:integration`, que inicia su propia
instancia. No se hizo deploy, commit, push ni activación de facturación.
