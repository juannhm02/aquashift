import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useRoster } from '../store/RosterContext';
import { SeasonMonth, MONTH_INDEX, SEASON_YEAR } from '../data/season';
import { ShiftPill } from '../components/ShiftPill';
import { SwapRequestModal } from '../components/SwapRequestModal';
import { SwapRequest } from '../store/swaps';

type Month = SeasonMonth;

type Props = {
  month: Month;
  data: Record<number, string[]>;
  totalDays: number;
  startOffset: number; // 0=Mon, 1=Tue ...
  currentUser: string;
  swaps: SwapRequest[];
  onSwapsChange: (swaps: SwapRequest[]) => void;
};

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Referencia de horarios por defecto, mostrada en el modal de info en vez de
 * repetirse en cada turno del calendario (así se ve más limpio). */
const SCHEDULE_INFO: { label: string; value: string }[] = [
  { label: 'Entre semana (lunes a viernes)', value: 'Turno 1: 11:30-15:30  ·  Turno 2: 15:30-19:30' },
  { label: 'Fin de semana (sábado y domingo)', value: 'Turno 1: 11:00-16:00  ·  Turno 2: 16:00-21:00' },
  { label: 'Correturnos · jueves (noche)', value: '22:00 - 02:00' },
  { label: 'Correturnos · sábado y domingo', value: '16:00 - 21:00' },
];

