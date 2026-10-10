# Operación del MVP

## Arquitectura y contrato

`main.jsx` resuelve `/`, `/admin` y `/e/:slug`, con módulos administrativos bajo demanda.
La landing recibe `config`, `technicalConfig` y el adaptador `uploadFiles`. Se reutilizan
PhotoHero, selección, compresión, previsualización y alertas.

El JSON conserva `schemaVersion: 1`, `template`, `templateOptions`, `event`, `metadata`,
`images`, `theme`, `sections`, `texts`, `upload`, `feedback`, `qr` y `gallery`: solo datos,
sin React ni funciones. Functions valida límites, textos, URLs, CSS y posiciones e impone
`config.event.id` desde el documento. `resolve-assets.js` resuelve alias y fondos.

La autorización vive fuera del contrato visual: `events` contiene propietario, cliente,
plan, estado, slug, cuotas, galería habilitada, versión y requisitos legales.
`config.gallery` conserva la previsualización local; la galería remota se controla con
`events.galleryEnabled`. `config.qr` sigue siendo metadato; el QR real reside en `qr_codes`
y no confía en `config.qr.targetUrl`.

`technical-config.js` permanece local: `storagePrefix: boda`, breakpoint y Web Worker.
Las variables VITE son identificadores públicos. Nunca contienen credenciales Admin.
Functions usa su identidad de servicio; las credenciales ADC del operador van fuera del repo.

## Modelo y permisos

| Colección | Contenido y acceso mediante Functions |
| --- | --- |
| users | Rol y habilitación. Solo superadmin asigna. `customer` reservado sin portal. |
| customers | Datos del cliente y ownerUid; seller solo administra los propios. |
| events | Config JSON, propietario, cliente, plan, slug, estado, cuotas y privacidad. |
| orders | Contratación USD y pagos en centavos con operador/fecha. Básico fija 3999 en servidor; Premium exige cotización. |
| qr_codes | Estilo y URL canónica fijada al primer guardado, por evento. |
| media | Ruta privada, autor, tamaño/tipo y estado de reserva/carga. |
| legal_documents | Versiones inmutables, finalidad, texto, SHA-256 y autor. |
| consents | Evidencias inmutables de aceptación, retirada y solicitud de eliminación. |
| audit_logs | Operaciones críticas y actor; lectura solo superadmin. |
| event_slugs | Reserva permanente; no existe operación para cambiar o reutilizar slug. |
| guest_access | Consentimiento vigente, recibos y límites por evento/UID. |
| upload_batches | Idempotencia de reservas por evento/UID/requestId. |
| system/roles | Contador transaccional que protege al último superadmin activo. |

Los roles se verifican en Firestore y el proveedor Auth en backend. Anonymous nunca
obtiene administración aunque manipule React. Edición de cliente/evento usa versión para
detectar conflictos. Listas administrativas: 50/página; galería: 20; historial personal:
API paginada de 30 (UI muestra primera página). Identificadores no permiten escapar rutas.
`api` expone acciones explícitas y `mediaDownload` verifica permisos por petición.
Servicios: admin, guests y media; políticas puras en `functions/lib` con pruebas.

## Reglas y fotografías

Las reglas locales originales de Firestore y Storage ya denegaban todo acceso cliente.
Se analizaron y **se conservaron sin cambios**. Admin SDK las omite, por lo que Functions
implementa la autorización. No hay lecturas/escrituras SaaS directas desde React.
Los índices están en `firestore.indexes.json`. Hosting, `.firebaserc`, `cors.json` y
workflows permanecen sin cambios; no se conoce si producción coincide con estas reglas.

Flujo: Auth → slug → documentos → aceptación explícita → nombre/selección → compresión
existente → reserva transaccional → envío secuencial a callable → objeto privado en
`events/{eventId}/{uid}/{mediaId}` → metadatos ready → galería.
No se generan download tokens ni enlaces públicos a fotos. Descargas autenticadas con
`Cache-Control: private, no-store` y Blob temporal en navegador.

