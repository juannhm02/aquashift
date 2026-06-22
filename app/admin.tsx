import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors } from '../src/theme/colors';
import { useTheme } from '../src/theme/ThemeContext';
import { RosterAdminScreen } from '../src/screens/RosterAdminScreen';
import { ShiftAdminScreen } from '../src/screens/ShiftAdminScreen';
import { verifyAdminPin, setAdminPin } from '../src/store/adminAuth';

type Section = 'roster' | 'shifts';

export default function AdminScreen() {
  const router = useRouter();
  const { colors, scheme, toggleScheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [section, setSection] = useState<Section>('roster');

  async function handleUnlock() {
    const ok = await verifyAdminPin(pin.trim());
    if (!ok) {
      Alert.alert('PIN incorrecto', 'Inténtalo de nuevo.');
      setPin('');
      return;
    }
    setUnlocked(true);
  }

  async function handleChangePin() {
    if (newPin.trim().length < 4) {
      Alert.alert('PIN demasiado corto', 'Usa al menos 4 dígitos.');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      Alert.alert('No coincide', 'Los dos PIN introducidos no son iguales.');
      return;
    }
    await setAdminPin(newPin.trim());
    setChangingPin(false);
    setNewPin('');
    setConfirmPin('');
    Alert.alert('PIN actualizado', 'El nuevo PIN ya está activo.');
  }

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockContainer}>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={styles.title}>Administración</Text>
          <Text style={styles.subtitle}>Introduce el PIN de acceso</Text>
          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={setPin}
            placeholder="••••"
            placeholderTextColor={colors.text3}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoFocus
            onSubmitEditing={handleUnlock}
          />
          <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlock}>
            <Text style={styles.unlockTxt}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
            <Text style={styles.backTxt}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administración</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setChangingPin(c => !c)} style={styles.headerBtn}>
            <Text style={styles.headerBtnTxt}>Cambiar PIN</Text>
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

      {changingPin && (
        <View style={styles.pinChangeBox}>
          <Text style={styles.fieldLabel}>Nuevo PIN</Text>
          <TextInput
            style={styles.input}
            value={newPin}
            onChangeText={setNewPin}
            placeholder="Nuevo PIN"
            placeholderTextColor={colors.text3}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
          />
          <Text style={styles.fieldLabel}>Confirmar PIN</Text>
          <TextInput
            style={styles.input}
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="Repite el PIN"
            placeholderTextColor={colors.text3}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleChangePin}>
            <Text style={styles.saveTxt}>Guardar PIN</Text>
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
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emoji: { fontSize: 44, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.text2, marginBottom: 24 },
    pinInput: {
      width: 160,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 20,
      textAlign: 'center',
      color: colors.text,
      backgroundColor: colors.surface,
      marginBottom: 16,
    },
    unlockBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 32,
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
    pinChangeBox: {
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
