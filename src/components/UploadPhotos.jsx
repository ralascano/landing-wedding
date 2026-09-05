import React, { useRef, useState, useEffect } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import backgroundOscarVerito from '../assets/backgroundOscarVerito.jpg';
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

  const [formActivo, setFormActivo] = useState(false);

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
        width: '100vw',
        height: '100svh',
        minHeight: '100svh',

        backgroundImage: `url("${backgroundOscarVerito}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',

        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* =====================================================
          OVERLAY
          Solo aparece cuando el usuario activa el formulario
         ===================================================== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,

          backgroundColor: formActivo ? 'rgba(20, 24, 12, 0.30)' : 'rgba(20, 24, 12, 0)',

          backdropFilter: formActivo ? 'blur(2px)' : 'blur(0px)',

          WebkitBackdropFilter: formActivo ? 'blur(2px)' : 'blur(0px)',

          transition: 'background-color 0.45s ease, backdrop-filter 0.45s ease',

          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* =====================================================
          FORMULARIO
          PASO 1 -> pequeño y abajo
          PASO 2 -> card completo y centrado
         ===================================================== */}
      <div
        style={{
          position: 'absolute',

          left: '50%',

          top: formActivo ? '50%' : isMobile ? '82%' : '84%',

          transform: 'translate(-50%, -50%)',

          width: formActivo ? (isMobile ? '88%' : '390px') : isMobile ? '86%' : '350px',

          maxWidth: isMobile ? '420px' : '390px',

          padding: formActivo
            ? isMobile
              ? '22px 18px 20px'
              : '28px 28px 24px'
            : isMobile
              ? '14px 16px'
              : '15px 18px',

          boxSizing: 'border-box',

          background: formActivo
            ? 'linear-gradient(145deg, rgba(255,253,247,0.91) 0%, rgba(247,240,221,0.86) 100%)'
            : 'rgba(255,253,247,0.82)',

          backdropFilter: formActivo ? 'blur(12px)' : 'blur(7px)',

          WebkitBackdropFilter: formActivo ? 'blur(12px)' : 'blur(7px)',

          border: '1px solid rgba(190,148,67,0.65)',

          borderRadius: formActivo ? '20px' : '14px',

          boxShadow: formActivo
            ? '0 18px 50px rgba(15,18,8,0.38)'
            : '0 8px 25px rgba(15,18,8,0.24)',

          textAlign: 'center',

          fontFamily: 'Georgia, serif',
          color: '#44492f',

          transition:
            'top 0.45s ease, width 0.45s ease, padding 0.45s ease, background 0.45s ease, border-radius 0.45s ease, box-shadow 0.45s ease',

          zIndex: 10,
        }}
      >
        {/* =====================================================
            CONTENIDO QUE SOLO APARECE CUANDO SE ACTIVA
           ===================================================== */}
        {formActivo && (
          <>
            <div
              style={{
                width: '42px',
                height: '2px',

                margin: '0 auto 14px',

                background: 'linear-gradient(90deg, transparent, #b58b3b, transparent)',
              }}
            />

            <h2
              style={{
                margin: '0 0 6px',

                fontFamily: 'Georgia, serif',

                fontSize: isMobile ? '21px' : '26px',

                fontWeight: '400',

                lineHeight: '1.2',

                color: '#8d692b',
              }}
            >
              Comparte tus recuerdos
            </h2>

            <p
              style={{
                margin: '0 0 20px',

                fontFamily: 'Georgia, serif',

                fontSize: isMobile ? '13px' : '14px',

                lineHeight: '1.4',

                color: '#606347',
              }}
            >
              Sube aquí tus mejores fotos 📸
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
            <ShowAlert alertMsg={alertMsg} color={alertColor} setShowAlert={setShowAlert} />
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

                fontFamily: 'Georgia, serif',

                fontSize: isMobile ? '13px' : '14px',

                lineHeight: '1.4',

                color: '#4c5137',
              }}
            >
              Tu nombre o apodo
            </label>
          )}

          <input
            type="text"
            id="nombre"
            name="nombre"
            placeholder={formActivo ? 'Ej. Ricardo' : 'Ingresa tu nombre o apodo'}
            onFocus={() => setFormActivo(true)}
            onChange={handleNameChange}
            value={nombre}
            style={{
              width: '100%',

              boxSizing: 'border-box',

              padding: formActivo ? (isMobile ? '12px 14px' : '13px 15px') : '11px 14px',

              backgroundColor: 'rgba(255,255,255,0.90)',

              border: '1px solid rgba(167,133,66,0.55)',

              borderRadius: '10px',

              outline: 'none',

              fontFamily: 'Georgia, serif',

              fontSize: isMobile ? '16px' : '15px',

              color: '#3f432e',

              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',

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
            <Spinner>Loading...</Spinner>
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
                    ? 'linear-gradient(135deg, #697047 0%, #4d5432 100%)'
                    : '#aaa',

                  color: '#fff',

                  border: canUpload ? '1px solid #b69149' : '1px solid #aaa',

                  borderRadius: '10px',

                  fontFamily: 'Georgia, serif',

                  fontSize: '14px',

                  fontWeight: '600',

                  letterSpacing: '0.4px',

                  cursor: canUpload ? 'pointer' : 'not-allowed',

                  boxShadow: canUpload ? '0 7px 18px rgba(48,54,30,0.22)' : 'none',

                  transition: 'all 0.3s ease',
                }}
              >
                Seleccionar Fotos
              </button>
            )}

            {/* INPUT FILE OCULTO */}
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

            {/* =================================================
                PREVIEW
               ================================================= */}
            {previewFiles.length > 0 && (
              <div
                style={{
                  width: '100%',

                  display: 'flex',

                  justifyContent: 'center',
                  alignItems: 'center',
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
                      ? '#aaa'
                      : 'linear-gradient(135deg, #697047 0%, #4d5432 100%)',

                  color: '#fff',

                  border: uploading || !canUpload ? '1px solid #aaa' : '1px solid #b69149',

                  borderRadius: '10px',

                  fontFamily: 'Georgia, serif',

                  fontSize: '14px',

                  fontWeight: '600',

                  letterSpacing: '0.4px',

                  cursor: uploading || !canUpload ? 'not-allowed' : 'pointer',

                  boxShadow: uploading || !canUpload ? 'none' : '0 7px 18px rgba(48,54,30,0.22)',

                  transition: 'all 0.3s ease',
                }}
              >
                {uploading ? 'Subiendo...' : 'Subir Fotos'}
              </button>
            )}
          </div>
        )}

        {/* =====================================================
            DETALLE DORADO INFERIOR
            Solo cuando el formulario está activo
           ===================================================== */}
        {formActivo && (
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

                backgroundColor: '#ad873e',
              }}
            />

            <span
              style={{
                color: '#9a752f',
                fontSize: '16px',
              }}
            >
              ♡
            </span>

            <div
              style={{
                width: '30px',
                height: '1px',

                backgroundColor: '#ad873e',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
