import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useRoster } from '../store/RosterContext';
import { useShiftOverrides } from '../store/ShiftOverridesContext';
import { getEffectiveData } from '../store/shiftOverrides';
import { MONTH_DATA, workingPersons, parseShift, parseNote, canonicalRaw } from '../data/shifts';
import { weekdayOf, resolveHours } from '../data/hours';
import { SeasonMonth, MONTH_NAME, getMonthMeta, dateKey } from '../data/season';
import { isPersonaActiveOn } from '../theme/colors';
import { Avatar } from './Avatar';
import { addSwap, SwapRequest } from '../store/swaps';
import { generateSwapMessage } from '../store/api';
import { notifySwapRequest } from '../store/notifications';

type Props = {
  visible: boolean;
  month: SeasonMonth;
  day: number | null;
  currentUser: string;
  onClose: () => void;
  onSwapsChange: (swaps: SwapRequest[]) => void;
};

/**
 * Modal para solicitar un cambio de turno. Se monta tanto desde el calendario
 * (CalendarScreen) como desde "Mis cambios" (MySwapsScreen): a diferencia de
 * antes, no recibe el dato de turnos del día por prop, sino que lo calcula él
 * mismo a partir de mes/día (vía useShiftOverrides + useRoster), para poder
 * usarse desde cualquier pantalla con solo pasarle `month`/`day`.
 */
