import React, { useState } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const ModalPhotos = ({ previewFiles, handleRemove, uploading, canUpload }) => {
  const [modal, setModal] = useState(false);

  const toggle = () => setModal(!modal);

  return (
    <>
      <Button
        style={{
          minWidth: '140px',
          padding: '0.5rem 1.5rem',
          fontWeight: '600',
          backgroundColor: uploading || !canUpload ? '#aaa' : '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading || !canUpload ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.3s ease',
        }}
        onClick={toggle}
      >
        Ver fotos (#{previewFiles.length})
      </Button>

      <Modal isOpen={modal} toggle={toggle} className="modal-xl-custom">
        <ModalHeader toggle={toggle}>
          Fotos seleccionadas
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#555' }}>
            Puedes eliminar una foto presionando la <strong>X</strong> en la esquina superior.
          </p>
        </ModalHeader>
        <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'center',
            }}
          >
            {previewFiles.map((img, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: '150px',
                  height: '150px',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <img
                  src={img.url}
                  alt={`Foto ${i + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <button
                  onClick={() => handleRemove(i)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '8px',
                    background: 'transparent',
                    color: 'red',
                    border: 'none',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    lineHeight: 1,
                    zIndex: 10,
                    padding: 0,
                  }}
                  aria-label="Eliminar foto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={toggle}>
            Aceptar
          </Button>{' '}
          <Button color="secondary" onClick={toggle}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
const styles = {
  button: {
    marginTop: '1rem',
    padding: '0.5rem 1.2rem',
    fontSize: '1rem',
    backgroundColor: '#353563',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
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

export default ModalPhotos;
