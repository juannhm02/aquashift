import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useRoster } from '../store/RosterContext';
import { useShiftOverrides } from '../store/ShiftOverridesContext';
import { getEffectiveData } from '../store/shiftOverrides';
import { Avatar } from '../components/Avatar';
import { SwapRequest, updateSwapStatus } from '../store/swaps';
import { notifySwapResponse } from '../store/notifications';
import { MONTH_NAME as MN, getMonthMeta } from '../data/season';
import { MONTH_DATA, workingPersons, parseNote, applySubstitution, canonicalRaw } from '../data/shifts';
import { weekdayOf, resolveHours, rangeHours } from '../data/hours';

type Props = {
  currentUser: string;
  swaps: SwapRequest[];
  onSwapsChange: (swaps: SwapRequest[]) => void;
};

export function NotificationsScreen({ currentUser, swaps, onSwapsChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { roster } = useRoster();
  const { overrides, setDayShifts } = useShiftOverrides();
  const mine = swaps
    .filter(s => s.to === currentUser)
    .slice()
    .reverse();

  async function respond(id: number, status: 'accepted' | 'rejected') {
    const swap = swaps.find(s => s.id === id);
    let hours: number | undefined;

    if (status === 'accepted' && swap) {
      // Al aceptar, el cambio se refleja directamente en el calendario como una
      // sustitución entre paréntesis (igual que si se hubiera anotado a mano):
      // "to" pasa a sustituir a "from" ese día.
      const dayData = getEffectiveData(swap.month, MONTH_DATA[swap.month], overrides);
      const dayShifts = dayData[swap.day] ?? [];
      let slotIndex = dayShifts.findIndex(r => r === swap.shift);
      if (slotIndex === -1) {
        // El turno pudo cambiar desde que se solicitó (ej. lo editó un admin):
        // busca el turno actual donde sigue apareciendo "from".
        slotIndex = dayShifts.findIndex(r => workingPersons(r).includes(swap.from));
      }
      if (slotIndex !== -1) {
        const original = dayShifts[slotIndex];
        const newDayShifts = [...dayShifts];
        newDayShifts[slotIndex] = applySubstitution(original, swap.from, swap.to);
        await setDayShifts(swap.month, swap.day, newDayShifts);

        // Horas que cubre "to" por "from", para el balance de deudas acumulado.
        const meta = getMonthMeta(swap.month);
        const weekday = weekdayOf(meta.startOffset, swap.day);
        const range = resolveHours(weekday, slotIndex, parseNote(original), workingPersons(original), roster);
        hours = rangeHours(range);
      }
    }

    await updateSwapStatus(id, status, hours);
    // `swaps` se actualiza solo vía la suscripción a Firestore en
    // app/(tabs)/_layout.tsx, también en el dispositivo de quien solicitó el cambio.
    // Push real al móvil de quien pidió el cambio, avisando del resultado.
    if (swap) {
      notifySwapResponse({
        to: swap.from,
        from: currentUser,
        day: swap.day,
        month: swap.month,
        shift: swap.shift,
        status,
      });
    }
    Alert.alert(
      status === 'accepted' ? 'Cambio aceptado ✓' : 'Cambio rechazado',
      status === 'accepted'
        ? 'Has aceptado el cambio de turno. Ya aparece reflejado en el calendario.'
        : 'Has rechazado la solicitud.'
    );
  }

  if (mine.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🔔</Text>
        <Text style={styles.emptyTitle}>Sin notificaciones</Text>
        <Text style={styles.emptyText}>Cuando alguien te pida un cambio, aparecerá aquí.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {mine.map(r => (
        <View key={r.id} style={[styles.card, r.status === 'pending' && styles.cardUnread]}>
          <View style={styles.cardHead}>
            <Avatar id={r.from} size={32} />
            <View style={styles.headInfo}>
              <Text style={styles.headTitle}>
                {r.from} → {r.to}
              </Text>
              <Text style={styles.headMeta}>
                {r.day} de {MN[r.month]} · {canonicalRaw(r.shift)}
              </Text>
            </View>
            {r.status !== 'pending' && (
              <View
                style={[
                  styles.statusPill,
                  r.status === 'accepted' ? styles.statusAccepted : styles.statusRejected,
                ]}
              >
                <Text
                  style={[
                    styles.statusTxt,
                    r.status === 'accepted' ? styles.statusTxtAccepted : styles.statusTxtRejected,
                  ]}
                >
                  {r.status === 'accepted' ? '✓ Aceptado' : '✗ Rechazado'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.message}>"{r.aiMessage}"</Text>

          {r.status === 'pending' && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btnAccept}
                onPress={() => respond(r.id, 'accepted')}
              >
                <Text style={styles.btnAcceptTxt}>Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnReject}
                onPress={() => respond(r.id, 'rejected')}
              >
                <Text style={styles.btnRejectTxt}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 12, gap: 10 },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      backgroundColor: colors.bg,
    },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
    emptyText: { fontSize: 13, color: colors.text2, textAlign: 'center', lineHeight: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    cardUnread: {
      borderLeftWidth: 3,
      borderLeftColor: colors.blue,
      backgroundColor: colors.blueLight,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    headInfo: { flex: 1 },
    headTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
    headMeta: { fontSize: 11, color: colors.text3, marginTop: 2 },
    statusPill: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusAccepted: { backgroundColor: colors.greenLight },
    statusRejected: { backgroundColor: colors.redLight },
    statusTxt: { fontSize: 11, fontWeight: '700' },
    statusTxtAccepted: { color: colors.green },
    statusTxtRejected: { color: colors.red },
    message: {
      fontSize: 13,
      color: colors.text2,
      fontStyle: 'italic',
      lineHeight: 20,
      marginBottom: 12,
      borderLeftWidth: 2,
      borderLeftColor: colors.border2,
      paddingLeft: 10,
    },
    actions: { flexDirection: 'row', gap: 10 },
    btnAccept: {
      flex: 1,
      backgroundColor: colors.greenLight,
      borderRadius: 24,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.green,
    },
    btnAcceptTxt: { fontSize: 13, fontWeight: '700', color: colors.green },
    btnReject: {
      flex: 1,
      backgroundColor: colors.redLight,
      borderRadius: 24,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.red,
    },
    btnRejectTxt: { fontSize: 13, fontWeight: '700', color: colors.red },
  });
}
