import React, { useState } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import formbg from '../assets/backgroundformportrait.png';
import bryanerak from '../assets/BryaneraK.png';
import { storage } from '../firebase'; // Asegúrate de tener esta importación correcta

export default function UploadPhotos() {
  const [previewFiles, setPreviewFiles] = useState([]); // [{ file, url }]
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [nombre, setNombre] = useState('');

  const handleNameChange = (e) => {
    setNombre(e.target.value);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const previews = selectedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviewFiles(previews);
    setSuccess(false);
  };

  const handleRemove = (indexToRemove) => {
    const updated = previewFiles.filter((_, i) => i !== indexToRemove);
    setPreviewFiles(updated);
  };

  const uploadPhotos = async () => {
    setUploading(true);
    const folderName = nombre;

    for (const { file } of previewFiles) {
      const storageRef = ref(storage, `boda/${folderName}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
    }

    setUploading(false);
    setSuccess(true);
    setPreviewFiles([]);
  };

  return (
    <div className="body-container">
      <div className="container" style={{ flexBasis: '70%' }}>
        <img className="container-image" src={bryanerak} alt="fuentes-manuscritas" border="0" />
      </div>
      <div
        className="container-form"
        style={{
          backgroundImage: `url("${formbg}")`,
        }}
      >
        <div
          className="great-vibes-regular style-form"
          style={{
            top: previewFiles.length > 0 ? '25%' : '37%',
          }}
        >
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
              onChange={handleNameChange} // Necesitas crear esta función
            />
          </div>

          {nombre && nombre.length > 0 && (
            <>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} />
              {previewFiles.length > 0 && (
                <button onClick={uploadPhotos} disabled={uploading} style={styles.button}>
                  {uploading ? 'Subiendo...' : 'Subir Fotos'}
                </button>
              )}
              {success && <p style={styles.success}>✅ ¡Fotos subidas con éxito!</p>}
              {previewFiles.length > 0 && (
                <div>
                  <Slider
                    dots={true}
                    infinite={true}
                    speed={500}
                    slidesToShow={1}
                    slidesToScroll={1}
                  >
                    {previewFiles.map((img, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          width: '30%',
                        }}
                      >
                        <img src={img.url} alt={`Foto ${i + 1}`} height="250" />
                        <button
                          onClick={() => handleRemove(i)}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            zIndex: 10,
                          }}
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </Slider>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  button: {
    marginTop: '1rem',
    padding: '0.5rem 1.2rem',
    fontSize: '1rem',
    backgroundColor: '#b28d6c',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
  },
  success: {
    marginTop: '1rem',
    color: 'green',
    fontWeight: 'bold',
  },
};
