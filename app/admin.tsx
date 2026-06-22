import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors } from '../src/theme/colors';
import { useTheme } from '../src/theme/ThemeContext';
import { RosterAdminScreen } from '../src/screens/RosterAdminScreen';
import { ShiftAdminScreen } from '../src/screens/ShiftAdminScreen';
import { verifyAdminCredentials, setAdminCredentials } from '../src/store/adminAuth';

type Section = 'roster' | 'shifts';

export default function AdminScreen() {
  const router = useRouter();
  const { colors, scheme, toggleScheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [changingCreds, setChangingCreds] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [section, setSection] = useState<Section>('roster');

  async function handleUnlock() {
    const ok = await verifyAdminCredentials(username.trim(), password);
    if (!ok) {
      Alert.alert('Credenciales incorrectas', 'Revisa el usuario y la contraseña.');
      setPassword('');
      return;
    }
    setUnlocked(true);
  }

  async function handleChangeCreds() {
    if (!newUsername.trim()) {
      Alert.alert('Falta el usuario', 'Indica el nuevo usuario de administración.');
      return;
    }
    if (newPassword.trim().length < 4) {
      Alert.alert('Contraseña demasiado corta', 'Usa al menos 4 caracteres.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('No coincide', 'Las dos contraseñas introducidas no son iguales.');
      return;
    }
    await setAdminCredentials(newUsername.trim(), newPassword.trim());
    setChangingCreds(false);
    setNewUsername('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Credenciales actualizadas', 'El nuevo usuario/contraseña ya está activo.');
  }

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.lockContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.emoji}>🔒</Text>
            <Text style={styles.title}>Administración</Text>
            <Text style={styles.subtitle}>Acceso restringido al administrador</Text>
            <TextInput
              style={styles.credInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Usuario"
              placeholderTextColor={colors.text3}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.credInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor={colors.text3}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleUnlock}
            />
            <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlock}>
              <Text style={styles.unlockTxt}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
              <Text style={styles.backTxt}>Volver</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administración</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setChangingCreds(c => !c)} style={styles.headerBtn}>
            <Text style={styles.headerBtnTxt}>Cambiar acceso</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleScheme} style={styles.headerBtn}>
            <Text style={styles.headerBtnTxt}>{scheme === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.headerBtn}>
            <Text style={styles.headerBtnTxt}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <TouchableOpacity
          style={[styles.sectionBtn, section === 'roster' && styles.sectionBtnActive]}
          onPress={() => setSection('roster')}
        >
          <Text style={[styles.sectionTxt, section === 'roster' && styles.sectionTxtActive]}>
            Socorristas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionBtn, section === 'shifts' && styles.sectionBtnActive]}
          onPress={() => setSection('shifts')}
        >
          <Text style={[styles.sectionTxt, section === 'shifts' && styles.sectionTxtActive]}>
            Turnos
          </Text>
        </TouchableOpacity>
      </View>

      {changingCreds && (
        <View style={styles.credChangeBox}>
          <Text style={styles.fieldLabel}>Nuevo usuario</Text>
          <TextInput
            style={styles.input}
            value={newUsername}
            onChangeText={setNewUsername}
            placeholder="Nuevo usuario de administración"
            placeholderTextColor={colors.text3}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.fieldLabel}>Nueva contraseña</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nueva contraseña"
            placeholderTextColor={colors.text3}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.fieldLabel}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repite la contraseña"
            placeholderTextColor={colors.text3}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleChangeCreds}>
            <Text style={styles.saveTxt}>Guardar</Text>
          </TouchableOpacity>
        </View>
      )}

      {section === 'roster' ? <RosterAdminScreen /> : <ShiftAdminScreen />}
    </SafeAreaView>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    lockContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emoji: { fontSize: 44, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.text2, marginBottom: 24, textAlign: 'center' },
    credInput: {
      width: '100%',
      maxWidth: 280,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
      marginBottom: 12,
    },
    unlockBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 32,
      marginTop: 4,
      marginBottom: 10,
    },
    unlockTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
    backBtn: { padding: 8 },
    backTxt: { color: colors.text2, fontSize: 13 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    headerBtnTxt: { fontSize: 12, color: colors.text2, fontWeight: '600' },
    sectionRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    sectionBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    sectionBtnActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    sectionTxt: { fontSize: 13, fontWeight: '700', color: colors.text2 },
    sectionTxtActive: { color: colors.primary },
    credChangeBox: {
      backgroundColor: colors.surface,
      margin: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text3,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface2,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 14,
    },
    saveTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
}
