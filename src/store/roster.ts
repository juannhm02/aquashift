import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_PERSONAS, Persona, Roster } from '../theme/colors';

const COLLECTION = 'roster2026';
// Documento centinela: marca si el roster ya se sembró con DEFAULT_PERSONAS,
// para que el primer dispositivo que arranca contra Firestore vacío no
// compita con los demás (cada uno intentaría sembrar a la vez).
const SEED_DOC = doc(db, '_meta', 'rosterSeed');

/**
 * Si el roster no se ha sembrado nunca (primera vez que se usa este proyecto
 * de Firebase), lo siembra una sola vez con DEFAULT_PERSONAS. La transacción
 * sobre SEED_DOC garantiza que, aunque varios dispositivos arranquen a la
 * vez, solo uno hace la siembra.
 */
async function seedIfNeeded(): Promise<void> {
  try {
    await runTransaction(db, async tx => {
      const seedSnap = await tx.get(SEED_DOC);
      if (seedSnap.exists()) return;
      tx.set(SEED_DOC, { seededAt: new Date().toISOString() });
      for (const [id, persona] of Object.entries(DEFAULT_PERSONAS)) {
        tx.set(doc(db, COLLECTION, id), persona);
      }
    });
  } catch {
    // Si la transacción falla (ej. sin conexión), no pasa nada: se reintenta
    // en el siguiente arranque y mientras tanto la app sigue con roster vacío.
  }
}

export function subscribeRoster(onChange: (roster: Roster) => void): () => void {
  seedIfNeeded();
  return onSnapshot(
    collection(db, COLLECTION),
    snapshot => {
      const roster: Roster = {};
      snapshot.forEach(d => {
        roster[d.id] = d.data() as Persona;
      });
      onChange(roster);
    },
    () => {
      // Sin conexión: se queda con el último roster conocido en memoria.
    }
  );
}

/** Crea o actualiza un socorrista (id = apodo). */
export async function upsertPersona(id: string, persona: Persona): Promise<void> {
  await setDoc(doc(db, COLLECTION, id), persona);
}

export async function removePersona(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
