import { SwapRequest } from './swaps';
import { Roster } from '../theme/colors';
import { SeasonMonthKey, MONTH_DATA, parseShift, parseNote } from '../data/shifts';
import { getMonthMeta } from '../data/season';
import { weekdayOf, resolveHours, rangeHours } from '../data/hours';

export type DebtBalance = { debtor: string; creditor: string; hours: number };

export type StaticSubstitution = { from: string; to: string; hours: number };

const MONTHS: SeasonMonthKey[] = ['june', 'july', 'august', 'september'];

/**
 * Recorre el dato ESTÁTICO de turnos (src/data/shifts.ts, no los overrides
 * del panel de admin ni los cambios aceptados desde la app) buscando
 * sustituciones ya anotadas a mano entre paréntesis (ej. "F(B)-M"). Estas
 * sustituciones no tienen un SwapRequest detrás, así que sin esto no
 * aparecerían en Deudas aunque ya estén en el calendario.
 *
 * Solo se usa el dato estático a propósito: las sustituciones que vienen de
 * aceptar un cambio en la app ya se escriben en `overrides` y ya se cuentan
 * por separado vía `swap.hours` en computeDebts, así que mirar también
 * overrides aquí las contaría dos veces.
 */
export function collectStaticSubstitutions(roster: Roster): StaticSubstitution[] {
  const result: StaticSubstitution[] = [];
  for (const month of MONTHS) {
    const meta = getMonthMeta(month);
    const data = MONTH_DATA[month];
    for (const [dayStr, shifts] of Object.entries(data)) {
      const day = Number(dayStr);
      const weekday = weekdayOf(meta.startOffset, day);
      shifts.forEach((raw, slotIndex) => {
        const { working, substitutions } = parseShift(raw);
        if (substitutions.length === 0) return;
        const range = resolveHours(weekday, slotIndex, parseNote(raw), working, roster);
        const hours = rangeHours(range);
        if (!hours) return;
        for (const s of substitutions) {
          result.push({ from: s.from, to: s.to, hours });
        }
      });
    }
  }
  return result;
}

/**
 * Calcula el balance neto de horas que se deben los socorristas entre sí, a
 * partir de los cambios de turno ACEPTADOS (con horas registradas, ver
 * NotificationsScreen.tsx) y de las sustituciones ya anotadas a mano en el
 * calendario (ver collectStaticSubstitutions). Es acumulativo y se compensa
 * solo: si A cubre 4h de B, B le debe 4h a A; si después B cubre 5h de A, el
 * balance neto de esa pareja pasa a ser A debe 1h a B (no se guardan dos
 * deudas separadas).
 */
export function computeDebts(
  swaps: SwapRequest[],
  staticSubs: StaticSubstitution[] = []
): DebtBalance[] {
  // ledger[`${debtor}->${creditor}`] = horas brutas que debtor debe a creditor
  // (antes de compensar con la dirección contraria de la misma pareja).
  const ledger = new Map<string, number>();
  for (const s of swaps) {
    if (s.status !== 'accepted' || !s.hours) continue;
    const key = `${s.from}->${s.to}`;
    ledger.set(key, (ledger.get(key) ?? 0) + s.hours);
  }
  for (const s of staticSubs) {
    const key = `${s.from}->${s.to}`;
    ledger.set(key, (ledger.get(key) ?? 0) + s.hours);
  }

  const pairs = new Set<string>();
  for (const key of ledger.keys()) {
    const [a, b] = key.split('->');
    pairs.add([a, b].sort().join('|'));
  }

  const result: DebtBalance[] = [];
  for (const pairKey of pairs) {
    const [a, b] = pairKey.split('|');
    const aOwesB = ledger.get(`${a}->${b}`) ?? 0;
    const bOwesA = ledger.get(`${b}->${a}`) ?? 0;
    const net = aOwesB - bOwesA;
    if (net > 0) result.push({ debtor: a, creditor: b, hours: net });
    else if (net < 0) result.push({ debtor: b, creditor: a, hours: -net });
    // net === 0 → saldado entre ellos, no se incluye
  }
  return result.sort((x, y) => y.hours - x.hours);
}
