/**
 * Año de la temporada actual. Cámbialo cada verano: los días de la semana en
 * los que cae el 1 de cada mes y el número de días de cada mes se recalculan
 * solos a partir de esta fecha (no hay que tocar "startOffset"/"totalDays" a mano).
 *
 * Los turnos (src/data/shifts.ts) NO se heredan entre temporadas: al cambiar
 * de año, vacía JUNE_DATA/JULY_DATA/AUGUST_DATA/SEPTEMBER_DATA (déjalos en
 * `{}`) y empieza a rellenarlos de cero para la temporada nueva.
 */
export const SEASON_YEAR = 2026;

export type SeasonMonth = 'june' | 'july' | 'august' | 'september';

/** Índice de mes de JS (0=enero ... 11=diciembre) para cada mes de la temporada */
export const MONTH_INDEX: Record<SeasonMonth, number> = {
  june: 5,
  july: 6,
  august: 7,
  september: 8,
};

export const MONTH_NAME: Record<SeasonMonth, string> = {
  june: 'Junio',
  july: 'Julio',
  august: 'Agosto',
  september: 'Septiembre',
};

/** Convierte el day-of-week de JS (0=domingo) a la convención de la app (0=lunes ... 6=domingo) */
function toMondayFirst(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/**
 * Día de la semana (0=lunes) en el que cae el día 1, y nº de días reales del
 * mes, calculados a partir del año de temporada. Sustituye a los valores que
 * antes había que calcular y escribir a mano por mes.
 */
export function getMonthMeta(
  month: SeasonMonth,
  year: number = SEASON_YEAR
): { startOffset: number; totalDays: number } {
  const monthIndex = MONTH_INDEX[month];
  const startOffset = toMondayFirst(new Date(year, monthIndex, 1).getDay());
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  return { startOffset, totalDays };
}

/**
 * Construye la fecha 'YYYY-MM-DD' de un día concreto de la temporada, para
 * poder compararla con el periodo activeFrom/activeUntil de un socorrista
 * (ver isPersonaActiveOn en theme/colors.ts).
 */
export function dateKey(month: SeasonMonth, day: number, year: number = SEASON_YEAR): string {
  const mm = String(MONTH_INDEX[month] + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}
