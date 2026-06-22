import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
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

export default function LoginScreen() {
  const router = useRouter();
  const { roster } = useRoster();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const personasList = Object.keys(roster);

  function handleLogin(id: string) {
    const status = getAccessStatus(roster[id]);
    if (status !== 'active') {
      Alert.alert('Acceso no disponible', STATUS_MESSAGE[status]);
      return;
    }
    // Guarda/actualiza el Expo push token de este dispositivo para `id`, así
    // los demás pueden mandarle push reales (ver src/store/notifications.ts).
    // No bloquea el login si falla (p.ej. en Expo Go o sin permiso).
    registerPushToken(id);
    router.replace({ pathname: '/(tabs)/june', params: { user: id } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
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
                onPress={() => handleLogin(id)}
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
      </View>
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
      flex: 1,
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
  });
}
