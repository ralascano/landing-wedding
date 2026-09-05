import React, { useRef, useState, useEffect } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import backgroundOscarVerito from '../assets/backgroundOscarVerito.png';
import backgroundOscarVeritoMobile from '../assets/backgroundOscarVeritoMobile.png';
import ModalPhotos from './ModalPhotos';
import { Spinner } from 'reactstrap';
import ShowAlert from './ShowAlert';
import { storage } from '../firebase';

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

export default function UploadPhotos() {
  const [previewFiles, setPreviewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loader, setLoader] = useState(false);
  const [canUpload, setCanUpload] = useState(true);
  const inputRef = useRef(null);

  const [nombre, setNombre] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertColor, setAlertColor] = useState('');

  const maxFiles = 50;

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const handleNameChange = (e) => {
    setNombre(e.target.value);
  };

  const handleFileChange = async (e) => {
    setLoader(true);

    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length > maxFiles) {
      setAlertMsg('Máximo 50 fotos al mismo tiempo.');
      setAlertColor('warning');
      setShowAlert(true);
      setLoader(false);
      return;
    }

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
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
      setAlertMsg('Error al subir las fotos. Intenta nuevamente.');
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
      setAlertMsg('Por favor espera un momento antes de subir nuevas fotos.');
      setAlertColor('warning');
      setShowAlert(true);
      return;
    }

    const nombreTransformado = limpiarYTransformarNombre(nombre);

    if (!nombreTransformado) {
      setAlertMsg('Por favor ingresa un nombre válido sin emojis ni caracteres especiales.');
      setAlertColor('warning');
      setShowAlert(true);
      return;
    }

    setUploading(true);
    setCanUpload(false);

    try {
      //FIREBASE TEMPORALMENTE DESACTIVADO

      for (const { file } of previewFiles) {
        const storageRef = ref(storage, `boda/${nombreTransformado}/${Date.now()}-${file.name}`);

        await uploadBytes(storageRef, file);
      }

      setAlertMsg('✅ ¡Fotos subidas con éxito! Por favor espera 2 minutos antes de subir más.');
      setAlertColor('primary');
      setShowAlert(true);
      setPreviewFiles([]);
    } catch (error) {
      console.error('Error al subir imágenes:', error);
      setAlertMsg('Error al subir las fotos. Intenta nuevamente.');
      setAlertColor('danger');
      setShowAlert(true);
    } finally {
      setUploading(false);

      setTimeout(() => {
        setCanUpload(true);
      }, 120000);
    }
  };

  const handleClick = () => {
    if (!canUpload) {
      setAlertMsg('Por favor espera antes de subir nuevas fotos.');
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
    <div
      style={{
        width: '100%',
        minHeight: '100svh',

        backgroundImage: `url("${isMobile ? backgroundOscarVeritoMobile : backgroundOscarVerito}")`,

        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',

        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* FORMULARIO */}
      <div
        style={{
          position: 'absolute',

          ...(isMobile
            ? {
                /*
                 * MOBILE
                 * La fotografía ocupa aproximadamente
                 * la mitad superior del nuevo background.
                 * El formulario queda en la zona crema.
                 */
                top: previewFiles.length > 0 ? '74%' : '76%',
                left: '50%',
                transform: 'translate(-50%, -50%)',

                width: '82%',
                maxWidth: '420px',
              }
            : {
                /*
                 * DESKTOP
                 * Formulario sobre el panel derecho.
                 */
                top: previewFiles.length > 0 ? '58%' : '60%',
                left: '66%',
                transform: 'translateY(-50%)',

                width: '29%',
                maxWidth: '550px',
              }),

          zIndex: 10,
          textAlign: 'center',
          fontFamily: 'Georgia, serif',
          color: '#3f4433',
          boxSizing: 'border-box',
        }}
      >
        {showAlert && (
          <ShowAlert alertMsg={alertMsg} color={alertColor} setShowAlert={setShowAlert} />
        )}

        <div
          style={{
            marginBottom: isMobile ? '0.8rem' : '1.2rem',
          }}
        >
          <label
            htmlFor="nombre"
            style={{
              display: 'block',
              marginBottom: '0.7rem',

              fontSize: isMobile ? '14px' : '16px',
              lineHeight: '1.4',

              color: '#4b4b3b',
            }}
          >
            Agrega tu nombre o apodo para saber quién subió la foto:
          </label>

          <input
            type="text"
            id="nombre"
            name="nombre"
            placeholder="Tu nombre o apodo"
            onChange={handleNameChange}
            value={nombre}
            style={{
              width: '100%',
              boxSizing: 'border-box',

              padding: isMobile ? '11px 14px' : '12px 16px',

              borderRadius: '10px',
              border: '1px solid rgba(154, 119, 52, 0.45)',

              backgroundColor: 'rgba(255, 255, 255, 0.82)',

              color: '#3f4433',
              fontSize: isMobile ? '16px' : '15px',

              outline: 'none',

              boxShadow: '0 3px 12px rgba(0, 0, 0, 0.05)',
            }}
          />
        </div>

        {loader && (
          <div
            style={{
              margin: '15px 0',
            }}
          >
            <Spinner>Loading...</Spinner>
          </div>
        )}

        {nombre && nombre.length > 0 && (
          <div
            style={{
              display: 'flex',

              // En móvil los elementos se acomodan
              // verticalmente.
              flexDirection: isMobile ? 'column' : 'row',

              justifyContent: 'center',
              alignItems: 'center',

              gap: isMobile ? '0.7rem' : '1rem',

              flexWrap: 'wrap',

              marginTop: isMobile ? '0.7rem' : '1rem',

              width: '100%',
            }}
          >
            {!loader && previewFiles.length === 0 && (
              <button
                onClick={handleClick}
                disabled={!canUpload}
                style={{
                  width: isMobile ? '100%' : 'auto',

                  minWidth: isMobile ? 'unset' : '160px',

                  maxWidth: isMobile ? '320px' : 'none',

                  padding: '11px 24px',

                  fontSize: '15px',
                  fontWeight: '600',
                  letterSpacing: '0.5px',

                  cursor: canUpload ? 'pointer' : 'not-allowed',

                  backgroundColor: canUpload ? '#60643d' : '#aaa',

                  color: '#fff',

                  border: canUpload ? '1px solid #a98542' : '1px solid #aaa',

                  borderRadius: '8px',

                  boxShadow: canUpload ? '0 4px 12px rgba(60, 65, 40, 0.20)' : 'none',

                  transition: 'all 0.3s ease',
                }}
              >
                Seleccionar Fotos
              </button>
            )}

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              ref={inputRef}
              style={{
                display: 'none',
              }}
              disabled={!canUpload}
            />

            {previewFiles.length > 0 && (
              <div
                style={{
                  width: isMobile ? '100%' : 'auto',

                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <ModalPhotos
                  previewFiles={previewFiles}
                  handleRemove={handleRemove}
                  uploading={uploading}
                  canUpload={canUpload}
                />
              </div>
            )}

            {previewFiles.length > 0 && (
              <button
                onClick={uploadPhotos}
                disabled={uploading || !canUpload}
                style={{
                  width: isMobile ? '100%' : 'auto',

                  maxWidth: isMobile ? '320px' : 'none',

                  minWidth: isMobile ? 'unset' : '160px',

                  padding: '11px 24px',

                  fontSize: '15px',
                  fontWeight: '600',
                  letterSpacing: '0.5px',

                  backgroundColor: uploading || !canUpload ? '#aaa' : '#60643d',

                  color: '#fff',

                  border: uploading || !canUpload ? '1px solid #aaa' : '1px solid #a98542',

                  borderRadius: '8px',

                  cursor: uploading || !canUpload ? 'not-allowed' : 'pointer',

                  boxShadow: uploading || !canUpload ? 'none' : '0 4px 12px rgba(60, 65, 40, 0.20)',

                  transition: 'all 0.3s ease',
                }}
              >
                {uploading ? 'Subiendo...' : 'Subir Fotos'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
