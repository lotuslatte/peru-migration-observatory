// One number format for both observatories. Peruvian style: decimal point,
// comma for thousands, no space before the percent sign: 72.6%, S/1,334, 2.4 pp.
export const MISSING = 's/d';
const grouped = (x: number, d: number) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export const decimalsFor = (unit: string) => unit === 'S/' ? 0 : unit === 'ratio' || unit === 'S/h' ? 2 : 1;

/** Plain number with thousands separators. */
export const fmtNum = (x: number | null | undefined, d = 1) => x == null || Number.isNaN(x) ? MISSING : grouped(x, d);
/** Whole number with thousands separators (sample sizes, populations). */
export const fmtInt = (x: number | null | undefined) => x == null || Number.isNaN(x) ? MISSING : grouped(Math.round(x), 0);

/** Value with its unit. Units: %, S/, S/h, pp, h, ratio, ‰. */
export function fmtUnit(x: number | null | undefined, unit: string, d?: number): string {
  if (x == null || Number.isNaN(x)) return MISSING;
  const n = grouped(x, d ?? decimalsFor(unit));
  if (unit === '%') return n + '%';
  if (unit === '‰') return n + '‰';
  if (unit === 'S/') return 'S/' + n;
  if (unit === 'S/h') return 'S/' + n;
  if (unit === 'ratio' || unit === '') return n;
  return `${n} ${unit}`;
}
/** Axis tick: same as fmtUnit without a trailing ".0". */
export const fmtTick = (x: number, unit: string) => fmtUnit(x, unit).replace(/\.0(?=%|‰| |$)/, '');
/** Signed change, in the unit of a difference (pp for percentages). */
export const fmtDelta = (d: number, unit: string) => (d > 0 ? '+' : d < 0 ? '−' : '') + fmtUnit(Math.abs(d), unit === '%' ? 'pp' : unit);
/** Long name of a unit for axis titles. */
export const unitTitle = (unit: string) => ({ '%': 'Porcentaje', 'S/': 'Soles al mes', 'S/h': 'Soles por hora', pp: 'Puntos porcentuales', h: 'Horas por semana', ratio: 'Razón', '‰': 'Por mil habitantes' } as Record<string, string>)[unit] ?? unit;
/** Value of a cell ({v}) or a bare number. */
export const fmtCell = (c: { v: number | null } | number | null | undefined, n = 1) => fmtNum(typeof c === 'number' ? c : c?.v, n);
