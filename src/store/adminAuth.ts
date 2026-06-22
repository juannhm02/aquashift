import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_KEY = 'admin_pin_v1';
const DEFAULT_PIN = '1234';

/** Devuelve el PIN actual, guardando el PIN por defecto la primera vez que se llama. */
export async function getAdminPin(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(PIN_KEY);
    if (raw) return raw;
  } catch {
    // si AsyncStorage falla, usamos el PIN por defecto
  }
  await AsyncStorage.setItem(PIN_KEY, DEFAULT_PIN).catch(() => {});
  return DEFAULT_PIN;
}

export async function setAdminPin(pin: string): Promise<void> {
  await AsyncStorage.setItem(PIN_KEY, pin);
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const current = await getAdminPin();
  return pin === current;
}
