import React, { useEffect, useState } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

export default function UploadPhotos() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  useEffect(() => {
    console.log("Env project ID:", import.meta.env.VITE_PROJECTID);
  }, [])

  const uploadPhotos = async () => {
    setUploading(true);
    for (const file of files) {
      const storageRef = ref(storage, `boda/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
    }
    setUploading(false);
    setSuccess(true);
    setFiles([]);
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h2>¡Gracias por acompañarnos en nuestra boda! 🎉</h2>
      <p>Sube aquí tus mejores fotos 📸</p>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
      <br />
      <button onClick={uploadPhotos} disabled={uploading || !files.length}>
        {uploading ? "Subiendo..." : "Subir Fotos"}
      </button>
      {success && <p>✅ ¡Fotos subidas con éxito!</p>}
    </div>
  );
}