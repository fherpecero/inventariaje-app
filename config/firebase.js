import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBzdQAlX5cXJQdqUKBs3G3RaU-NtskrvGU",
  authDomain: "inventariaje-app.firebaseapp.com",
  projectId: "inventariaje-app",
  storageBucket: "inventariaje-app.firebasestorage.app",
  messagingSenderId: "576085892723",
  appId: "1:576085892723:web:8cedd74660418e117e9406"
};

const app = initializeApp(firebaseConfig);

// Inicializar Auth CON AsyncStorage para persistencia real
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);