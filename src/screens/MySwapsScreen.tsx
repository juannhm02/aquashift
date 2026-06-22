import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { Avatar } from '../components/Avatar';
import { SwapRequest } from '../store/swaps';
import { MONTH_NAME as MN, SeasonMonth, getMonthMeta } from '../data/season';
import { SwapRequestModal } from '../components/SwapRequestModal';
import { canonicalRaw } from '../data/shifts';

type Props = {
  currentUser: string;
  swaps: SwapRequest[];
  onSwapsChange: (swaps: SwapRequest[]) => void;
};

const MONTHS: SeasonMonth[] = ['june', 'july', 'august', 'september'];

export function MySwapsScreen({ currentUser, swaps, onSwapsChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: colors.amberLight, color: colors.amber,  label: '⏳ Pendiente' },
    accepted: { bg: colors.greenLight, color: colors.green,  label: '✓ Aceptado'  },
    rejected: { bg: colors.redLight,   color: colors.red,    label: '✗ Rechazado' },
  };
  const mine = swaps
    .filter(s => s.from === currentUser || s.to === currentUser)
    .slice()
    .reverse();

  // Selector de mes/día desde el que se abre el modal de solicitud, para
  // poder pedir un cambio directamente desde esta pestaña sin tener que ir
  // al calendario (el calendario sigue funcionando igual que siempre).
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickMonth, setPickMonth] = useState<SeasonMonth>('june');
  const [requestMonth, setRequestMonth] = useState<SeasonMonth | null>(null);
  const [requestDay, setRequestDay] = useState<number | null>(null);

  function openPicker() {
    setPickMonth('june');
    setPickerVisible(true);
  }

  function pickDay(day: number) {
    setRequestMonth(pickMonth);
    setRequestDay(day);
    setPickerVisible(false);
  }

  const newRequestBtn = (
    <TouchableOpacity style={styles.newBtn} onPress={openPicker}>
      <Text style={styles.newBtnTxt}>+ Nueva solicitud</Text>
    </TouchableOpacity>
  );

  const pickerModal = (
    <Modal
      visible={pickerVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setPickerVisible(false)}
    >
      <Pressable style={styles.backdrop} onPress={() => setPickerVisible(false)}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setPickerVisible(false)}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>Nueva solicitud</Text>
          <Text style={styles.sheetSub}>Elige el día del cambio</Text>

          <Text style={styles.fieldLabel}>Mes</Text>
          <View style={styles.chipRow}>
            {MONTHS.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, pickMonth === m && styles.chipActive]}
                onPress={() => setPickMonth(m)}
              >
                <Text style={[styles.chipTxt, pickMonth === m && styles.chipTxtActive]}>
                  {MN[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Día</Text>
          <View style={styles.dayGrid}>
            {Array.from({ length: getMonthMeta(pickMonth).totalDays }, (_, i) => i + 1).map(d => (
              <TouchableOpacity key={d} style={styles.dayChip} onPress={() => pickDay(d)}>
                <Text style={styles.dayChipTxt}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const requestModal = requestMonth && (
    <SwapRequestModal
      visible={requestDay !== null}
      month={requestMonth}
      day={requestDay}
      currentUser={currentUser}
      onClose={() => setRequestDay(null)}
      onSwapsChange={onSwapsChange}
    />
  );

  if (mine.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🔄</Text>
        <Text style={styles.emptyTitle}>Sin solicitudes</Text>
        <Text style={styles.emptyText}>
          Pide un cambio de turno desde aquí o tocando un día del calendario.
        </Text>
        {newRequestBtn}
        {pickerModal}
        {requestModal}
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {newRequestBtn}
      {mine.map(r => {
        const st = STATUS_STYLE[r.status];
        return (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Avatar id={r.from} size={30} />
              <Text style={styles.arrow}>→</Text>
              <Avatar id={r.to} size={30} />
              <Text style={styles.names}>
                {r.from} → {r.to}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusTxt, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {r.day} de {MN[r.month]} · {canonicalRaw(r.shift)}
            </Text>
            <Text style={styles.message}>"{r.aiMessage}"</Text>
          </View>
        );
      })}
      {pickerModal}
      {requestModal}
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
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 6,
      flexWrap: 'wrap',
    },
    arrow: { fontSize: 12, color: colors.text3 },
    names: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
    statusPill: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    statusTxt: { fontSize: 11, fontWeight: '700' },
    meta: { fontSize: 11, color: colors.text3, marginBottom: 8 },
    message: {
      fontSize: 12,
      color: colors.text2,
      fontStyle: 'italic',
      lineHeight: 18,
      borderLeftWidth: 2,
      borderLeftColor: colors.border2,
      paddingLeft: 10,
    },
    newBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginBottom: 4,
    },
    newBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
      maxHeight: '88%',
      maxWidth: 600,
      width: '100%',
      alignSelf: 'center',
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border2,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    closeBtn: { position: 'absolute', top: 16, right: 16, padding: 6 },
    closeTxt: { fontSize: 18, color: colors.text2 },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
    sheetSub: { fontSize: 12, color: colors.text2, marginBottom: 14 },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text3,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 12,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 24,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    chipTxt: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipTxtActive: { color: colors.primary },
    dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayChipTxt: { fontSize: 13, fontWeight: '600', color: colors.text },
  });
}
