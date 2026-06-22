import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  label: string;
  /** Fecha en formato 'YYYY-MM-DD', o '' si no hay fecha seleccionada. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Permite dejar el campo vacío con un botón "Quitar fecha". Por defecto true. */
  clearable?: boolean;
};

function toDate(value: string): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string): string {
  if (!value) return '';
  return toDate(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Campo de fecha reutilizable. Sustituye a los antiguos TextInput de texto libre
 * "AAAA-MM-DD" por un selector nativo (calendario en iOS, diálogo en Android),
 * pero sigue guardando/devolviendo el valor como string 'YYYY-MM-DD' para no
 * tener que tocar nada de cómo se almacenan las fechas en el resto de la app.
 */
export function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
  minimumDate,
  maximumDate,
  clearable = true,
}: Props) {
  const { colors } = useTheme();
  const styles = useMakeStyles(colors);
  const [open, setOpen] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed') return;
    if (selected) onChange(toIso(selected));
  }

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={value ? styles.valueTxt : styles.placeholderTxt}>
          {value ? formatDisplay(value) : placeholder ?? 'Seleccionar fecha'}
        </Text>
      </TouchableOpacity>

      {clearable && value ? (
        <TouchableOpacity onPress={() => onChange('')} style={styles.clearBtn}>
          <Text style={styles.clearTxt}>Quitar fecha</Text>
        </TouchableOpacity>
      ) : null}

      {open && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          locale="es-ES"
        />
      )}
      {Platform.OS === 'ios' && open && (
        <TouchableOpacity style={styles.doneBtn} onPress={() => setOpen(false)}>
          <Text style={styles.doneTxt}>Listo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function useMakeStyles(colors: AppColors) {
  return StyleSheet.create({
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text3,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      backgroundColor: colors.surface2,
    },
    valueTxt: { fontSize: 14, color: colors.text },
    placeholderTxt: { fontSize: 14, color: colors.text3 },
    clearBtn: { alignSelf: 'flex-start', marginTop: 6 },
    clearTxt: { fontSize: 12, color: colors.red, fontWeight: '600' },
    doneBtn: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 14,
      marginTop: 6,
    },
    doneTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });
}
