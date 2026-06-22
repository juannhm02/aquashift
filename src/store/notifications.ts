import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { canonicalRaw } from '../data/shifts';
import { MONTH_NAME, SeasonMonth } from '../data/season';
import { getPushToken, savePushToken } from './pushTokens';

/**
 * Notificaciones: usamos expo-notifications solo para pedir permiso del
 * sistema y, en notifySwapRequest/notifySwapResponse, para enviar un PUSH
 * REAL (a través del servicio de Expo) al móvil del destinatario, no una
 * notificación local en el propio dispositivo. Necesita que el destinatario
 * tenga guardado su Expo push token en Firestore (ver registerPushToken,
 * llamado al hacer login en LoginScreen.tsx).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// En Android 8+ las notificaciones necesitan un "canal"; sin esto, las push
// llegan al sistema pero no se muestran. Se crea una sola vez al arrancar la
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
 * Pide permiso y, si lo concede, obtiene el Expo push token del dispositivo
 * y lo guarda en Firestore asociado a `userId`. Se llama al hacer login (ver
 * LoginScreen.tsx) para que el token guardado sea siempre el del último
 * dispositivo/sesión de ese socorrista.
 *
 * Nota: las notificaciones push remotas requieren una development/production
 * build de EAS (no funcionan dentro de la app Expo Go a partir del SDK 53).
 * Si se ejecuta desde Expo Go, esto falla en silencio y la app sigue
 * funcionando igual, simplemente sin push reales.
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    const granted = await ensureNotificationPermissions();
    if (!granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await savePushToken(userId, token);
  } catch {
    // P.ej. en Expo Go (sin soporte de push remoto) o sin conexión: no
    // bloquea el login, el usuario simplemente no recibirá push reales.
  }
}

/** Envía un push real (via servicio de Expo) al último dispositivo conocido de `to`. */
async function sendExpoPush(to: string, title: string, body: string): Promise<void> {
  try {
    const token = await getPushToken(to);
    if (!token) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: 'default',
        channelId: 'default',
      }),
    });
  } catch {
    // Sin conexión o servicio de Expo caído: la solicitud ya quedó guardada
    // en Firestore, así que `to` la verá en "Avisos" aunque no le llegue el push.
  }
}

/**
 * Manda un push real al móvil de `to` avisando de que `from` le pide
 * cambiar un turno. Se dispara justo tras guardar la solicitud (ver
 * SwapRequestModal.submitRequest).
 */
export async function notifySwapRequest(params: {
  from: string;
  to: string;
  day: number;
  month: SeasonMonth;
  shift: string;
}): Promise<void> {
  const { from, to, day, month, shift } = params;
  await sendExpoPush(
    to,
    'Nueva solicitud de cambio',
    `${from} te pide cambiar el turno del ${day} de ${MONTH_NAME[month]} (${canonicalRaw(shift)}). Toca "Avisos" para responder.`
  );
}

/**
 * Manda un push real al móvil de `to` (quien pidió el cambio originalmente)
 * avisando de que su solicitud fue aceptada o rechazada. Se dispara desde
 * NotificationsScreen.respond().
 */
export async function notifySwapResponse(params: {
  to: string;
  from: string;
  day: number;
  month: SeasonMonth;
  shift: string;
  status: 'accepted' | 'rejected';
}): Promise<void> {
  const { to, from, day, month, shift, status } = params;
  await sendExpoPush(
    to,
    status === 'accepted' ? 'Cambio aceptado ✓' : 'Cambio rechazado',
    status === 'accepted'
      ? `${from} ha aceptado cubrirte el turno del ${day} de ${MONTH_NAME[month]} (${canonicalRaw(shift)}).`
      : `${from} ha rechazado tu solicitud de cambio del ${day} de ${MONTH_NAME[month]} (${canonicalRaw(shift)}).`
  );
}
