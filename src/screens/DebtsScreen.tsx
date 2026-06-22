import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { Avatar } from '../components/Avatar';
import { SwapRequest } from '../store/swaps';
import { computeDebts, collectStaticSubstitutions } from '../store/debts';
import { useRoster } from '../store/RosterContext';

type Props = {
  currentUser: string;
  swaps: SwapRequest[];
};

function fmtHours(h: number): string {
  // Quita el ".0" cuando son horas enteras, conserva un decimal si no.
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

export function DebtsScreen({ currentUser, swaps }: Props) {
  const { colors } = useTheme();
  const { roster } = useRoster();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const staticSubs = useMemo(() => collectStaticSubstitutions(roster), [roster]);
  const balances = useMemo(() => computeDebts(swaps, staticSubs), [swaps, staticSubs]);
  const mine = balances.filter(b => b.debtor === currentUser || b.creditor === currentUser);
  const others = balances.filter(b => b.debtor !== currentUser && b.creditor !== currentUser);

  if (balances.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>⚖️</Text>
        <Text style={styles.emptyTitle}>Sin horas pendientes</Text>
        <Text style={styles.emptyText}>
          Cuando se acepte un cambio de turno, las horas cubiertas se apuntan aquí
          de forma acumulativa: si luego se devuelve el favor, el balance se compensa solo.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Balance neto de horas cubiertas entre socorristas (cambios de turno ya aceptados).
        Se compensa automáticamente: si A debía 4h a B y luego B cubre 5h de A, el balance
        pasa a ser A debe 1h a B.
      </Text>

      {mine.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Tus horas</Text>
          {mine.map(b => (
            <DebtRow key={`${b.debtor}-${b.creditor}`} balance={b} styles={styles} highlight />
          ))}
        </>
      )}

      {others.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Entre el resto</Text>
          {others.map(b => (
            <DebtRow key={`${b.debtor}-${b.creditor}`} balance={b} styles={styles} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function DebtRow({
  balance,
  styles,
  highlight,
}: {
  balance: { debtor: string; creditor: string; hours: number };
  styles: ReturnType<typeof makeStyles>;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <Avatar id={balance.debtor} size={34} />
      <View style={styles.rowMid}>
        <Text style={styles.rowTxt}>
          <Text style={styles.bold}>{balance.debtor}</Text> debe{' '}
          <Text style={styles.hours}>{fmtHours(balance.hours)}</Text> a{' '}
          <Text style={styles.bold}>{balance.creditor}</Text>
        </Text>
      </View>
      <Avatar id={balance.creditor} size={34} />
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 14, gap: 10 },
    intro: { fontSize: 12, color: colors.text2, lineHeight: 18, marginBottom: 6 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text3,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 8,
      marginBottom: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    rowHighlight: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    rowMid: { flex: 1 },
    rowTxt: { fontSize: 13, color: colors.text2, lineHeight: 19 },
    bold: { fontWeight: '700', color: colors.text },
    hours: { fontWeight: '700', color: colors.amber },
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
  });
}
