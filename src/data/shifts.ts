export type ShiftEntry = {
  day: number;
  month: 'june' | 'july' | 'august' | 'september';
  raw: string[]; // e.g. ['BJ-F(M)', 'L-M']
};

export type SeasonMonthKey = 'june' | 'july' | 'august' | 'september';

export const JUNE_DATA: Record<number, string[]> = {
  12: ['BJ-F(M)', 'L-M'],
  13: ['L-BJ', 'J-B(F)'],
  14: ['F-M', 'J-B'],
  15: ['BJ-F', 'L-M'],
  16: ['BJ-F', 'L-M'],
  17: ['L-BJ', 'F-M'],
  18: ['BJ-F', 'L-M', 'J-B'], // jueves (noche) — correturnos
  19: ['BJ-F', 'L-M'],
  20: ['F-BJ(M)', 'J-B'],
  21: ['L-M', 'J-B'],
  22: ['F(B)-M', 'L-BJ'],
  23: ['F-M', 'L-BJ'],
  24: ['L-M', 'BJ-F'],
  25: ['F-M', 'L-BJ', 'J-B'], // jueves (noche) — correturnos
  26: ['BJ-M', 'L-F'],
  27: ['L-M', 'J-B'],
  28: ['BJ-F', 'J-B'],
  29: ['F-M', 'L-BJ'],
  30: ['F-M', 'L-BJ'],
};

export const JULY_DATA: Record<number, string[]> = {
  1:  ['F-M', 'L-BJ'],
  2:  ['F-M', 'L-BJ', 'J-B'], // jueves (noche) — correturnos
  3:  ['F-M', 'L-BJ'],
  4:  ['F-M(BJ)', 'B-J'],
  5:  ['L-BJ', 'B-J'],
  6:  ['BJ-F', 'L-M'],
  7:  ['BJ-F', 'L-M'],
  8:  ['BJ-F', 'L-M'],
  9:  ['BJ-F', 'L-M', 'J-B'], // jueves (noche) — correturnos
  10: ['BJ-F', 'L-M'],
  11: ['F-BJ', 'B-J'],
  12: ['M-L', 'B-J'],
  13: ['M-BJ', 'L-F'],
  14: ['M-BJ', 'L-F'],
  15: ['M-BJ', 'L-F'],
  16: ['M-BJ', 'L-F', 'J-B'], // jueves (noche) — correturnos
  17: ['M-BJ', 'L-F'],
  18: ['M-L', 'B-J'],
  19: ['F-BJ', 'B-J'],
  20: ['M-F', 'L-BJ'],
  21: ['M-BJ', 'L-F'],
  22: ['M-F', 'L-BJ'],
  23: ['J-B'], // jueves (noche) — correturnos, fuera del contrato de BJ/F/L/M
  30: ['J-B'], // jueves (noche) — correturnos, fuera del contrato de BJ/F/L/M
};

/**
 * Agosto y septiembre: Juan (J) y Barti (B) son los dos socorristas de "toda la temporada"
 * (hasta el 10 de septiembre) y ya tienen horario fijo de correturnos: jueves 22:00-02:00
 * (noche) y sábados/domingos 16:00-21:00 (ver ROLE_HOURS en src/data/hours.ts, se aplica
 * solo). El resto de turnos de estos meses está pendiente: se incorporan 4 socorristas
 * nuevos (C, R, MJ, A) hasta el 10 de septiembre pero su rotación todavía no se ha
 * decidido, así que esos días se dejan vacíos a la espera de turnos.
 */
export const AUGUST_DATA: Record<number, string[]> = {
  1:  ['J-B'], // sábado
  2:  ['J-B'], // domingo
  6:  ['J-B'], // jueves (noche)
  8:  ['J-B'], // sábado
  9:  ['J-B'], // domingo
  13: ['J-B'], // jueves (noche)
  15: ['J-B'], // sábado
  16: ['J-B'], // domingo
  20: ['J-B'], // jueves (noche)
  22: ['J-B'], // sábado
  23: ['J-B'], // domingo
  27: ['J-B'], // jueves (noche)
  29: ['J-B'], // sábado
  30: ['J-B'], // domingo
};

export const SEPTEMBER_DATA: Record<number, string[]> = {
  3:  ['J-B'], // jueves (noche)
  5:  ['J-B'], // sábado
  6:  ['J-B'], // domingo
  10: ['J-B'], // jueves (noche) — último día de Juan y Barti esta temporada
};

/** Mapa centralizado mes → datos estáticos, para no repetirlo en cada pantalla que lo necesite. */
export const MONTH_DATA: Record<SeasonMonthKey, Record<number, string[]>> = {
  june: JUNE_DATA,
  july: JULY_DATA,
  august: AUGUST_DATA,
  september: SEPTEMBER_DATA,
};

