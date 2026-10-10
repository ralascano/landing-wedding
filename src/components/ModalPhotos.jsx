import { formatText } from '../config/format-text';
import React, { useState } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const ModalPhotos = ({ config, previewFiles, handleRemove, uploading, canUpload }) => {
  const texts = config.texts.preview;
  const [modal, setModal] = useState(false);

  const toggle = () => setModal(!modal);

  return (
    <>
      <Button
        style={{
          minWidth: '140px',
          padding: '0.5rem 1.5rem',
          fontWeight: '600',
          backgroundColor:
            uploading || !canUpload ? 'var(--event-disabled)' : 'var(--event-preview-button)',
          color: 'var(--event-preview-text)',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading || !canUpload ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.3s ease',
        }}
        onClick={toggle}
      >
        {formatText(texts.open, { count: previewFiles.length })}
      </Button>

      <Modal isOpen={modal} toggle={toggle} className="modal-xl-custom">
        <ModalHeader toggle={toggle} closeAriaLabel={texts.close}>
          {texts.title}
          <p
            style={{
              fontSize: '0.9rem',
              marginBottom: '1rem',
              color: 'var(--event-preview-muted)',
            }}
          >
            {texts.instructionBefore}
            <strong>{texts.removeSymbol}</strong>
            {texts.instructionAfter}
          </p>
        </ModalHeader>
        <ModalBody style={{ maxHeight: config.gallery.modalMaxHeight, overflowY: 'auto' }}>
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
                  width: config.gallery.thumbnailSize,
                  height: config.gallery.thumbnailSize,
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  boxShadow: 'var(--event-preview-shadow)',
                }}
              >
                <img
                  src={img.url}
                  alt={formatText(texts.imageAlt, { number: i + 1 })}
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
                    color: 'var(--event-preview-remove)',
                    border: 'none',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    lineHeight: 1,
                    zIndex: 10,
                    padding: 0,
                  }}
                  aria-label={texts.removeLabel}
                >
                  {texts.removeButton}
                </button>
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={toggle}>
            {texts.confirm}
          </Button>{' '}
          <Button color="secondary" onClick={toggle}>
            {texts.cancel}
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
