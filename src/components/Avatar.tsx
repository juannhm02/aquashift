import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoster } from '../store/RosterContext';

type Props = {
  id: string;
  size?: number;
};

export function Avatar({ id, size = 36 }: Props) {
  const { roster } = useRoster();
  const p = roster[id] ?? { color: '#555', bg: '#eee' };
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: p.bg,
        },
      ]}
    >
      <Text style={[styles.label, { color: p.color, fontSize: size * 0.38 }]}>
        {id}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
  },
});
