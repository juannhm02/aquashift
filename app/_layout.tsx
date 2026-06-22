import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RosterProvider } from '../src/store/RosterContext';
import { ShiftOverridesProvider } from '../src/store/ShiftOverridesContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { initNotificationChannel } from '../src/store/notifications';

function RootStack() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // Canal de notificaciones de Android: se crea una vez al arrancar la app
  // (ver src/store/notifications.ts), antes de que se pueda enviar ningún
  // cambio de turno.
  useEffect(() => {
    initNotificationChannel();
  }, []);

  return (
    <ThemeProvider>
      <RosterProvider>
        <ShiftOverridesProvider>
          <RootStack />
        </ShiftOverridesProvider>
      </RosterProvider>
    </ThemeProvider>
  );
}
