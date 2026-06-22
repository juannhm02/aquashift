import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type SwapStatus = 'pending' | 'accepted' | 'rejected';

export type SwapRequest = {
  id: number;
  from: string;
  to: string;
  day: number;
  month: 'june' | 'july' | 'august' | 'september';
  shift: string;
  userNote: string;
  aiMessage: string;
  status: SwapStatus;
  createdAt: string;
  hours?: number;
};

const COLLECTION = 'swapRequests2026';

export function subscribeSwaps(onChange: (swaps: SwapRequest[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    snapshot => onChange(snapshot.docs.map(d => d.data() as SwapRequest)),
    () => {
      // Sin conexión, reglas no configuradas, etc.: no rompe la app, solo se
      // queda con los últimos swaps que tuviera en memoria.
    }
  );
}

export async function addSwap(swap: SwapRequest): Promise<void> {
  await setDoc(doc(db, COLLECTION, String(swap.id)), swap);
}

export async function updateSwapStatus(
  id: number,
  status: SwapStatus,
  hours?: number
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, String(id)), {
    status,
    hours: hours !== undefined ? hours : deleteField(),
  });
}
