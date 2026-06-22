import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS, AppColors } from './colors';

export type Scheme = 'light' | 'dark';

const STORAGE_KEY = 'color_scheme_v1';

type ThemeContextValue = {
  scheme: Scheme;
  colors: AppColors;
  toggleScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  colors: LIGHT_COLORS,
  toggleScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [scheme, setScheme] = useState<Scheme>(systemScheme === 'dark' ? 'dark' : 'light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark') setScheme(saved);
      })
      .finally(() => setLoaded(true));
  }, []);

  function toggleScheme() {
    setScheme(prev => {
      const next: Scheme = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }

  const colors = scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const value = useMemo(() => ({ scheme, colors, toggleScheme }), [scheme, colors]);

  // Evita un parpadeo claro→oscuro mientras se lee la preferencia guardada.
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
