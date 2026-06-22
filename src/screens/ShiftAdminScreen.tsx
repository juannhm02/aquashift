import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useRoster } from '../store/RosterContext';
import { useShiftOverrides } from '../store/ShiftOverridesContext';
import { getEffectiveData } from '../store/shiftOverrides';
import { MONTH_DATA, workingPersons } from '../data/shifts';
import { getMonthMeta, MONTH_NAME, SeasonMonth } from '../data/season';
import { weekdayOf, defaultHours } from '../data/hours';
import { Avatar } from '../components/Avatar';

const MONTHS: SeasonMonth[] = ['june', 'july', 'august', 'september'];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const SLOT_LABEL = ['Turno 1 (mañana / fin de semana 11-16h)', 'Turno 2 (tarde / fin de semana 16-21h)'];
// Horario fijo del turno de noche de los jueves (correturnos), igual todos los
// meses de la temporada (ver ROLE_HOURS en src/data/hours.ts) — por eso va
// escrito tal cual en vez de calcularlo, así se garantiza que es idéntico en
// agosto/septiembre que en junio/julio.
const NIGHT_SLOT_LABEL = 'Jueves noche · 22:00-02:00';
const THURSDAY = 3;

export function ShiftAdminScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { roster } = useRoster();
  const { overrides, setDayShifts } = useShiftOverrides();

  const [month, setMonth] = useState<SeasonMonth>('june');
  const [day, setDay] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  // Slots editados localmente (sin guardar todavía): turno1, turno2, noche jueves.
  const [localSlots, setLocalSlots] = useState<string[][]>([[], [], []]);

  const meta = getMonthMeta(month);
  const effectiveData = useMemo(
    () => getEffectiveData(month, MONTH_DATA[month], overrides),
    [month, overrides]
  );

  const weekday = weekdayOf(meta.startOffset, day);
  const isThursday = weekday === THURSDAY;
  const isOverridden = !!overrides[month]?.[day];

  // Turnos tal y como están guardados (sin los cambios pendientes en localSlots).
  const savedSlots = useMemo(() => {
    const dayShifts = effectiveData[day] ?? [];
    return [
      workingPersons(dayShifts[0] ?? ''),
      workingPersons(dayShifts[1] ?? ''),
      workingPersons(dayShifts[2] ?? ''),
    ];
  }, [effectiveData, day]);

  // Al cambiar de día o mes se descarta cualquier edición local sin guardar y
  // se parte de lo que ya está guardado para ese día.
  useEffect(() => {
    setLocalSlots(savedSlots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, day]);

  const dirty = JSON.stringify(localSlots) !== JSON.stringify(savedSlots);

  function toggle(slot: 0 | 1 | 2, id: string) {
    const slots = localSlots.map(arr => arr.slice());
    const cur = slots[slot];
    const i = cur.indexOf(id);
    if (i !== -1) {
      cur.splice(i, 1);
    } else {
      if (cur.length >= 2) cur.shift();
      cur.push(id);
    }
    slots[slot] = cur;
    setLocalSlots(slots);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const raw = [localSlots[0].join('-'), localSlots[1].join('-'), localSlots[2].join('-')].filter(Boolean);
      await setDayShifts(month, day, raw);
    } finally {
      setSaving(false);
    }
  }

  function clearDay() {
    Alert.alert('Quitar turnos', `¿Quitar los turnos asignados el día ${day} de ${MONTH_NAME[month]}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await setDayShifts(month, day, []);
          setLocalSlots([[], [], []]);
        },
      },
    ]);
  }

  const rosterIds = Object.keys(roster);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Asigna quién trabaja cada turno de mañana/tarde (o fin de semana) de los días con
        horario variable. Los correturnos con horario fijo no necesitan asignación aquí.
      </Text>

      <Text style={styles.fieldLabel}>Mes</Text>
      <View style={styles.chipRow}>
        {MONTHS.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, month === m && styles.chipActive]}
            onPress={() => {
              setMonth(m);
              setDay(1);
            }}
          >
            <Text style={[styles.chipTxt, month === m && styles.chipTxtActive]}>
              {MONTH_NAME[m]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Día</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
        {Array.from({ length: meta.totalDays }, (_, i) => i + 1).map(d => {
          const hasOverride = !!overrides[month]?.[d];
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, day === d && styles.dayChipActive]}
              onPress={() => setDay(d)}
            >
              <Text style={[styles.dayChipTxt, day === d && styles.dayChipTxtActive]}>{d}</Text>
              {hasOverride && <View style={styles.dayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.dayBox}>
        <Text style={styles.dayBoxTitle}>
          {DAY_NAMES[weekday]} {day} de {MONTH_NAME[month]}
          {isOverridden ? ' · editado' : ''}
        </Text>

        {[0, 1].map(slotIdx => (
          <View key={slotIdx} style={styles.slotBlock}>
            <Text style={styles.slotLabel}>
              {SLOT_LABEL[slotIdx]} · {defaultHours(weekday, slotIdx)}
            </Text>
            <View style={styles.personRow}>
              {rosterIds.map(id => {
                const selected = localSlots[slotIdx].includes(id);
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => toggle(slotIdx as 0 | 1, id)}
                    style={[styles.personChip, selected && styles.personChipActive]}
                  >
                    <Avatar id={id} size={24} />
                    <Text style={[styles.personChipTxt, selected && { color: colors.primary }]}>
                      {id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {isThursday && (
          <View style={styles.slotBlock}>
            <Text style={styles.slotLabel}>{NIGHT_SLOT_LABEL}</Text>
            <View style={styles.personRow}>
              {rosterIds.map(id => {
                const selected = localSlots[2].includes(id);
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => toggle(2, id)}
                    style={[styles.personChip, selected && styles.personChipActive]}
                  >
                    <Avatar id={id} size={24} />
                    <Text style={[styles.personChipTxt, selected && { color: colors.primary }]}>
                      {id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, !dirty && styles.saveBtnDisabled]}
          onPress={saveChanges}
          disabled={!dirty || saving}
        >
          <Text style={[styles.saveBtnTxt, !dirty && styles.saveBtnTxtDisabled]}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Text>
        </TouchableOpacity>

        {isOverridden && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearDay}>
            <Text style={styles.clearTxt}>Quitar asignación de este día</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 12, gap: 6 },
    intro: { fontSize: 12, color: colors.text2, marginBottom: 6, lineHeight: 18 },
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
    dayScroll: { marginBottom: 4 },
    dayChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    dayChipActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    dayChipTxt: { fontSize: 13, fontWeight: '600', color: colors.text },
    dayChipTxtActive: { color: colors.primary },
    dayDot: {
      position: 'absolute',
      top: 4,
      right: 6,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.amber,
    },
    dayBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 8,
      gap: 6,
    },
    dayBoxTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
    slotBlock: { marginBottom: 10 },
    slotLabel: { fontSize: 11, color: colors.text3, marginBottom: 8, fontWeight: '600' },
    personRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    personChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 24,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    personChipActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    personChipTxt: { fontSize: 12, fontWeight: '600', color: colors.text },
    clearBtn: { alignSelf: 'flex-start', marginTop: 4, padding: 6 },
    clearTxt: { fontSize: 12, color: colors.red, fontWeight: '600' },
    savingTxt: { fontSize: 11, color: colors.text3, fontStyle: 'italic' },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 11,
      alignItems: 'center',
      marginTop: 6,
    },
    saveBtnDisabled: { backgroundColor: colors.border },
    saveBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
    saveBtnTxtDisabled: { color: colors.text3 },
  });
}
