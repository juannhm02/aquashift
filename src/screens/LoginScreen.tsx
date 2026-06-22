import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors, Persona } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useRoster } from '../store/RosterContext';
import { registerPushToken } from '../store/notifications';

type AccessStatus = 'active' | 'not-started' | 'finished';

function getAccessStatus(p: Persona): AccessStatus {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!p.activeFrom || todayStr < p.activeFrom) return 'not-started';
  if (p.activeUntil && todayStr > p.activeUntil) return 'finished';
  return 'active';
}

const STATUS_MESSAGE: Record<'not-started' | 'finished', string> = {
  'not-started': 'Todavía no tienes turnos asignados. Vuelve cuando empiece tu periodo.',
  finished: 'Tu periodo de turnos de esta temporada ya ha finalizado.',
};

// Modo del modal de PIN: primero se pide el PIN actual (el que tenga, sea
// definitivo o provisional); si el que tenía era provisional, en vez de
// entrar directamente se pasa a pedirle uno nuevo de su elección.
type PinMode = 'enter-pin' | 'set-new-pin';

export default function LoginScreen() {
  const router = useRouter();
  const { roster, upsertPersona } = useRoster();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const personasList = Object.keys(roster);

  // Persona para la que se está pidiendo/cambiando el PIN (modal abierto).
  const [pinTarget, setPinTarget] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<PinMode>('enter-pin');
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');

  function finishLogin(id: string) {
    // Guarda/actualiza el Expo push token de este dispositivo para `id`, así
    // los demás pueden mandarle push reales (ver src/store/notifications.ts).
    // No bloquea el login si falla (p.ej. en Expo Go o sin permiso).
    registerPushToken(id);
    closePinModal();
    router.replace({ pathname: '/(tabs)/june', params: { user: id } });
  }

  function closePinModal() {
    setPinTarget(null);
    setPinMode('enter-pin');
    setPinInput('');
    setNewPinInput('');
    setNewPinConfirm('');
  }

  async function handleCardPress(id: string) {
    const status = getAccessStatus(roster[id]);
    if (status !== 'active') {
      Alert.alert('Acceso no disponible', STATUS_MESSAGE[status]);
      return;
    }
    const persona = roster[id];
    if (!persona.pin) {
      // Ya no se autogenera un PIN al tocar el avatar: cualquiera podría
      // "robar" así el PIN de otra persona con solo tocar su nombre. El PIN
      // inicial lo asigna el admin desde el panel de Administración y se lo
      // pasa a esa persona por su cuenta (ver RosterAdminScreen.tsx).
      Alert.alert(
        'Sin PIN asignado',
        'Todavía no tienes un PIN asignado. Pídele al administrador que te lo asigne desde el panel de Administración.'
      );
      return;
    }
    setPinMode('enter-pin');
    setPinInput('');
    setPinTarget(id);
  }

  function handleConfirmPin() {
    if (!pinTarget) return;
    const persona = roster[pinTarget];
    if (pinInput.trim() !== persona.pin) {
      Alert.alert('PIN incorrecto', 'Revisa las 4 cifras e inténtalo de nuevo.');
      setPinInput('');
      return;
    }
    if (persona.pinIsTemp) {
      // El PIN que tenía era provisional (asignado por el admin): antes de
      // dejarle entrar, se le obliga a elegir uno propio que solo ella conozca.
      setPinMode('set-new-pin');
      setNewPinInput('');
      setNewPinConfirm('');
      return;
    }
    finishLogin(pinTarget);
  }

  async function handleConfirmNewPin() {
    if (!pinTarget) return;
    const trimmed = newPinInput.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      Alert.alert('PIN inválido', 'El PIN debe tener 4 cifras.');
      return;
    }
    if (trimmed !== newPinConfirm.trim()) {
      Alert.alert('No coinciden', 'Los dos PIN que has escrito no son iguales.');
      setNewPinConfirm('');
      return;
    }
    const persona = roster[pinTarget];
    await upsertPersona(pinTarget, { ...persona, pin: trimmed, pinIsTemp: false });
    finishLogin(pinTarget);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>🏊</Text>
        <Text style={styles.title}>AquaShift</Text>
        <Text style={styles.subtitle}>Selecciona tu nombre para entrar</Text>
        <View style={styles.grid}>
          {personasList.map(id => {
            const p = roster[id];
            const status = getAccessStatus(p);
            const inactive = status !== 'active';
            return (
              <TouchableOpacity
                key={id}
                style={[styles.card, inactive && styles.cardInactive]}
                onPress={() => handleCardPress(id)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: p.bg },
                    inactive && styles.avatarInactive,
                  ]}
                >
                  <Text style={[styles.avatarText, { color: p.color }]}>
                    {id}
                  </Text>
                </View>
                <Text style={[styles.cardLabel, inactive && styles.cardLabelInactive]}>
                  {id}
                </Text>
                <Text style={styles.cardFullName} numberOfLines={1}>
                  {p.fullName}
                </Text>
                {inactive && (
                  <Text style={styles.cardStatus}>
                    {status === 'not-started' ? 'Aún no activo' : 'Finalizado'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.adminLink}
          onPress={() => router.push('/admin')}
          activeOpacity={0.7}
        >
          <Text style={styles.adminLinkTxt}>Administración</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={pinTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={closePinModal}
      >
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={closePinModal}>
            <Pressable style={styles.pinSheet} onPress={e => e.stopPropagation()}>
              {pinMode === 'enter-pin' ? (
                <>
                  <Text style={styles.pinTitle}>
                    Hola, {pinTarget ? roster[pinTarget]?.fullName : ''}
                  </Text>
                  <Text style={styles.pinSubtitle}>Introduce tu PIN de 4 cifras</Text>
                  <TextInput
                    style={styles.pinInput}
                    value={pinInput}
                    onChangeText={setPinInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    autoFocus
                    onSubmitEditing={handleConfirmPin}
                    placeholder="••••"
                    placeholderTextColor={colors.text3}
                  />
                  <TouchableOpacity style={styles.pinBtn} onPress={handleConfirmPin}>
                    <Text style={styles.pinBtnTxt}>Entrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pinCancel} onPress={closePinModal}>
                    <Text style={styles.pinCancelTxt}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.pinTitle}>Elige tu PIN</Text>
                  <Text style={styles.pinSubtitle}>
                    Es la primera vez que entras: elige un PIN de 4 cifras que solo tú conozcas.
                  </Text>
                  <TextInput
                    style={styles.pinInput}
                    value={newPinInput}
                    onChangeText={setNewPinInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    autoFocus
                    placeholder="Nuevo PIN"
                    placeholderTextColor={colors.text3}
                  />
                  <TextInput
                    style={styles.pinInput}
                    value={newPinConfirm}
                    onChangeText={setNewPinConfirm}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    onSubmitEditing={handleConfirmNewPin}
                    placeholder="Repite el PIN"
                    placeholderTextColor={colors.text3}
                  />
                  <TouchableOpacity style={styles.pinBtn} onPress={handleConfirmNewPin}>
                    <Text style={styles.pinBtnTxt}>Guardar y entrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pinCancel} onPress={closePinModal}>
                    <Text style={styles.pinCancelTxt}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    container: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.text2,
      marginBottom: 36,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
      width: '100%',
    },
    card: {
      width: '28%',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      paddingVertical: 18,
      paddingHorizontal: 8,
      gap: 10,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
    },
    cardLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    cardFullName: {
      fontSize: 10,
      color: colors.text3,
      maxWidth: 78,
    },
    cardInactive: {
      opacity: 0.45,
    },
    avatarInactive: {
      opacity: 0.7,
    },
    cardLabelInactive: {
      color: colors.text3,
    },
    cardStatus: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.red,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    adminLink: {
      marginTop: 32,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    adminLinkTxt: {
      fontSize: 12,
      color: colors.text3,
      fontWeight: '600',
    },
    kav: { flex: 1, justifyContent: 'center' },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinSheet: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 24,
      width: '80%',
      maxWidth: 320,
      alignItems: 'center',
    },
    pinTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
    pinSubtitle: { fontSize: 13, color: colors.text2, marginBottom: 18, textAlign: 'center' },
    pinInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 24,
      letterSpacing: 8,
      color: colors.text,
      backgroundColor: colors.surface2,
      textAlign: 'center',
      width: '100%',
      marginBottom: 16,
    },
    pinBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      width: '100%',
      alignItems: 'center',
    },
    pinBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
    pinCancel: { marginTop: 12, padding: 6 },
    pinCancelTxt: { fontSize: 13, color: colors.text3 },
  });
}
