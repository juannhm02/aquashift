import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Configuración del proyecto Firebase "piscina-turnos" (ver
 * console.firebase.google.com). No hay datos sensibles aquí: este objeto es
 * público por diseño (el cliente lo necesita para conectar), la seguridad
 * real la dan las reglas de Firestore, no el secreto de esta config.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCOfMKZ9NGBZPgSXVksPJ2p-L2As_XBC2s',
  authDomain: 'piscina-turnos.firebaseapp.com',
  projectId: 'piscina-turnos',
  storageBucket: 'piscina-turnos.firebasestorage.app',
  messagingSenderId: '633893104818',
  appId: '1:633893104818:web:2fa8e93669fd4a308b2dab',
};

// getApps()/getApp() evita inicializar dos veces con Fast Refresh en Expo.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(firebaseApp);
