import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Persona, Roster } from '../theme/colors';
import {
  subscribeRoster,
  upsertPersona as upsertPersonaStore,
  removePersona as removePersonaStore,
} from './roster';

type RosterContextValue = {
  /** Roster actual (apodo -> Persona). Vacío hasta que termina de cargar. */
  roster: Roster;
  loading: boolean;
  upsertPersona: (id: string, persona: Persona) => Promise<void>;
  removePersona: (id: string) => Promise<void>;
};

const RosterContext = createContext<RosterContextValue | null>(null);

export function RosterProvider({ children }: { children: React.ReactNode }) {
  const [roster, setRoster] = useState<Roster>({});
  const [loading, setLoading] = useState(true);

  // Suscripción en tiempo real a Firestore: un alta/baja/edición de
  // socorrista hecha en OTRO dispositivo (panel de admin) llega aquí sola.
  useEffect(() => {
    const unsubscribe = subscribeRoster(r => {
      setRoster(r);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const upsertPersona = useCallback(async (id: string, persona: Persona) => {
    await upsertPersonaStore(id, persona);
    // No hace falta setRoster aquí: la suscripción de arriba ya lo recibe.
  }, []);

  const removePersona = useCallback(async (id: string) => {
    await removePersonaStore(id);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <RosterContext.Provider value={{ roster, loading, upsertPersona, removePersona }}>
      {children}
    </RosterContext.Provider>
  );
}

export function useRoster(): RosterContextValue {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error('useRoster debe usarse dentro de <RosterProvider>');
  return ctx;
}
