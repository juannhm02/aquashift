import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { canonicalRaw } from '../data/shifts';
import { MONTH_NAME, SeasonMonth } from '../data/season';

/**
 * Notificaciones locales (no remotas): no necesitan backend ni token de
 * push, solo permiso del sistema operativo. Sirven para avisar en el propio
 * dispositivo de que ha entrado una solicitud de cambio, además del aviso
 * dentro de la app (badge en la pestaña "Avisos").
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// En Android 8+ las notificaciones necesitan un "canal"; sin esto, scheduleNotificationAsync
// no falla pero la notificación no llega a mostrarse. Se crea una sola vez al arrancar la
// app (ver app/_layout.tsx). En iOS no hace nada (no existe el concepto de canal).
export async function initNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Cambios de turno',
      importance: Notifications.AndroidImportance.HIGH,
    });
  } catch {
    // No crítico: si falla, el resto de la app sigue funcionando igual.
  }
}

let permissionRequested = false;

/** Pide permiso de notificaciones una sola vez por sesión de la app. */
export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionRequested && !current.canAskAgain) return false;
    permissionRequested = true;
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  } catch {
    // En web o entornos sin soporte, simplemente no se notifica.
    return false;
  }
}

/**
 * Notifica en el dispositivo que se ha enviado una solicitud de cambio de
 * turno, dirigida a `to`. Se dispara justo tras guardar la solicitud (ver
 * SwapRequestModal.submitRequest). Si no hay permiso concedido, no hace nada.
 */
export async function notifySwapRequest(params: {
  from: string;
  to: string;
  day: number;
  month: SeasonMonth;
  shift: string;
}): Promise<void> {
  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const { from, to, day, month, shift } = params;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nueva solicitud de cambio',
        body: `${from} te pide cambiar el turno del ${day} de ${MONTH_NAME[month]} (${canonicalRaw(shift)}). Toca "Avisos" para responder a ${to}.`,
        sound: Platform.OS === 'android' ? undefined : true,
      },
      trigger: null, // null = inmediata
    });
  } catch {
    // Si falla el scheduling (p.ej. permiso revocado entre medias), no
    // bloquea el envío de la solicitud: la notificación es un extra, no
    // el mecanismo principal (ese es el badge de "Avisos").
  }
}
