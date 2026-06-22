import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'pushTokens2026';

/**
 * Guarda en Firestore el Expo push token del dispositivo de `userId`, para
 * que cualquier otro dispositivo pueda mandarle una notificación push real
 * (ver sendExpoPush en notifications.ts). Se sobrescribe cada vez que el
 * usuario hace login, así si cambia de móvil o reinstala la app, el token
 * siempre es el del dispositivo más reciente.
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  await setDoc(doc(db, COLLECTION, userId), {
    token,
    updatedAt: new Date().toISOString(),
  });
}

/** Lee el último Expo push token guardado para `userId`, o null si no tiene. */
export async function getPushToken(userId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, userId));
    if (!snap.exists()) return null;
    const data = snap.data() as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}