JPEG/PNG/WebP de hasta 2 MB comprimidos por foto, con validación de firma, tamaño y ticket.
La firma no es antivirus ni demuestra autorización de terceros retratados. El selector
heredado admite image/*; el backend rechaza formatos incompatibles. Base64 agrega ~33%
al tamaño de petición. Se usa el proxy para conservar reglas restrictivas y evitar URLs
firmadas reutilizables; no está diseñado para video o archivos grandes.

Cuota inicial: 1000 fotos/1 GiB, editable hasta 10000/10 GiB; 200 fotos por UID/evento.
Tickets: 15 minutos. Las reservas fallidas o expiradas siguen contadas para limitar abuso;
su revisión/liberación es manual. Fallos después de guardar quedan en cuarentena, sin
exposición ni borrado automático. Revisar objetos huérfanos, reservas y retención.
Nuevas sesiones anónimas no evaden la cuota global, pero pueden consumirla. App Check
reduce abuso; no lo elimina ni garantiza un costo máximo.

Galería compartida requiere consentimiento vigente del lector y del autor. Si se desactiva,
el invitado solo consulta sus fotos. Propietario seller y superadmin conservan acceso de
gestión. Quien tenga el enlace y acepte puede entrar: no hay PIN ni lista de invitados.

## Privacidad y estados

Sin textos legales predeterminados. Superadmin publica versiones revisadas con IDs nuevos.
Activación requiere 1–5 documentos. Aceptación guarda UID, evento, revisión, versiones,
finalidades, hashes y timestamp de servidor; no almacena IP. Casillas sin preselección.

Estados: draft → active → closed → active, o closed → finished (terminal).
Draft/finished no se resuelven públicamente. Closed permite lectura pero no cargas.
Cambiar documentos exige cerrar el evento e invalida aceptaciones anteriores.
Cambiar estado o retirar consentimiento invalida tickets pendientes; la retirada aumenta
la época del evento, así que otros invitados con tickets deben seleccionar de nuevo.
No elimina objetos. Fotos retiradas dejan de estar disponibles para invitados; una copia
ya descargada no puede revocarse.

Recibos consultables y una solicitud de eliminación pendiente por sesión/evento. El panel
permite consultarla; tramitación y registro de resolución quedan manuales fuera del MVP.
No hay borrado automático ni SLA automatizado. Al borrar datos del navegador o cambiar
de dispositivo se pierde esa identidad anónima. Antes de vender, definir canal de soporte,
verificación de identidad, retención y atención de solicitudes. No se acredita cumplimiento
legal automáticamente por guardar una aceptación.

## Desarrollo local

Node 22, npm y Java 21 para los emuladores oficiales. Producto y backend: JavaScript/Node.
No activar Blaze para pruebas locales. Seguir comandos del README. `.env.example` apunta
solo a demo-recuerdosqr. El seed usa loopback y crea admin@example.test con contraseña
Local-test-password-42!, exclusivamente local. UI emuladores: http://127.0.0.1:4000.
Sin exportación, detenerlos pierde sus datos. La integración genera datos propios.

Origen local predeterminado: http://localhost:5173. Otro puerto/origen exige definir
PUBLIC_ORIGIN en el entorno de Functions para QR y CORS del proxy. `.env.example`
describe frontend; `functions/.env.example`, backend. No sobrescribir archivos .env existentes.
Cerrar emuladores interactivos antes de `npm run test:integration`. Los scripts CLI usan
--project demo-recuerdosqr; la suite exige hosts de emuladores. Sin credenciales reales.

## Crear un evento

1. Crear cliente y evento: slug definitivo, plan, nombres, fecha, fondos, colores y cuotas.
   JSON avanzado permite el resto del contrato; no código ejecutable.
2. Publicar documentos revisados como superadmin; asociarlos y activar el evento.
3. Probar /e/slug en otro navegador como invitado, aceptar, subir y ver galería.
4. Guardar QR y descargar PNG/SVG. Comprobar lectura con teléfono antes de imprimir.
   Contraste alto; logo HTTPS opcional requiere CORS del servidor de esa imagen.
5. Registrar contratación y pagos realmente recibidos. Sin cobro automático, factura
   fiscal, pasarela ni activación condicionada al saldo.

Cambiar tema/configuración conserva slug y QR. Mantener el dominio canónico; un cambio
de dominio requiere conservar redirecciones anteriores. Los fondos de demo todavía tienen
letras Oscar/Verito: reemplazarlos manualmente antes de entregar un evento comercial.

Premium: escribir componente y registrar en src/templates/premium/index.js:
`'premium:nombre': { eventId, Component }`. Backend: PREMIUM_TEMPLATES con
`{"EVENT_ID":"premium:nombre"}`. Usar plan premium y ese config.template. Recibe las
mismas props que App. No se incluye plantilla exclusiva ni se genera código desde JSON.

## Preparación de un entorno real (no ejecutada)

1. Elegir proyecto/región y revisar costos. Functions requiere Blaze para deploy; confirmar
   requisitos actuales de Storage. Configurar presupuestos/alertas (no son topes de gasto).
   Costos posibles: invocaciones/CPU, Firestore, Storage y transferencia vía Functions,
   además de Netlify. Nada se ha activado o desplegado automáticamente.
2. Habilitar Auth Email/Password y Anonymous, dominios autorizados, Firestore y bucket
   privado. Revisar IAM sin allUsers/allAuthenticatedUsers. Comparar reglas reales con
   locales antes de cualquier deploy; no sustituir reglas heredadas sin analizar impacto.
3. Netlify: VITE_* reales, VITE_USE_EMULATORS=false, App Check reCAPTCHA v3 registrado
   para el dominio y VITE_APPCHECK_SITE_KEY. Backend exige App Check fuera de emuladores.
   No dejar tokens debug en producción.
4. Functions: PUBLIC_ORIGIN=https://dominio-canonico (sin slash final), PREMIUM_TEMPLATES={}.
   Revisar IAM/invocación HTTP para clientes web; Functions verifica Auth y App Check.
5. Crear primera cuenta Email/Password en Auth. Operador autorizado con ADC define
   CONFIRM_BOOTSTRAP_PROJECT igual al ID y ejecuta explícitamente:
   `npm --prefix functions run bootstrap -- PROJECT_ID EMAIL`.
   Solo inicia el primer superadmin; posteriores roles por panel. Crear cuentas de
   vendedores en Auth antes de asignar UID. Sin autoservicio de registro.
6. Desplegar manualmente Functions e índices tras autorización y esperar índices listos.
   Netlify usa netlify.toml, npm run build y dist, reescrituras /admin y /e/*.
   No usar Firebase Hosting para este frontend. Revisar workflows existentes antes de
   futuros pushes: no se modificaron ni ejecutaron aquí.
7. Revisar documentos legales, soporte/retención, auditoría de dependencias y realizar
   ensayo autorizado en staging con App Check, móvil, QR impreso y fallos de red.

## Compatibilidad y límites

JSON local, backup Oscar/Verito, CSS de landing y técnica local permanecen intactos.
El checkout inicial tenía comentado el envío a Storage y podía mostrar éxito sin guardar.
La demo / ahora informa que la carga está deshabilitada, sin simular guardados.
VITE_ENABLE_LEGACY_UPLOADS=true habilita el adaptador original src/firebase.js y la ruta
`boda/{nombreTransformado}/{timestamp}-{file.name}`. No activarlo en producción sin revisar
permisos y variables. Reglas locales deny-all lo rechazan; no se relajaron.
/e/:slug usa rutas SaaS privadas sin migrar, modificar ni borrar datos boda/.

Persisten problemas heredados de validación de nombres, previews y cargas parciales.
Un lote puede subir parcialmente y mostrar error. Sin reintentos automáticos, ZIP,
moderación, backup/restauración ni pruebas de carga de escala. Límites Functions: 3
instancias, concurrencia 8, 256 MiB, 60 s. No equivalen a un límite monetario.

Referencias oficiales:
[callable](https://firebase.google.com/docs/functions/callable),
[App Check](https://firebase.google.com/docs/app-check/cloud-functions),
[requisitos Functions](https://firebase.google.com/docs/functions/get-started),
[precios](https://firebase.google.com/pricing),
[QR](https://github.com/kozakdenys/qr-code-styling).