const TIME_RANGE = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;

function isTimeRangeNote(note: string): boolean {
  return TIME_RANGE.test(note.replace(/\s+/g, ''));
}

/** Una sustitución puntual: `to` trabaja ese turno en lugar de `from`. */
export type Substitution = { from: string; to: string };

export type ParsedShift = {
  /** Personas que trabajan REALMENTE ese turno, ya aplicadas las sustituciones. */
  working: string[];
  substitutions: Substitution[];
};

/**
 * Analiza un turno crudo. El separador "-" simplemente une a las dos personas
 * asignadas a ese turno (no implica que una "ceda" el turno a la otra). Una nota
 * entre paréntesis pegada a un nombre, ej. "BJ(M)", significa que esa persona
 * (M) sustituye a la nombrada (BJ) solo ese día. Ej.:
 *   "F-BJ(M)"  → el turno es de F y BJ, pero M sustituye a BJ → working: ['F','M']
 *   "F(B)-M"   → el turno es de F y M, pero B sustituye a F  → working: ['B','M']
 * Si la nota es en realidad un horario explícito (ej. "10:00-14:00"), no es una
 * sustitución de persona: se deja tal cual para que resuelva el horario (ver hours.ts).
 */
export function parseShift(raw: string): ParsedShift {
  const working: string[] = [];
  const substitutions: Substitution[] = [];
  for (const seg of raw.split('-')) {
    const m = seg.trim().match(/^([A-Za-z]+)(?:\(([^)]+)\))?$/);
    if (!m) continue;
    const [, name, note] = m;
    if (note && !isTimeRangeNote(note)) {
      working.push(note);
      substitutions.push({ from: name, to: note });
    } else {
      working.push(name);
    }
  }
  return { working, substitutions };
}

/** Personas que trabajan realmente un turno (tras aplicar sustituciones de persona). */
export function workingPersons(raw: string): string[] {
  return parseShift(raw).working;
}

/**
 * Reordena los segmentos de un turno de 2 personas alfabéticamente (por el
 * nombre asignado, ignorando la sustitución entre paréntesis si la hay), para
 * que "J-B" y "B-J" sean siempre la misma "pareja": se muestran con el mismo
 * texto y el mismo color en todas las pantallas (ShiftPill, modal de
 * solicitud, notificaciones, mis cambios...). No modifica los datos
 * guardados (MONTH_DATA / overrides), solo cómo se pinta un raw concreto.
 */
export function canonicalRaw(raw: string): string {
  const segs = raw.split('-').map(s => s.trim());
  if (segs.length < 2) return raw;
  const key = (seg: string) => seg.match(/^([A-Za-z]+)/)?.[1] ?? seg;
  return segs.slice().sort((a, b) => key(a).localeCompare(key(b))).join('-');
}

/** Extrae los nombres originalmente asignados a un turno, ej. "BJ-F(M)" → ['BJ','F'] (ignora sustituciones). */
export function parsePersons(raw: string): string[] {
  return raw
    .replace(/\([^)]*\)/g, '')
    .split('-')
    .map(p => p.trim())
    .filter(Boolean);
}

/** Todas las personas que trabajan REALMENTE un día (tras sustituciones), sin duplicados. */
export function dayPersons(data: Record<number, string[]>, day: number): string[] {
  return [...new Set((data[day] ?? []).flatMap(workingPersons))];
}

/** Nota de horario explícito entre paréntesis (excepción puntual), ej. "J-B(10:00-14:00)" → "10:00-14:00". */
export function parseNote(raw: string): string | null {
  const m = raw.match(/\(([^)]+)\)/);
  if (!m) return null;
  return isTimeRangeNote(m[1]) ? m[1] : null;
}

/**
 * Aplica una sustitución de persona a un turno crudo: `to` pasa a sustituir a
 * `from` ese día, anotado entre paréntesis como ya se hacía manualmente
 * (ej. "F-M" + sustituir F por B → "F(B)-M"). Si `from` ya tenía una
 * sustitución anotada, la sobrescribe con la nueva. Si `from` no aparece en
 * el turno, lo devuelve sin cambios.
 */
export function applySubstitution(raw: string, from: string, to: string): string {
  return raw
    .split('-')
    .map(seg => {
      const m = seg.trim().match(/^([A-Za-z]+)(?:\(([^)]+)\))?$/);
      if (!m) return seg;
      const [, name] = m;
      if (name === from) return `${name}(${to})`;
      return seg;
    })
    .join('-');
}
