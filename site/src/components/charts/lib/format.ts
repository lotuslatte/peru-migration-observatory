export const fmtNum = (x: number | null | undefined, d = 1) => x == null || Number.isNaN(x) ? '—' : x.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtUnit = (x: number | null | undefined, unit: string, d?: number) => {
  if (x == null) return '—';
  if (unit === 'S/') return 'S/ ' + fmtNum(x, d ?? 0);
  if (unit === '%') return fmtNum(x, d ?? 1) + ' %';
  if (unit === 'pp') return fmtNum(x, d ?? 1) + ' pp';
  return fmtNum(x, d ?? 2);
};
export const decimalsFor = (unit: string) => unit === 'S/' ? 0 : unit === 'ratio' ? 2 : 1;
