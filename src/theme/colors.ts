export const LIGHT_COLORS = {
  blue:      '#2563eb',
  blueLight: '#dbeafe',
  blueDark:  '#1e40af',
  green:     '#16a34a',
  greenLight:'#dcfce7',
  amber:     '#d97706',
  amberLight:'#fef3c7',
  red:       '#dc2626',
  redLight:  '#fee2e2',
  purple:    '#7c3aed',
  purpleLight:'#ede9fe',
  orange:    '#ea580c',
  orangeLight:'#ffedd5',

  bg:        '#f1f5f9',
  surface:   '#ffffff',
  surface2:  '#f8fafc',
  border:    '#e2e8f0',
  border2:   '#cbd5e1',
  text:      '#0f172a',
  text2:     '#475569',
  text3:     '#94a3b8',

  primary:   '#2563eb',
};

export const DARK_COLORS: typeof LIGHT_COLORS = {
  blue:      '#60a5fa',
  blueLight: '#1e3a5f',
  blueDark:  '#93c5fd',
  green:     '#4ade80',
  greenLight:'#14532d',
  amber:     '#fbbf24',
  amberLight:'#451a03',
  red:       '#f87171',
  redLight:  '#450a0a',
  purple:    '#c4b5fd',
  purpleLight:'#3b0764',
  orange:    '#fb923c',
  orangeLight:'#431407',

  bg:        '#0f172a',
  surface:   '#1e293b',
  surface2:  '#162032',
  border:    '#334155',
  border2:   '#475569',
  text:      '#f1f5f9',
  text2:     '#cbd5e1',
  text3:     '#94a3b8',

  primary:   '#3b82f6',
};

export type AppColors = typeof LIGHT_COLORS;

/** @deprecated usa `useTheme().colors` (src/theme/ThemeContext.tsx) para que la pantalla reaccione al modo claro/oscuro. */
export const COLORS = LIGHT_COLORS;

/** Rol del socorrista. Por ahora solo afecta al horario que se le aplica por defecto. */
export type Role = 'socorrista' | 'correturnos';

export type Persona = {
  color: string;
  bg: string;
  /** Nombre completo, se muestra en login y perfil (el calendario sigue usando el apodo) */
  fullName: string;
  /** Fecha 'YYYY-MM-DD' desde la que tiene turnos asignados. Sin valor = aún sin incorporar. */
  activeFrom?: string;
  /** Fecha 'YYYY-MM-DD' del último día con turnos asignados esta temporada. */
  activeUntil?: string;
  /** 'correturnos' = horario fijo (jueves + fin de semana) en vez del patrón mañana/tarde habitual */
  role?: Role;
};

export type Roster = Record<string, Persona>;

/**
 * Indica si un socorrista tiene turnos asignados en una fecha concreta
 * ('YYYY-MM-DD'), según su periodo activeFrom/activeUntil. Sin activeFrom =
 * todavía sin incorporar esa temporada → no activo. Se usa, por ejemplo, para
 * no ofrecer como destino de un cambio de turno a alguien que en esa fecha
 * aún no trabaja o ya ha terminado su periodo (ver SwapRequestModal.tsx).
 */
export function isPersonaActiveOn(p: Persona, dateStr: string): boolean {
  if (!p.activeFrom || dateStr < p.activeFrom) return false;
  if (p.activeUntil && dateStr > p.activeUntil) return false;
  return true;
}

/**
 * Roster de partida (semilla). A partir de aquí el roster real vive en
 * AsyncStorage (src/store/roster.ts) y se gestiona desde la pantalla de
 * administración: este objeto solo se usa la primera vez que arranca la app.
 */
export const DEFAULT_PERSONAS: Roster = {
  // Termina el 22 de julio
  BJ: { color: '#2563eb', bg: '#dbeafe', fullName: 'Bartolomé José', activeFrom: '2026-06-12', activeUntil: '2026-07-22', role: 'socorrista' },
  F:  { color: '#ea580c', bg: '#ffedd5', fullName: 'Fernando',       activeFrom: '2026-06-12', activeUntil: '2026-07-22', role: 'socorrista' },
  L:  { color: '#16a34a', bg: '#dcfce7', fullName: 'López',          activeFrom: '2026-06-12', activeUntil: '2026-07-22', role: 'socorrista' },
  M:  { color: '#7c3aed', bg: '#ede9fe', fullName: 'Marisa',         activeFrom: '2026-06-12', activeUntil: '2026-07-22', role: 'socorrista' },
  // Toda la temporada, hasta el 10 de septiembre — horario fijo de correturnos
  J:  { color: '#d97706', bg: '#fef3c7', fullName: 'Juan',           activeFrom: '2026-06-12', activeUntil: '2026-09-10', role: 'correturnos' },
  B:  { color: '#dc2626', bg: '#fee2e2', fullName: 'Barti',          activeFrom: '2026-06-12', activeUntil: '2026-09-10', role: 'correturnos' },
  // Nuevos, se incorporan en agosto (fecha de inicio pendiente de confirmar) hasta el 10 de septiembre
  C:  { color: '#0891b2', bg: '#cffafe', fullName: 'Chencho',        activeUntil: '2026-09-10', role: 'socorrista' },
  R:  { color: '#db2777', bg: '#fce7f3', fullName: 'Rosalía',        activeUntil: '2026-09-10', role: 'socorrista' },
  MJ: { color: '#65a30d', bg: '#ecfccb', fullName: 'Meji',           activeUntil: '2026-09-10', role: 'socorrista' },
  A:  { color: '#475569', bg: '#e2e8f0', fullName: 'Ana',            activeUntil: '2026-09-10', role: 'socorrista' },
};

/** Paleta de colores disponible al crear/editar un socorrista en la pantalla de administración */
export const PALETTE: { color: string; bg: string }[] = [
  { color: '#2563eb', bg: '#dbeafe' }, // azul
  { color: '#ea580c', bg: '#ffedd5' }, // naranja
  { color: '#16a34a', bg: '#dcfce7' }, // verde
  { color: '#7c3aed', bg: '#ede9fe' }, // morado
  { color: '#d97706', bg: '#fef3c7' }, // ámbar
  { color: '#dc2626', bg: '#fee2e2' }, // rojo
  { color: '#0891b2', bg: '#cffafe' }, // cian
  { color: '#db2777', bg: '#fce7f3' }, // rosa
  { color: '#65a30d', bg: '#ecfccb' }, // lima
  { color: '#475569', bg: '#e2e8f0' }, // gris
  { color: '#0d9488', bg: '#ccfbf1' }, // teal
  { color: '#4f46e5', bg: '#e0e7ff' }, // índigo
  { color: '#e11d48', bg: '#ffe4e6' }, // rosa fuerte
  { color: '#0284c7', bg: '#e0f2fe' }, // cielo
  { color: '#ca8a04', bg: '#fef9c3' }, // amarillo
  { color: '#c026d3', bg: '#fae8ff' }, // fucsia
];
