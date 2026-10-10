import './photo-hero.css';

// Presentation only. Selection, compression and upload state remain in UploadPhotos.
export default function PhotoHero({ config, isMobile, active, children }) {
  const { event, images, sections, templateOptions } = config;
  const background = images.background;
  const image = isMobile
    ? (images.backgroundMobile ?? images.backgroundDesktop)
    : images.backgroundDesktop;

  return (
    <main
      className="photo-hero"
      data-mobile={isMobile}
      data-active={active}
      data-identity-position={templateOptions.identityPosition}
      data-form-position={templateOptions.formPosition}
    >
      <div
        className="photo-hero__background"
        aria-hidden="true"
        style={{
          backgroundImage: `url(${JSON.stringify(image)})`,
          backgroundSize: background?.size ?? 'cover',
          backgroundPosition:
            (isMobile ? background?.mobilePosition : background?.desktopPosition) ??
            'center center',
        }}
      />
      <div className="photo-hero__overlay" aria-hidden="true" />
      {sections.identity && (
        <header className="photo-hero__identity">
          <h1>{event.title}</h1>
          <p className="photo-hero__names">{event.names.join(' · ')}</p>
          {event.date && <time dateTime={event.date}>{event.dateLabel ?? event.date}</time>}
        </header>
      )}
      {children}
    </main>
  );
}
