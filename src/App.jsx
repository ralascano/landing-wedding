import './App.css';
import UploadPhotos from './components/UploadPhotos';
import { getAuth, signInAnonymously } from 'firebase/auth';

function App() {
  return <UploadPhotos />;
}

export default App;
