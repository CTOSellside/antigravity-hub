import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBD9bunao2_3-BK9WU03vxo-YoNeayLZ0w",
    authDomain: "antigravity-hub.firebaseapp.com",
    projectId: "antigravity-cto",
    storageBucket: "antigravity-cto.appspot.com",
    messagingSenderId: "598703083226",
    appId: "1:598703083226:web:8fec0341265d4c6693e5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
