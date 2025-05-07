import './App.css'
import UploadPhotos from './components/UploadPhotos'
import { getAuth, signInAnonymously } from "firebase/auth";

function App() {

  const auth = getAuth();
signInAnonymously(auth)
  .then(() => {
    console.log("Autenticado anónimamente");
  })
  .catch((error) => {
    console.error("Error en autenticación:", error);
  });

  return (
    <div>
    <UploadPhotos />
  </div>
  )
}

export default App
