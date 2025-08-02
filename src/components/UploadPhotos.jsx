import React, { useRef, useState, useEffect } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import formbg from '../assets/backgroundformportrait.png';
import bryanerak from '../assets/BryaneraK.png';
import ModalPhotos from './ModalPhotos';
import { Button, Spinner } from 'reactstrap';
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

  return camelCase;
}

export default function UploadPhotos() {
  const [previewFiles, setPreviewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loader, setLoader] = useState(false);
  const [canUpload, setCanUpload] = useState(true);
  const [messageUpload, setMessageUpload] = useState(false);
  const inputRef = useRef(null);
  const [nombre, setNombre] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertColor, setAlertColor] = useState('');

  const maxFiles = 10;

  const handleNameChange = (e) => {
    setNombre(e.target.value);
  };

  const handleFileChange = async (e) => {
    setLoader(true);
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length > maxFiles) {
      setMessageUpload(true);
      setTimeout(() => {
        setMessageUpload(false);
      }, 1500);
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
      alert();
      setAlertMsg('Por favor ingresa un nombre válido sin emojis ni caracteres especiales.');
      setAlertColor('warning');
      setShowAlert(true);
      return;
    }

    setUploading(true);
    setCanUpload(false);

    try {
      for (const { file } of previewFiles) {
        const storageRef = ref(storage, `boda/${nombreTransformado}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
      }
      setAlertMsg('✅ ¡Fotos subidas con éxito! Por favor espera 2 minutos antes de subir más.');
      setAlertColor('');
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
    <div className="body-container">
      <div className="container" style={{ flexBasis: '70%' }}>
        <img className="container-image" src={bryanerak} alt="fuentes-manuscritas" />
      </div>
      <div className="container-form" style={{ backgroundImage: `url("${formbg}")` }}>
        <div
          className="great-vibes-regular style-form"
          style={{ top: previewFiles.length > 0 ? '25%' : '37%' }}
        >
          {showAlert && (
            <ShowAlert alertMsg={alertMsg} color={alertColor} setShowAlert={setShowAlert} />
          )}
          <h2>¡Gracias por acompañarnos en nuestra Boda! </h2>
          <p>Sube aquí tus mejores fotos 📸</p>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="nombre" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Agrega tu nombre o apodo para saber quién subió la foto:
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              placeholder="Tu nombre o apodo"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #ccc',
              }}
              onChange={handleNameChange}
              value={nombre}
            />
          </div>
          {messageUpload && `Máximo ${maxFiles} fotos.`}
          {loader && <Spinner>Loading...</Spinner>}
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
                    minWidth: '140px',
                    padding: '0.5rem 1.5rem',
                    fontWeight: '600',
                    cursor: canUpload ? 'pointer' : 'not-allowed',
                    backgroundColor: canUpload ? '#1976d2' : '#aaa',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  Subir Fotos
                </button>
              )}

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                ref={inputRef}
                style={{ display: 'none' }}
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
                    minWidth: '140px',
                    padding: '0.5rem 1.5rem',
                    fontWeight: '600',
                    backgroundColor: '#42814C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: uploading || !canUpload ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  {uploading ? 'Subiendo...' : 'Subir Fotos'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
