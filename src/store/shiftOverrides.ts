import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SeasonMonth } from '../data/season';

/**
 * Turnos editados desde el panel de administración (mañana/tarde/fin de
 * semana de los socorristas con horario variable). Se guardan por mes y día,
 * con el mismo formato que los datos estáticos de src/data/shifts.ts
 * (array de turnos del día, cada turno "A-B" o "A"). Si un día tiene una
 * entrada aquí, sustituye por completo a la entrada estática de ese día;
 * si no, se sigue usando el dato estático (ver getEffectiveData más abajo).
 */
export type ShiftOverrides = Partial<Record<SeasonMonth, Record<number, string[]>>>;

const COLLECTION = 'shiftOverrides2026';

function docId(month: SeasonMonth, day: number): string {
  return `${month}_${day}`;
}

/**
 * Igual que con los cambios de turno: los overrides viven en Firestore para
 * que una edición del panel de admin (o una sustitución aceptada desde
 * NotificationsScreen) se vea en el calendario de todos los dispositivos,
 * no solo en el del admin. `subscribeShiftOverrides` sustituye al antiguo
 * `loadShiftOverrides()`. Se usa una sola vez, en ShiftOverridesContext.
 */
export function subscribeShiftOverrides(onChange: (overrides: ShiftOverrides) => void): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    snapshot => {
      const overrides: ShiftOverrides = {};
      snapshot.forEach(d => {
        const data = d.data() as { month: SeasonMonth; day: number; raw: string[] };
        const monthOverrides = overrides[data.month] ?? (overrides[data.month] = {});
        monthOverrides[data.day] = data.raw;
      });
      onChange(overrides);
    },
    () => {
      // Sin conexión: se queda con el último estado conocido en memoria.
    }
  );
}

/** Guarda (o borra, si raw queda vacío) los turnos de un día concreto. */
export async function setDayShifts(
  month: SeasonMonth,
  day: number,
  raw: string[]
): Promise<void> {
  const ref = doc(db, COLLECTION, docId(month, day));
  if (raw.length === 0) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { month, day, raw });
  }
}

/** Combina el dato estático del mes con los overrides guardados (el override gana si existe para ese día). */
export function getEffectiveData(
  month: SeasonMonth,
  staticData: Record<number, string[]>,
  overrides: ShiftOverrides
): Record<number, string[]> {
  const monthOverrides = overrides[month];
  if (!monthOverrides) return staticData;
  return { ...staticData, ...monthOverrides };
}
