# Fotografías de eventos — primera etapa

React + Vite. Una configuración local activa y un contrato JSON independiente del origen.

## Entrada de datos

`main.jsx` carga `src/config/event-config.json`, realiza validación básica y resuelve assets.
Entrega `config` y `technicalConfig` a `App`; App y UploadPhotos no importan datos del evento.
En el futuro, una API o Firestore podrá entregar el mismo contrato antes de renderizar App.
Hoy cambiar el JSON importado requiere reconstruir el bundle: es una propiedad del adaptador
local, no del contrato. No se implementó carga remota, router o selección de evento por URL.

## Plantilla comercial photo-hero

Única plantilla implementada. App acepta template: photo-hero; cualquier otro nombre
se rechaza. PhotoHero es una envoltura de presentación; UploadPhotos mantiene los
estados, compresión, selección, modal y flujo de carga existentes. No hay registry,
editor, coordenadas X/Y ni plantillas adicionales.

## Contrato serializable: event-config.json

Solo objetos, arrays, strings, números, booleanos y null. Sin funciones, componentes, imports,
instancias Date ni credenciales. El JSON actual es el ejemplo completo para copiar.
La validación es básica; no sustituye una futura validación completa de datos remotos.

| Bloque | Campos y comportamiento |
| --- | --- |
| schemaVersion | Versión 1; ampliación compatible mediante el adaptador local. |
| template | photo-hero. |
| templateOptions | identityPosition: top-left, top-center o top-right; formPosition: bottom-left, bottom-center o bottom-right. |
| event | id estable; type descriptivo (wedding, birthday, quinceanera, graduation u otro); names array; title; date ISO o null; dateLabel opcional; locale; timeZone IANA o null. |
| metadata | Título de pestaña y favicon. Se conserva el título anterior por compatibilidad. |
| images | backgroundDesktop obligatorio y backgroundMobile independiente (string o null para reutilizar desktop). Aceptan alias locales, rutas públicas y URLs HTTPS. |
| images.background | Se conservan size, desktopPosition, mobilePosition y containsEventText como campos opcionales de compatibilidad. Por defecto cover y center center; no definen la posición del formulario/identidad. |
| theme | id descriptivo y mapa completo variables con nombres --event-* y valores CSS string. El ID no carga estilos automáticamente. |
| sections | Booleanos identity, upload, instructions, photoPreview, decoration. |
| texts | upload, preview, messages: texto plano, sin HTML. La instrucción de eliminar está dividida para conservar la X en negrita. |
| upload | accept, multiple, maxFiles, cooldownMs, compression.maxSizeMB y compression.maxWidthOrHeight. accept no es validación de seguridad. |
| feedback | alertDurationMs. |
| qr | mode: external, targetUrl, imageSrc: metadatos reservados. No genera, muestra ni valida QR. Cambiar targetUrl no modifica un QR impreso. |
| gallery | Solo mode: local-preview, remoteEnabled: false; thumbnailSize en px y modalMaxHeight en CSS. No lee Storage. |

Los textos admiten {maxFiles}, {minutes}, {count} y {number}. formatText es código separado.
event.id no cambia la ruta de Storage. type, timeZone y containsEventText son metadatos:
no activan plantillas, convierten fechas ni alteran píxeles. La identidad HTML muestra dateLabel
o date sin conversión automática; permanece visible al activar el formulario.

## Configuración exclusivamente técnica local

`src/config/technical-config.js` contiene:

- storagePrefix: boda. Conserva `boda/{nombreTransformado}/{timestamp}-{file.name}`.
- mobileBreakpointPx: 768, punto de cambio de presentación existente.
- useWebWorker: true, opción del motor de compresión.

No derivar el prefijo del ID ni moverlo a datos remotos en esta etapa. Dos configuraciones
siguen usando boda/: el ID no proporciona aislamiento de datos ni permisos.

`resolve-assets.js` es el único adaptador con imports de imágenes de Vite. El JSON acepta
`asset:current-background` (desktop), `asset:current-background-mobile` (móvil),
rutas públicas como `/events/fondo.jpg` o URLs HTTPS.
Los alias asset: pertenecen al registro local; una API puede entregar URLs directamente.
El resolver devuelve un objeto nuevo, no modifica el original y rechaza alias desconocidos.

Firebase mantiene sus variables VITE_* en src/firebase.js. El .env de este checkout estaba
vacío durante la inspección. Reglas, CORS, Hosting, workflows, autenticación y Analytics
quedan fuera del refactor y no se modificaron.

## Tema y compatibilidad