export function CalendarScreen({
  month,
  data,
  totalDays,
  startOffset,
  currentUser,
  swaps,
  onSwapsChange,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { roster } = useRoster();
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [weekIndex, setWeekIndex] = useState(0);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === SEASON_YEAR &&
    today.getMonth() === MONTH_INDEX[month] &&
    today.getDate() === d;

  // Build calendar cells, agrupadas en semanas completas de 7 días para que el
  // grid no dependa de redondeos de ancho en porcentaje (eso hacía que el domingo
  // desapareciera). También es la base de la vista semanal.
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Al cambiar de mes, sitúa la vista semanal en la semana de "hoy" si cae en
  // este mes; si no, en la primera semana.
  useEffect(() => {
    const todayWeek = weeks.findIndex(w => w.some(d => d !== null && isToday(d as number)));
    setWeekIndex(todayWeek !== -1 ? todayWeek : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const getDaySwapStatus = (d: number) => {
    const relevant = swaps.filter(s => s.month === month && s.day === d);
    if (relevant.some(s => s.status === 'accepted')) return 'accepted';
    if (relevant.some(s => s.status === 'pending')) return 'pending';
    return null;
  };

  const visibleWeeks = viewMode === 'week' ? [weeks[weekIndex] ?? []] : weeks;

  function goPrevWeek() {
    setWeekIndex(i => Math.max(0, i - 1));
  }
  function goNextWeek() {
    setWeekIndex(i => Math.min(weeks.length - 1, i + 1));
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(roster).map(([id, p]) => (
          <View key={id} style={styles.legItem}>
            <View style={[styles.legDot, { backgroundColor: p.color }]} />
            <Text style={styles.legText}>{id}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoVisible(true)}>
          <Text style={styles.infoBtnTxt}>ℹ️ Horarios</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle mes / semana */}
      <View style={styles.viewToggleRow}>
        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'month' && styles.viewBtnActive]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.viewBtnTxt, viewMode === 'month' && styles.viewBtnTxtActive]}>
            Mes completo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'week' && styles.viewBtnActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.viewBtnTxt, viewMode === 'week' && styles.viewBtnTxtActive]}>
            Semana (más grande)
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'week' && (
        <>
          <View style={styles.weekNavRow}>
            <TouchableOpacity
              onPress={goPrevWeek}
              disabled={weekIndex === 0}
              style={[styles.weekNavBtn, weekIndex === 0 && styles.weekNavBtnDisabled]}
            >
              <Text style={styles.weekNavTxt}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.weekLabel}>
              Semana {weekIndex + 1} de {weeks.length}
            </Text>
            <TouchableOpacity
              onPress={goNextWeek}
              disabled={weekIndex === weeks.length - 1}
              style={[styles.weekNavBtn, weekIndex === weeks.length - 1 && styles.weekNavBtnDisabled]}
            >
              <Text style={styles.weekNavTxt}>›</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
            {weeks.map((_, wi) => (
              <TouchableOpacity
                key={wi}
                onPress={() => setWeekIndex(wi)}
                style={[styles.weekChip, weekIndex === wi && styles.weekChipActive]}
              >
                <Text style={[styles.weekChipTxt, weekIndex === wi && styles.weekChipTxtActive]}>
                  S{wi + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Day header */}
      <View style={styles.dayNamesRow}>
        {DAY_NAMES.map(d => (
          <Text key={d} style={styles.dayName}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {visibleWeeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, idx) => {
              if (!day) {
                return (
                  <View
                    key={`e-${wi}-${idx}`}
                    style={[styles.cell, viewMode === 'week' && styles.cellLarge]}
                  />
                );
              }
              const shifts = data[day] ?? [];
              const swapStatus = getDaySwapStatus(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.cell,
                    viewMode === 'week' && styles.cellLarge,
                    isToday(day) && styles.todayCell,
                  ]}
                  onPress={() => setModalDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNum, viewMode === 'week' && styles.dayNumLarge, isToday(day) && styles.todayNum]}>
                    {day}
                  </Text>
                  <View style={styles.pills}>
                    {shifts.map((raw, i) => (
                      <ShiftPill key={i} raw={raw} large={viewMode === 'week'} />
                    ))}
                    {swapStatus === 'pending' && (
                      <View style={styles.swapTagPending}>
                        <Text style={styles.swapTagTextPending}>⏳</Text>
                      </View>
                    )}
                    {swapStatus === 'accepted' && (
                      <View style={styles.swapTagDone}>
                        <Text style={styles.swapTagTextDone}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Modal info de horarios */}
      <Modal
        visible={infoVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setInfoVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setInfoVisible(false)}>
          <Pressable style={styles.infoSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setInfoVisible(false)}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Horarios</Text>
            <Text style={styles.sheetSub}>
              Horario general; una nota explícita entre paréntesis en un turno concreto
              siempre tiene prioridad sobre esto.
            </Text>
            {SCHEDULE_INFO.map(item => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <SwapRequestModal
        visible={modalDay !== null}
        month={month}
        day={modalDay}
        currentUser={currentUser}
        onClose={() => setModalDay(null)}
        onSwapsChange={onSwapsChange}
      />
    </ScrollView>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 12, maxWidth: 900, width: '100%', alignSelf: 'center' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 },
    legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legDot: { width: 9, height: 9, borderRadius: 5 },
    legText: { fontSize: 12, color: colors.text2 },
    infoBtn: {
      marginLeft: 'auto',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    infoBtnTxt: { fontSize: 11, fontWeight: '600', color: colors.text2 },

    viewToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    viewBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    viewBtnActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    viewBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.text2 },
    viewBtnTxtActive: { color: colors.primary },

    weekNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    weekNavBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    weekNavBtnDisabled: { opacity: 0.35 },
    weekNavTxt: { fontSize: 17, fontWeight: '700', color: colors.text },
    weekLabel: { fontSize: 13, fontWeight: '600', color: colors.text2 },
    weekScroll: { marginBottom: 10 },
    weekChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 13,
      marginRight: 6,
    },
    weekChipActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    weekChipTxt: { fontSize: 12, fontWeight: '600', color: colors.text2 },
    weekChipTxtActive: { color: colors.primary },

    dayNamesRow: { flexDirection: 'row', marginBottom: 4 },
    dayName: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: colors.text3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingVertical: 4,
    },
    grid: { flexDirection: 'column' },
    weekRow: { flexDirection: 'row' },
    // Altura FIJA (no mínima) para que todas las celdas tengan siempre el mismo
    // tamaño, sin importar cuántos turnos tenga ese día ni en qué mes/vista
    // estemos — así el calendario se ve igual de grande en todos los meses.
    cell: {
      flex: 1,
      height: 124,
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: 5,
      overflow: 'hidden',
    },
    cellLarge: { height: 230 },
    todayCell: { borderColor: colors.blue, borderWidth: 1.5, backgroundColor: colors.blueLight },
    dayNum: { fontSize: 13, fontWeight: '500', color: colors.text3, marginBottom: 4 },
    dayNumLarge: { fontSize: 18, marginBottom: 8 },
    todayNum: { color: colors.blue, fontWeight: '700' },
    pills: { gap: 3 },
    swapTagPending: {
      backgroundColor: colors.amberLight,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    swapTagTextPending: { fontSize: 10, color: colors.amber },
    swapTagDone: {
      backgroundColor: colors.greenLight,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    swapTagTextDone: { fontSize: 10, color: colors.green },

    // Modal
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
    infoSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
      maxWidth: 600,
      width: '100%',
      alignSelf: 'center',
    },
    infoRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 10,
    },
    infoLabel: { fontSize: 12, fontWeight: '700', color: colors.text3, marginBottom: 3 },
    infoValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
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
    shiftSwapTxt: { fontSize: 11, color: colors.text3, fontStyle: 'italic' },
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
