/**
 * Horarios de trabajo.
 *
 * Reglas generales (cualquier socorrista sin rol especial, "socorrista"):
 * - Lunes a viernes: turno 1 = 11:30-15:30, turno 2 = 15:30-19:30.
 * - Sábado y domingo: turno 1 (equipo rotativo) = 11:00-16:00, turno 2 = 16:00-21:00.
 *
 * Reglas por rol (Persona.role, ver src/theme/colors.ts): un socorrista con rol
 * 'correturnos' (ej. Juan/Barti) no sigue el patrón anterior, tiene horario fijo
 * propio (ver ROLE_HOURS) que se aplica automáticamente sin tener que anotarlo
 * a mano en cada turno de shifts.ts.
 *
 * Para una excepción puntual de un solo día (no ligada al rol) se puede seguir
 * anotando la hora entre paréntesis en el dato del turno, ej. 'F-M(10:00-14:00)':
 * esa anotación explícita siempre tiene prioridad sobre rol y horario por defecto.
 */

import { Persona, Role, Roster } from '../theme/colors';

const TIME_RANGE = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;

/**
 * Horario fijo según rol, por día de la semana (0=lunes ... 6=domingo).
 * Si un rol no tiene entrada para un día concreto, ese día sigue el patrón
 * general (defaultHours) en vez de tener horario propio.
 */
const ROLE_HOURS: Partial<Record<Role, Partial<Record<number, string>>>> = {
  correturnos: {
    3: '22:00-02:00', // jueves (noche)
    5: '16:00-21:00', // sábado
    6: '16:00-21:00', // domingo
  },
};

/** Horario fijo de un rol para un día concreto, si lo tiene definido. */
function roleHours(role: Role | undefined, weekday: number): string | undefined {
  if (!role) return undefined;
  return ROLE_HOURS[role]?.[weekday];
}

/** ¿La nota entre paréntesis de un turno es en realidad un horario explícito (ej. "10:00-14:00")? */
export function isTimeRange(note: string | null | undefined): boolean {
  return !!note && TIME_RANGE.test(note.replace(/\s+/g, ''));
}

/** Día de la semana del turno: 0=Lunes ... 5=Sábado, 6=Domingo */
export function weekdayOf(startOffset: number, day: number): number {
  return (startOffset + (day - 1)) % 7;
}

/** Horario por defecto según el día de la semana y la posición del turno (0=primer turno, 1=segundo turno) */
export function defaultHours(weekday: number, slotIndex: number): string {
  const isWeekend = weekday === 5 || weekday === 6;
  if (isWeekend) {
    return slotIndex === 0 ? '11:00-16:00' : '16:00-21:00';
  }
  return slotIndex === 0 ? '11:30-15:30' : '15:30-19:30';
}

/**
 * Horario final a mostrar para un turno. Orden de prioridad:
 * 1. Nota explícita entre paréntesis en el dato del turno (excepción puntual, ej. 'F-M(10:00-14:00)').
 * 2. Horario fijo del rol de las personas asignadas (ej. 'correturnos' los jueves y fines de semana).
 * 3. Horario por defecto según el día de la semana y la posición del turno dentro del día.
 *
 * `persons` y `roster` son opcionales para no romper llamadas existentes que aún
 * no pasan esa información; sin ellos se comporta igual que antes (solo nota + defecto).
 */
export function resolveHours(
  weekday: number,
  slotIndex: number,
  note: string | null | undefined,
  persons: string[] = [],
  roster: Roster = {}
): string {
  if (isTimeRange(note)) return (note as string).trim();

  for (const id of persons) {
    const persona: Persona | undefined = roster[id];
    const fromRole = roleHours(persona?.role, weekday);
    if (fromRole) return fromRole;
  }

  return defaultHours(weekday, slotIndex);
}

/**
 * Convierte un rango "HH:MM-HH:MM" en horas (decimal). Soporta turnos que
 * cruzan la medianoche (ej. el de correturnos del jueves, "22:00-02:00" = 4h):
 * si la hora de fin es menor o igual que la de inicio, se asume que cae al
 * día siguiente y se le suman 24h antes de restar.
 */
export function rangeHours(range: string): number {
  const m = range.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  const [, h1, m1, h2, m2] = m;
  const start = Number(h1) * 60 + Number(m1);
  let end = Number(h2) * 60 + Number(m2);
  if (end <= start) end += 24 * 60;
  return (end - start) / 60;
}
