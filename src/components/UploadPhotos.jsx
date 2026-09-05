import React, { useRef, useState, useEffect } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import backgroundOscarVerito from '../assets/backgroundOscarVerito.png';
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
      // FIREBASE TEMPORALMENTE DESACTIVADO

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
        height: '100vh',
        minHeight: '700px',

        backgroundImage: `url("${backgroundOscarVerito}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',

        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* =========================================================
          FORMULARIO SUPERPUESTO SOBRE LA ZONA DERECHA DEL BACKGROUND
          ========================================================= */}
      <div
        style={{
          position: 'absolute',

          // La zona blanca comienza aproximadamente al 65%
          left: '68%',
          width: '29%',

          // Posición vertical del formulario
          top: previewFiles.length > 0 ? '58%' : '60%',
          transform: 'translateY(-50%)',

          zIndex: 10,
          textAlign: 'center',

          fontFamily: 'Georgia, serif',
          color: '#3f4433',
        }}
      >
        {showAlert && (
          <ShowAlert alertMsg={alertMsg} color={alertColor} setShowAlert={setShowAlert} />
        )}

        {/* Ya NO ponemos el título porque está dibujado
            directamente en el nuevo background */}

        <div
          style={{
            marginBottom: '1.2rem',
          }}
        >
          <label
            htmlFor="nombre"
            style={{
              display: 'block',
              marginBottom: '0.7rem',
              fontSize: '16px',
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

              padding: '12px 16px',

              borderRadius: '10px',
              border: '1px solid rgba(154, 119, 52, 0.45)',

              backgroundColor: 'rgba(255, 255, 255, 0.75)',

              color: '#3f4433',
              fontSize: '15px',

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
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginTop: '1rem',
              alignItems: 'center',
            }}
          >
            {!loader && previewFiles.length === 0 && (
              <button
                onClick={handleClick}
                disabled={!canUpload}
                style={{
                  minWidth: '160px',
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
              <ModalPhotos
                previewFiles={previewFiles}
                handleRemove={handleRemove}
                uploading={uploading}
                canUpload={canUpload}
              />
            )}

            {previewFiles.length > 0 && (
              <button
                onClick={uploadPhotos}
                disabled={uploading || !canUpload}
                style={{
                  minWidth: '160px',
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
