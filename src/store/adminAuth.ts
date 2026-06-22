import { doc, runTransaction, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Cuenta de administración, completamente separada del roster de
// socorristas/correturnos (no aparece en la lista del login normal, ver
// LoginScreen.tsx): solo quien conozca este usuario+contraseña puede entrar
// en /admin. Vive en Firestore (no en AsyncStorage) para que sea la misma
// cuenta sin importar desde qué móvil se entre a administrar.
const ADMIN_DOC = doc(db, '_meta', 'adminAuth');

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin2026';

type AdminCredentials = { username: string; password: string };

/**
 * Devuelve las credenciales actuales, sembrando las de por defecto la
 * primera vez (si el documento no existe todavía). La transacción evita que
 * dos dispositivos arrancando a la vez se pisen al sembrar.
 */
export async function getAdminCredentials(): Promise<AdminCredentials> {
  try {
    return await runTransaction(db, async tx => {
      const snap = await tx.get(ADMIN_DOC);
      if (snap.exists()) return snap.data() as AdminCredentials;
      const seed: AdminCredentials = { username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD };
      tx.set(ADMIN_DOC, seed);
      return seed;
    });
  } catch {
    // Sin conexión: se usan las credenciales por defecto para no bloquear
    // por completo (no se podrá entrar si ya se cambiaron en otro momento
    // y este dispositivo no tiene caché, pero evita un crash).
    return { username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD };
  }
}

export async function setAdminCredentials(username: string, password: string): Promise<void> {
  await setDoc(ADMIN_DOC, { username, password });
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const current = await getAdminCredentials();
  return (
    username.trim().toLowerCase() === current.username.trim().toLowerCase() &&
    password === current.password
  );
}
