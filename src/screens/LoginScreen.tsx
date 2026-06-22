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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors, Persona } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useRoster } from '../store/RosterContext';
import { registerPushToken } from '../store/notifications';

const LOGO = require('../../assets/icon.png');

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

const MIN_PASSWORD_LENGTH = 4;

export default function LoginScreen() {
  const router = useRouter();
  const { roster, upsertPersona } = useRoster();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const personasList = Object.keys(roster);

  // El nombre solo se puede ELEGIR de la lista de socorristas que ya existen
  // (no se puede escribir uno libre): así nadie puede intentar entrar con un
  // nombre que no está en el roster.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const selectedPersona = selectedId ? roster[selectedId] : null;
  const hasPassword = !!selectedPersona?.password;

  function finishLogin(id: string) {
    // Guarda/actualiza el Expo push token de este dispositivo para `id`, así
    // los demás pueden mandarle push reales (ver src/store/notifications.ts).
    // No bloquea el login si falla (p.ej. en Expo Go o sin permiso).
    registerPushToken(id);
    router.replace({ pathname: '/(tabs)/june', params: { user: id } });
  }

  function openPicker() {
    setPickerOpen(true);
  }

  function selectPersona(id: string) {
    const status = getAccessStatus(roster[id]);
    if (status !== 'active') {
      Alert.alert('Acceso no disponible', STATUS_MESSAGE[status]);
      return;
    }
    setSelectedId(id);
    setPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setPickerOpen(false);
  }

  async function handleSubmit() {
    if (!selectedId || !selectedPersona) return;

    if (hasPassword) {
      if (password === selectedPersona.password) {
        finishLogin(selectedId);
      } else {
        Alert.alert('Contraseña incorrecta', 'Revísala e inténtalo de nuevo.');
        setPassword('');
      }
      return;
    }

    // Primera vez que esta persona entra: crea su propia contraseña en este
    // momento (autoservicio, sin que el admin tenga que asignar ni pasar nada).
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Contraseña demasiado corta', `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Alert.alert('No coinciden', 'Las dos contraseñas que has escrito no son iguales.');
      setNewPasswordConfirm('');
      return;
    }
    await upsertPersona(selectedId, { ...selectedPersona, password: newPassword });
    finishLogin(selectedId);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Image source={LOGO} style={styles.logo} resizeMode="cover" />
          <Text style={styles.title}>AquaShift</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

          <Text style={styles.fieldLabel}>Usuario</Text>
          <TouchableOpacity style={styles.selector} onPress={openPicker} activeOpacity={0.7}>
            {selectedPersona ? (
              <View style={styles.selectorChosen}>
                <View style={[styles.miniAvatar, { backgroundColor: selectedPersona.bg }]}>
                  <Text style={[styles.miniAvatarTxt, { color: selectedPersona.color }]}>
                    {selectedId}
                  </Text>
                </View>
                <Text style={styles.selectorTxt}>{selectedPersona.fullName}</Text>
              </View>
            ) : (
              <Text style={styles.selectorPlaceholder}>Selecciona tu nombre</Text>
            )}
            <Text style={styles.selectorChevron}>▾</Text>
          </TouchableOpacity>

          {selectedId && selectedPersona && (
            <View style={styles.passwordBlock}>
              {hasPassword ? (
                <>
                  <Text style={styles.fieldLabel}>Contraseña</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoFocus
                    onSubmitEditing={handleSubmit}
                    placeholder="Tu contraseña"
                    placeholderTextColor={colors.text3}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.firstTimeHint}>
                    Es la primera vez que entras: crea tu contraseña.
                  </Text>
                  <Text style={styles.fieldLabel}>Nueva contraseña</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoFocus
                    placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                    placeholderTextColor={colors.text3}
                  />
                  <Text style={styles.fieldLabel}>Repite la contraseña</Text>
                  <TextInput
                    style={styles.input}
                    value={newPasswordConfirm}
                    onChangeText={setNewPasswordConfirm}
                    secureTextEntry
                    onSubmitEditing={handleSubmit}
                    placeholder="Repite la contraseña"
                    placeholderTextColor={colors.text3}
                  />
                </>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitTxt}>{hasPassword ? 'Entrar' : 'Crear contraseña y entrar'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.adminLink}
            onPress={() => router.push('/admin')}
            activeOpacity={0.7}
          >
            <Text style={styles.adminLinkTxt}>Administración</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.pickerSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.pickerTitle}>Selecciona tu nombre</Text>
            <ScrollView style={{ maxHeight: '100%' }}>
              {personasList.map(id => {
                const p = roster[id];
                const status = getAccessStatus(p);
                const inactive = status !== 'active';
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.pickerRow, inactive && styles.pickerRowInactive]}
                    onPress={() => selectPersona(id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.miniAvatar, { backgroundColor: p.bg }]}>
                      <Text style={[styles.miniAvatarTxt, { color: p.color }]}>{id}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerRowName}>{p.fullName}</Text>
                      {inactive && (
                        <Text style={styles.pickerRowStatus}>
                          {status === 'not-started' ? 'Aún no activo' : 'Finalizado'}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
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
      padding: 32,
      paddingTop: 56,
    },
    logo: {
      width: 88,
      height: 88,
      borderRadius: 22,
      marginBottom: 14,
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
      marginBottom: 32,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text3,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      alignSelf: 'flex-start',
      marginBottom: 8,
      marginTop: 14,
    },
    selector: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.surface,
    },
    selectorChosen: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    selectorTxt: { fontSize: 15, fontWeight: '600', color: colors.text },
    selectorPlaceholder: { fontSize: 14, color: colors.text3 },
    selectorChevron: { fontSize: 14, color: colors.text3 },
    miniAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniAvatarTxt: { fontSize: 11, fontWeight: '700' },
    passwordBlock: { width: '100%' },
    firstTimeHint: {
      fontSize: 12,
      color: colors.text2,
      marginTop: 14,
      lineHeight: 17,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
      width: '100%',
    },
    submitTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
    adminLink: {
      marginTop: 28,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    adminLinkTxt: {
      fontSize: 12,
      color: colors.text3,
      fontWeight: '600',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 30,
      maxHeight: '75%',
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border2,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 14,
    },
    pickerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerRowInactive: { opacity: 0.45 },
    pickerRowName: { fontSize: 15, fontWeight: '600', color: colors.text },
    pickerRowStatus: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.red,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginTop: 2,
    },
  });
}