Las variables se aplican en document.documentElement para alcanzar el portal del modal.
Se restauran al desmontar o cambiar config. Conservan los colores, tipografía, superficies,
radios del panel, sombras y desenfoques originales. Las variantes
Bootstrap permanecen. La plantilla usa flujo vertical, espacio flexible entre identidad
y formulario, y scroll si el contenido supera el alto de pantalla; no recorta controles.
En móvil los bloques se limitan al ancho disponible, por lo que las posiciones laterales
pueden verse iguales cuando el formulario ocupa todo el ancho. El breakpoint permanece
en 768px. El modal limita su alto y permite desplazar las miniaturas. No se cargan fuentes externas nuevas: otra fuente debe estar disponible
en el navegador o suministrarse aparte. Los estilos globales heredados se mantienen.

La demo de María utiliza temporalmente las imágenes antiguas, que contienen letras
incrustadas de Oscar/Verito. sections.identity: true muestra título, nombre y fecha HTML
independientes. Cambiar nombres en JSON no modifica letras de las imágenes.
La copia src/config/oscar-verito.json se conserva intacta: el adaptador acepta sus
campos antiguos images.background.desktop/mobile y añade la plantilla/posiciones por defecto. La antigua referencia específica de .container, no usada por el
JSX actual, pasa a --event-legacy-background, con valor por defecto none.

## Crear manualmente un segundo evento

1. Copiar el JSON completo a src/config/birthday.json.
2. Cambiar id, type, names, title, fecha, textos y metadatos.
3. Usar URLs HTTPS o imágenes de public/events/ con rutas /events/.... Si se requieren
   imports de src/assets, registrar sus alias en resolve-assets.js.
4. Para nombres y fecha independientes, usar un fondo sin letras y activar sections.identity.
   Configurar images.backgroundDesktop e images.backgroundMobile y editar theme.variables.
   Las variables --event-primary y --event-accent controlan el gradiente del botón;
   --event-text, --event-panel-active, --event-panel-idle, --event-panel-border y
   --event-font controlan texto, superficie, borde y tipografía. El resto de variables
   existentes permite ajustar los detalles sin añadir otro sistema de diseño.
5. Cambiar únicamente el import de configuración local en main.jsx. Mantener storagePrefix boda.
6. Ejecutar lint/build y comprobar móvil, escritorio, selección, modal y mensajes.

## Verificación y límites conservados

Comandos: npm run dev, npm run lint y npm run build.

Al comenzar photo-hero, lint tenía 3 errores y 1 warning: styles sin usar en ModalPhotos,
dependencia showAlert en ShowAlert, y ref/uploadBytes sin usar en UploadPhotos. Los dos
últimos proceden de un cambio local previo: el import de storage y el bucle de subida
están comentados. Se conserva ese estado sin reactivar Firebase. La interfaz puede
mostrar éxito en esta demo sin guardar archivos. No usarlo como evidencia de subida real. También permanecen la
validación de nombres, cooldown en memoria tras éxito/error, cargas parciales, limpieza de
URLs de previews, temporizadores, autenticación sin espera y semántica Aceptar/Cancelar.
No se añaden reintentos, usuarios, pagos, dashboard, drag & drop o migraciones.

Build no demuestra una subida real. Las pruebas de subida requieren un entorno autorizado.
No desplegar reglas/Hosting para probar este refactor: la configuración local no confirma
la configuración de producción. No se ha hecho deploy ni commit.


## Reemplazar fotografías y posiciones

Colocar fotografías limpias existentes en public/events/maria-desktop.jpg y
public/events/maria-mobile.jpg. Editar únicamente el JSON activo:

```json
{
  "template": "photo-hero",
  "images": {
    "backgroundDesktop": "/events/maria-desktop.jpg",
    "backgroundMobile": "/events/maria-mobile.jpg"
  },
  "templateOptions": {
    "identityPosition": "top-left",
    "formPosition": "bottom-right"
  }
}
```

Este fragmento ilustra los campos a cambiar; conservar los demás bloques del JSON.
También pueden usarse URLs HTTPS sin modificar React. Las opciones left/center/right
son independientes y se aplican tanto antes como después de activar el formulario.
Las referencias antiguas siguen aceptándose para no modificar el backup original.
No hay coordenadas configurables de bloques. No se generaron ni editaron imágenes.

## Verificación de esta etapa

- El JSON activo conserva opciones de subida, tiempos, QR y galería de la demo anterior.
- technicalConfig.storagePrefix permanece en boda.
- La lógica anterior al render de UploadPhotos se compara con el estado al iniciar esta etapa.
- Las incidencias de lint previas se conservan; build debe compilar sin errores nuevos.
- Las pruebas de UI locales no validan una carga real: el bucle ya estaba comentado.
