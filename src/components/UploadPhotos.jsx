import React, { useRef, useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

import { formatText } from '../config/format-text';
import ModalPhotos from './ModalPhotos';
import PhotoHero from '../templates/PhotoHero';
import { Spinner } from 'reactstrap';
import ShowAlert from './ShowAlert';
import { uploadLegacyPhotos } from '../services/legacy-upload';

function limpiarYTransformarNombre(nombre) {
  if (!nombre) return '';

  const sinEmojis = nombre.replace(/[^À-ſ\p{L}\s]/gu, '');
  const normalizado = sinEmojis.trim().replace(/\s+/g, ' ');

  const palabras = normalizado.toLowerCase().split(' ');
  const camelCase = palabras
    .map((palabra, index) =>
      index === 0 ? palabra : palabra.charAt(0).toUpperCase() + palabra.slice(1),
    )
    .join('');

  const idUnico = Date.now().toString(36).slice(-6);

  return `${camelCase}_${idUnico}`;
}

export default function UploadPhotos({ config, technicalConfig, uploadFiles }) {
  const { texts, upload, sections } = config;
  const [previewFiles, setPreviewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loader, setLoader] = useState(false);
  const [canUpload, setCanUpload] = useState(true);
  const inputRef = useRef(null);

  const [nombre, setNombre] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertColor, setAlertColor] = useState('');

  const [formActivo, setFormActivo] = useState(false);

  const maxFiles = upload.maxFiles;

  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${technicalConfig.mobileBreakpointPx}px)`).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${technicalConfig.mobileBreakpointPx}px)`);

    const handleChange = (e) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [technicalConfig.mobileBreakpointPx]);

  const handleNameChange = (e) => {
    setNombre(e.target.value);
  };

  const handleFileChange = async (e) => {
    setLoader(true);

    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length > maxFiles) {
      setAlertMsg(formatText(texts.messages.tooManyFiles, { maxFiles }));
      setAlertColor('warning');
      setShowAlert(true);
      setLoader(false);
      return;
    }

    const options = {
      maxSizeMB: upload.compression.maxSizeMB,
      maxWidthOrHeight: upload.compression.maxWidthOrHeight,
      useWebWorker: technicalConfig.useWebWorker,
    };

    try {
      const compressedFilesPromises = selectedFiles.map(async (file) => {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
      });

      const compressedFiles = await Promise.all(compressedFilesPromises);

      const previews = compressedFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));

      setPreviewFiles(previews);
      setLoader(false);
    } catch (error) {
      console.error('Error al comprimir imágenes:', error);
      setAlertMsg(texts.messages.uploadError);
      setAlertColor('danger');
      setShowAlert(true);
      setLoader(false);
    }
  };

  const handleRemove = (indexToRemove) => {
    const updated = previewFiles.filter((_, i) => i !== indexToRemove);
    setPreviewFiles(updated);
  };

  const uploadPhotos = async () => {
    if (!canUpload) {
      setAlertMsg(texts.messages.uploadWait);
      setAlertColor('warning');
      setShowAlert(true);
      return;
    }

    const nombreTransformado = limpiarYTransformarNombre(nombre);

    if (!nombreTransformado) {
      setAlertMsg(texts.messages.invalidName);
      setAlertColor('warning');
      setShowAlert(true);
      return;
    }

    setUploading(true);
    setCanUpload(false);

    try {
      if (uploadFiles) await uploadFiles(previewFiles, nombre);
      else await uploadLegacyPhotos(previewFiles, nombreTransformado, technicalConfig);

      setAlertMsg(formatText(texts.messages.success, { minutes: upload.cooldownMs / 60000 }));
      setAlertColor('primary');
      setShowAlert(true);
      setPreviewFiles([]);
    } catch (error) {
      console.error('Error al subir imágenes:', error);
      setAlertMsg(error.message || texts.messages.uploadError);
      setAlertColor('danger');
      setShowAlert(true);
    } finally {
      setUploading(false);

      setTimeout(() => {
        setCanUpload(true);
      }, upload.cooldownMs);
    }
  };

  const handleClick = () => {
    if (!canUpload) {
      setAlertMsg(texts.messages.selectWait);
      setAlertColor('warning');
      setShowAlert(true);
      return;
    }

    inputRef.current.click();
  };

  useEffect(() => {
    return () => {
      previewFiles.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [previewFiles]);

  return (
    <PhotoHero config={config} isMobile={isMobile} active={formActivo}>
      <div
        className="photo-hero__form"
        data-active={formActivo}
        hidden={!sections.upload}
        style={{
          background: formActivo ? 'var(--event-panel-active)' : 'var(--event-panel-idle)',

          backdropFilter: formActivo
            ? 'var(--event-panel-blur-active)'
            : 'var(--event-panel-blur-idle)',

          WebkitBackdropFilter: formActivo
            ? 'var(--event-panel-blur-active)'
            : 'var(--event-panel-blur-idle)',

          border: 'var(--event-panel-border)',

          borderRadius: formActivo
            ? 'var(--event-panel-radius-active)'
            : 'var(--event-panel-radius-idle)',

          boxShadow: formActivo
            ? 'var(--event-panel-shadow-active)'
            : 'var(--event-panel-shadow-idle)',

          textAlign: 'center',

          fontFamily: 'var(--event-font)',
          color: 'var(--event-text)',

          transition:
            'width 0.45s ease, padding 0.45s ease, background 0.45s ease, border-radius 0.45s ease, box-shadow 0.45s ease',

          zIndex: 10,
        }}
      >
        {/* =====================================================
            CONTENIDO QUE SOLO APARECE CUANDO SE ACTIVA
           ===================================================== */}
        {formActivo && sections.instructions && (
          <>
            <div
              style={{
                width: '42px',
                height: '2px',

                margin: '0 auto 14px',

                background: 'var(--event-accent-line)',
              }}
            />

            <h2
              style={{
                margin: '0 0 6px',

                fontFamily: 'var(--event-font)',

                fontSize: isMobile ? '21px' : '26px',

                fontWeight: '400',

                lineHeight: '1.2',

                color: 'var(--event-heading)',
              }}
            >
              {texts.upload.title}
            </h2>

            <p
              style={{
                margin: '0 0 20px',

                fontFamily: 'var(--event-font)',

                fontSize: isMobile ? '13px' : '14px',

                lineHeight: '1.4',

                color: 'var(--event-muted)',
              }}
            >
              {texts.upload.subtitle}
            </p>
          </>
        )}

        {/* =====================================================
            ALERTAS
           ===================================================== */}
        {showAlert && (
          <div
            style={{
              marginBottom: '15px',
            }}
          >
            <ShowAlert
              durationMs={config.feedback.alertDurationMs}
              closeLabel={texts.messages.close}
              alertMsg={alertMsg}
              color={alertColor}
              setShowAlert={setShowAlert}
            />
          </div>
        )}

        {/* =====================================================
            INPUT NOMBRE
           ===================================================== */}
        <div
          style={{
            marginBottom: formActivo && nombre ? '18px' : '0',

            textAlign: 'left',
          }}
        >
          {formActivo && (
            <label
              htmlFor="nombre"
              style={{
                display: 'block',

                marginBottom: '7px',

                fontFamily: 'var(--event-font)',

                fontSize: isMobile ? '13px' : '14px',

                lineHeight: '1.4',

                color: 'var(--event-label)',
              }}
            >
              {texts.upload.nameLabel}
            </label>
          )}

          <input
            type="text"
            id="nombre"
            name="nombre"
            placeholder={
              formActivo ? texts.upload.activeNamePlaceholder : texts.upload.namePlaceholder
            }
            onFocus={() => setFormActivo(true)}
            onChange={handleNameChange}
            value={nombre}
            style={{
              width: '100%',

              boxSizing: 'border-box',

              padding: formActivo ? (isMobile ? '12px 14px' : '13px 15px') : '11px 14px',

              backgroundColor: 'var(--event-input-background)',

              border: 'var(--event-input-border)',

              borderRadius: '10px',

              outline: 'none',

              fontFamily: 'var(--event-font)',

              fontSize: isMobile ? '16px' : '15px',

              color: 'var(--event-input-text)',

              boxShadow: 'var(--event-input-shadow)',

              transition: 'all 0.3s ease',
            }}
          />
        </div>

        {/* =====================================================
            LOADER
           ===================================================== */}
        {loader && (
          <div
            style={{
              margin: '16px 0',
            }}
          >
            <Spinner>{texts.upload.loading}</Spinner>
          </div>
        )}

        {/* =====================================================
            OPCIONES DE FOTOS
            Aparecen solamente cuando ya escribió el nombre
           ===================================================== */}
        {formActivo && nombre.trim().length > 0 && (
          <div
            style={{
              display: 'flex',

              flexDirection: 'column',

              justifyContent: 'center',
              alignItems: 'center',

              width: '100%',

              gap: '12px',
            }}
          >
            {/* BOTÓN SELECCIONAR FOTOS */}
            {!loader && previewFiles.length === 0 && (
              <button
                type="button"
                onClick={handleClick}
                disabled={!canUpload}
                style={{
                  width: '100%',

                  padding: isMobile ? '12px 18px' : '12px 20px',

                  background: canUpload
                    ? 'var(--event-button-background)'
                    : 'var(--event-disabled)',

                  color: 'var(--event-button-text)',

                  border: canUpload ? 'var(--event-button-border)' : 'var(--event-disabled-border)',

                  borderRadius: '10px',

                  fontFamily: 'var(--event-font)',

                  fontSize: '14px',

                  fontWeight: '600',

                  letterSpacing: '0.4px',

                  cursor: canUpload ? 'pointer' : 'not-allowed',

                  boxShadow: canUpload ? 'var(--event-button-shadow)' : 'none',

                  transition: 'all 0.3s ease',
                }}
              >
                {texts.upload.select}
              </button>
            )}

            {/* INPUT FILE OCULTO */}
            <input
              type="file"
              accept={upload.accept}
              multiple={upload.multiple}
              onChange={handleFileChange}
              ref={inputRef}
              style={{
                display: 'none',
              }}
              disabled={!canUpload}
            />

            {/* =================================================
                PREVIEW
               ================================================= */}
            {sections.photoPreview && previewFiles.length > 0 && (
              <div
                style={{
                  width: '100%',

                  display: 'flex',

                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ModalPhotos
                  config={config}
                  previewFiles={previewFiles}
                  handleRemove={handleRemove}
                  uploading={uploading}
                  canUpload={canUpload}
                />
              </div>
            )}

            {/* =================================================
                BOTÓN SUBIR
               ================================================= */}
            {previewFiles.length > 0 && (
              <button
                type="button"
                onClick={uploadPhotos}
                disabled={uploading || !canUpload}
                style={{
                  width: '100%',

                  padding: isMobile ? '12px 18px' : '12px 20px',

                  background:
                    uploading || !canUpload
                      ? 'var(--event-disabled)'
                      : 'var(--event-button-background)',

                  color: 'var(--event-button-text)',

                  border:
                    uploading || !canUpload
                      ? 'var(--event-disabled-border)'
                      : 'var(--event-button-border)',

                  borderRadius: '10px',

                  fontFamily: 'var(--event-font)',

                  fontSize: '14px',

                  fontWeight: '600',

                  letterSpacing: '0.4px',

                  cursor: uploading || !canUpload ? 'not-allowed' : 'pointer',

                  boxShadow: uploading || !canUpload ? 'none' : 'var(--event-button-shadow)',

                  transition: 'all 0.3s ease',
                }}
              >
                {uploading ? texts.upload.submitting : texts.upload.submit}
              </button>
            )}
          </div>
        )}

        {/* =====================================================
            DETALLE DORADO INFERIOR
            Solo cuando el formulario está activo
           ===================================================== */}
        {formActivo && sections.decoration && (
          <div
            style={{
              display: 'flex',

              justifyContent: 'center',
              alignItems: 'center',

              gap: '8px',

              marginTop: nombre.trim().length > 0 ? '18px' : '16px',

              opacity: 0.75,
            }}
          >
            <div
              style={{
                width: '30px',
                height: '1px',

                backgroundColor: 'var(--event-decoration-line)',
              }}
            />

            <span
              style={{
                color: 'var(--event-decoration-color)',
                fontSize: '16px',
              }}
            >
              {texts.upload.decoration}
            </span>

            <div
              style={{
                width: '30px',
                height: '1px',

                backgroundColor: 'var(--event-decoration-line)',
              }}
            />
          </div>
        )}
      </div>
    </PhotoHero>
  );
}
