import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyBzdQAlX5cXJQdqUKBs3G3RaU-NtskrvGU",
  authDomain: "inventariaje-app.firebaseapp.com",
  projectId: "inventariaje-app",
  storageBucket: "inventariaje-app.firebasestorage.app",
  messagingSenderId: "576085892723",
  appId: "1:576085892723:web:8cedd74660418e117e9406"
};

// 🛡️ EL ESCUDO: Evitar inicializar Firebase dos veces durante el Hot Reload de Expo
let app;
let auth;

if (getApps().length === 0) {
  // 1. Es la primera vez que se abre la app
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  // 2. Acabas de guardar un archivo y Expo recargó la pantalla
  app = getApp();
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);