import React, { useState } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

export default function UploadPhotos() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const uploadPhotos = async () => {
    setUploading(true);
    const forderName = "usuario";
    for (const file of files) {
      const storageRef = ref(storage, `boda/${forderName}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
    }
    setUploading(false);
    setSuccess(true);
    setFiles([]);
  };

  return (
    <div style={styles.container}>
      <div style={styles.overlay}>
        <h2>¡Gracias por acompañarnos en nuestra boda! 🎉</h2>
        <p>Sube aquí tus mejores fotos 📸</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
        <br />
        <button
          onClick={uploadPhotos}
          disabled={uploading || !files.length}
          style={styles.button}
        >
          {uploading ? "Subiendo..." : "Subir Fotos"}
        </button>
        {success && <p style={styles.success}>✅ ¡Fotos subidas con éxito!</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundImage:
      "url('/background-landscape.jpg')", // Landscape por defecto
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: "1rem",
    padding: "2rem",
    maxWidth: "90%",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
  },
  button: {
    marginTop: "1rem",
    padding: "0.5rem 1.2rem",
    fontSize: "1rem",
    backgroundColor: "#b28d6c", // tono romántico/dorado
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  success: {
    marginTop: "1rem",
    color: "green",
    fontWeight: "bold",
  },
};