export function SwapRequestModal({ visible, month, day, currentUser, onClose, onSwapsChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { roster } = useRoster();
  const { overrides } = useShiftOverrides();

  const [targetPerson, setTargetPerson] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const meta = getMonthMeta(month);
  const data = useMemo(
    () => getEffectiveData(month, MONTH_DATA[month], overrides),
    [month, overrides]
  );

  const modalShifts = day !== null ? (data[day] ?? []) : [];
  const myShiftsInDay = day !== null ? modalShifts.filter(r => workingPersons(r).includes(currentUser)) : [];

  // Solo socorristas con turnos vigentes esa fecha concreta (activeFrom/
  // activeUntil en su roster, ver theme/colors.ts): así en junio-22 julio
  // solo aparecen BJ/L/M/F (+ B/J, que están toda la temporada), y a partir
  // del 23 de julio solo R/MJ/C/A (+ B/J).
  const activeIds =
    day !== null
      ? Object.keys(roster).filter(id => isPersonaActiveOn(roster[id], dateKey(month, day)))
      : [];

  // El cambio se puede solicitar a cualquier socorrista activo esa fecha
  // (trabaje o no ese día en concreto) salvo a quien ya esté trabajando
  // contigo en el turno que vas a ceder: a ese ya lo tienes al lado, no hay
  // nada que "cambiar" con él.
  const teammatesInSelectedShift = selectedShift
    ? workingPersons(selectedShift).filter(p => p !== currentUser)
    : [];
  const targetCandidates = activeIds.filter(
    p => p !== currentUser && !teammatesInSelectedShift.includes(p)
  );
  const canSend = myShiftsInDay.length > 0 && targetCandidates.length > 0;

  // Al abrir el modal para un día nuevo, se preseleccionan el primer turno
  // propio disponible y el primer compañero válido para ese turno (igual que
  // antes hacía CalendarScreen.openModal() de forma inline).
  useEffect(() => {
    if (!visible || day === null) return;
    const shifts = data[day] ?? [];
    const mine = shifts.filter(r => workingPersons(r).includes(currentUser));
    if (mine.length > 0) {
      const teammates = workingPersons(mine[0]).filter(p => p !== currentUser);
      const active = Object.keys(roster).filter(id => isPersonaActiveOn(roster[id], dateKey(month, day)));
      const candidates = active.filter(p => p !== currentUser && !teammates.includes(p));
      setSelectedShift(mine[0]);
      setTargetPerson(candidates[0] ?? '');
    } else {
      setSelectedShift('');
      setTargetPerson('');
    }
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, month, day]);

  // Si se cambia el turno propio seleccionado y el compañero elegido deja de
  // ser válido (porque ahora ya trabaja contigo en ese turno), se reasigna al
  // primer compañero válido.
  useEffect(() => {
    if (!targetPerson) return;
    if (targetCandidates.includes(targetPerson)) return;
    setTargetPerson(targetCandidates[0] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShift]);

  async function submitRequest() {
    if (!targetPerson || !selectedShift || day === null) return;
    setLoading(true);
    try {
      const aiMessage = await generateSwapMessage({
        from: currentUser,
        to: targetPerson,
        day,
        month,
        shift: selectedShift,
        note,
      });
      await addSwap({
        id: Date.now(),
        from: currentUser,
        to: targetPerson,
        day,
        month,
        shift: selectedShift,
        userNote: note,
        aiMessage,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      // No hace falta actualizar `swaps` a mano: la suscripción a Firestore
      // en app/(tabs)/_layout.tsx recibe este cambio en todos los
      // dispositivos automáticamente.
      onClose();
      // Notificación push en el móvil de "to" (ver src/store/notifications.ts).
      notifySwapRequest({ from: currentUser, to: targetPerson, day, month, shift: selectedShift });
      Alert.alert('Enviado ✓', `Solicitud enviada a ${targetPerson}.`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la solicitud. Comprueba tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.sheetTitle}>
            {MONTH_NAME[month]} {day}
          </Text>
          <Text style={styles.sheetSub}>Solicitar cambio de turno</Text>

          {/* Día info */}
          <View style={styles.dayBox}>
            {modalShifts.map((raw, i) => {
              // "J-B" y "B-J" son la misma pareja: se muestran siempre en
              // orden alfabético con el mismo color (ver canonicalRaw).
              const display = canonicalRaw(raw);
              const { working } = parseShift(display);
              return (
                <View key={i} style={styles.shiftRow}>
                  {/* Se muestra tal cual está anotado el turno (ej. "F(B)-M"),
                      sin expandir la sustitución a texto. */}
                  <View style={styles.shiftPerson}>
                    <View style={[styles.sdot, { backgroundColor: roster[working[0]]?.color }]} />
                    <Text style={styles.shiftPersonTxt}>{display}</Text>
                  </View>
                  <Text style={styles.shiftHoursTxt}>
                    {day !== null
                      ? resolveHours(weekdayOf(meta.startOffset, day), i, parseNote(raw), working, roster)
                      : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          {!canSend ? (
            <Text style={styles.noShift}>
              {myShiftsInDay.length === 0
                ? 'No tienes turno este día.'
                : 'No hay ningún compañero activo disponible para esa fecha.'}
            </Text>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Mi turno</Text>
              <View style={styles.personRow}>
                {myShiftsInDay.map(raw => (
                  <TouchableOpacity
                    key={raw}
                    onPress={() => setSelectedShift(raw)}
                    style={[styles.shiftChip, selectedShift === raw && styles.shiftChipActive]}
                  >
                    <Text
                      style={[styles.shiftChipTxt, selectedShift === raw && { color: colors.primary }]}
                    >
                      {workingPersons(canonicalRaw(raw)).join(' y ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Cambiar con</Text>
              <View style={styles.personRow}>
                {targetCandidates.map(p => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setTargetPerson(p)}
                    style={[styles.personChip, targetPerson === p && styles.personChipActive]}
                  >
                    <Avatar id={p} size={28} />
                    <Text
                      style={[styles.personChipTxt, targetPerson === p && { color: colors.primary }]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Nota (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Tengo una cita médica..."
                placeholderTextColor={colors.text3}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />

              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingTxt}>Generando mensaje con IA…</Text>
                </View>
              ) : note.trim().length === 0 ? (
                // El botón de enviar solo aparece una vez escrito el motivo:
                // así el destinatario siempre recibe una explicación del cambio.
                <Text style={styles.noteHint}>Escribe un motivo para poder enviar la solicitud.</Text>
              ) : (
                <TouchableOpacity style={styles.sendBtn} onPress={submitRequest}>
                  <Text style={styles.sendTxt}>Enviar solicitud</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
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
    closeBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      padding: 6,
    },
    closeTxt: { fontSize: 18, color: colors.text2 },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
    sheetSub: { fontSize: 12, color: colors.text2, marginBottom: 14 },
    dayBox: {
      backgroundColor: colors.surface2,
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
      gap: 6,
    },
    shiftRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    shiftPerson: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sdot: { width: 8, height: 8, borderRadius: 4 },
    shiftPersonTxt: { fontSize: 12, color: colors.text2 },
    shiftHoursTxt: { fontSize: 11, color: colors.text3 },
    noShift: { fontSize: 13, color: colors.text2, textAlign: 'center', paddingVertical: 16 },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text3,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 12,
    },
    personRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    personChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 24,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    personChipActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    personChipTxt: { fontSize: 13, fontWeight: '600', color: colors.text },
    shiftChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    shiftChipActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    shiftChipTxt: { fontSize: 12, fontWeight: '500', color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface2,
      textAlignVertical: 'top',
      minHeight: 80,
      marginBottom: 4,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
      justifyContent: 'center',
    },
    loadingTxt: { fontSize: 13, color: colors.text2 },
    noteHint: {
      fontSize: 12,
      color: colors.text3,
      textAlign: 'center',
      marginTop: 16,
      fontStyle: 'italic',
    },
    sendBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    sendTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
