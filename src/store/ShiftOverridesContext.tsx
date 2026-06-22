import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { SeasonMonth } from '../data/season';
import {
  ShiftOverrides,
  subscribeShiftOverrides,
  setDayShifts as setDayShiftsStore,
} from './shiftOverrides';

type ShiftOverridesContextValue = {
  overrides: ShiftOverrides;
  loading: boolean;
  setDayShifts: (month: SeasonMonth, day: number, raw: string[]) => Promise<void>;
};

const ShiftOverridesContext = createContext<ShiftOverridesContextValue | null>(null);

export function ShiftOverridesProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<ShiftOverrides>({});
  const [loading, setLoading] = useState(true);

  // Suscripción en tiempo real a Firestore: una edición del admin (o una
  // sustitución aceptada) hecha en OTRO dispositivo llega aquí sola.
  useEffect(() => {
    const unsubscribe = subscribeShiftOverrides(o => {
      setOverrides(o);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const setDayShifts = useCallback(async (month: SeasonMonth, day: number, raw: string[]) => {
    await setDayShiftsStore(month, day, raw);
    // No hace falta setOverrides aquí: la suscripción de arriba ya lo recibe.
  }, []);

  return (
    <ShiftOverridesContext.Provider value={{ overrides, loading, setDayShifts }}>
      {children}
    </ShiftOverridesContext.Provider>
  );
}

export function useShiftOverrides(): ShiftOverridesContextValue {
  const ctx = useContext(ShiftOverridesContext);
  if (!ctx) throw new Error('useShiftOverrides debe usarse dentro de <ShiftOverridesProvider>');
  return ctx;
}
