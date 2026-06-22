import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoster } from '../store/RosterContext';
import { parseShift, canonicalRaw } from '../data/shifts';

type Props = {
  raw: string;
  /** Horario a mostrar bajo los nombres, ej. "11:30-15:30" */
  hours?: string;
  /** Tamaño más grande, usado en la vista semanal del calendario. */
  large?: boolean;
};

export function ShiftPill({ raw, hours, large }: Props) {
  const { roster } = useRoster();
  // "J-B" y "B-J" son la misma pareja: se reordena alfabéticamente antes de
  // pintar para que el texto y el color (que depende de quién va primero)
  // sean siempre iguales sin importar en qué orden se guardó el turno.
  const display = canonicalRaw(raw);
  const { working } = parseShift(display);
  const p0 = roster[working[0]] ?? { color: '#555', bg: '#eee' };

  return (
    <View style={[styles.pill, large && styles.pillLarge, { backgroundColor: p0.bg }]}>
      <View style={[styles.dot, large && styles.dotLarge, { backgroundColor: p0.color }]} />
      <View>
        {/* Se muestra el dato tal cual está anotado (ej. "F(B)-M"), sin
            expandir la sustitución a texto ("B sustituye a F"): la notación
            entre paréntesis ya es la convención que se usa en toda la app. */}
        <Text style={[styles.text, large && styles.textLarge, { color: p0.color }]}>{display}</Text>
        {hours ? <Text style={[styles.hours, large && styles.hoursLarge, { color: p0.color }]}>{hours}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pillLarge: {
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 3,
  },
  dotLarge: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
  textLarge: {
    fontSize: 14,
  },
  swap: {
    fontSize: 8,
    fontWeight: '600',
    fontStyle: 'italic',
    opacity: 0.85,
  },
  swapLarge: {
    fontSize: 11,
  },
  hours: {
    fontSize: 8,
    fontWeight: '500',
    opacity: 0.85,
  },
  hoursLarge: {
    fontSize: 11,
  },
});
