import React, { useMemo } from 'react';
import { CalendarScreen } from './CalendarScreen';
import { MONTH_DATA } from '../data/shifts';
import { getMonthMeta } from '../data/season';
import { useTabSession } from '../store/TabSessionContext';
import { useShiftOverrides } from '../store/ShiftOverridesContext';
import { getEffectiveData } from '../store/shiftOverrides';

type MonthKey = keyof typeof MONTH_DATA;

export function MonthTabScreen({ month }: { month: MonthKey }) {
  const { user, swaps, setSwaps } = useTabSession();
  const { overrides } = useShiftOverrides();
  const meta = getMonthMeta(month);
  // Los turnos asignados desde el panel de admin (mañana/tarde/fin de semana)
  // sustituyen al dato estático del día correspondiente.
  const data = useMemo(
    () => getEffectiveData(month, MONTH_DATA[month], overrides),
    [month, overrides]
  );

  return (
    <CalendarScreen
      month={month}
      data={data}
      totalDays={meta.totalDays}
      startOffset={meta.startOffset}
      currentUser={user}
      swaps={swaps}
      onSwapsChange={setSwaps}
    />
  );
}
