// Escena declarativa para el scrolly v2: coordenadas absolutas en un viewBox fijo; el renderizador sólo interpola atributos.
export const VB = { w: 640, h: 480 };
export type Mark = { key: string; x: number; y: number; w: number; h: number; rx: number; color: number; label?: string; value?: string; labelX?: number; labelY?: number; anchor?: 'start' | 'end' | 'middle' };
export type Line = { key: string; points: [number, number][]; color: number; label?: string };
export type Axis = { ticks: { pos: number; label: string }[]; orient: 'x' | 'y'; at: number };
export type Annotation = { key: string; x: number; y: number; text: string; dx?: number; dy?: number };
export type Scene = { layout: string; marks: Mark[]; lines: Line[]; axes: Axis[]; annotations: Annotation[]; mapFill?: Record<string, number>; mapDim?: string; title: string; note?: string };
export type ChartSpec = { type: 'kpis' | 'bars' | 'lines' | 'map' | 'dots'; title: string; note?: string; unit?: string; items?: any[]; years?: number[]; series?: any[]; annotations?: { key?: string; text: string; x?: number; y?: number; dx?: number; dy?: number }[]; higherBetter?: boolean };

const fmt = (v: number | null | undefined, unit = '%') => v == null ? '—' : unit === 'S/' ? 'S/ ' + v.toLocaleString('es-PE', { maximumFractionDigits: 0 }) : unit === '' ? v.toLocaleString('es-PE', { maximumFractionDigits: 0 }) : `${v.toLocaleString('es-PE', { maximumFractionDigits: 1 })}${unit === 'pp' ? ' pp' : unit === '‰' ? ' ‰' : ' %'}`;
const nice = (max: number) => { const p = Math.pow(10, Math.floor(Math.log10(max || 1))); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };

export function buildScene(c: ChartSpec, ctx: { project?: (id: string) => [number, number] | null; names?: Record<string, string> }): Scene {
  const s: Scene = { layout: c.type, marks: [], lines: [], axes: [], annotations: [], title: c.title, note: c.note };
  const items = (c.items ?? []).filter(i => i.v != null);
  if (c.type === 'kpis') {
    const n = items.length; const cw = VB.w / n;
    items.forEach((it, i) => { const r = 22 + Math.min(70, Math.sqrt(it.v) * 7); s.marks.push({ key: it.key ?? it.label, x: i * cw + cw / 2 - r, y: 200 - r, w: 2 * r, h: 2 * r, rx: r, color: it.color ?? i % 3, label: it.label, value: fmt(it.v, c.unit ?? '%'), labelX: i * cw + cw / 2, labelY: 200 + r + 22, anchor: 'middle' }); });
  } else if (c.type === 'bars') {
    const left = 200, right = VB.w - 70; const rh = Math.min(36, (VB.h - 30) / Math.max(items.length, 1)); const max = nice(Math.max(...items.map(i => i.v)) * 1.02);
    items.forEach((it, i) => { const y = 16 + i * rh; const w = Math.max(2, (it.v / max) * (right - left)); s.marks.push({ key: it.key ?? it.label, x: left, y: y + 4, w, h: rh - 8, rx: 4, color: it.color ?? 0, label: it.label, value: fmt(it.v, c.unit ?? '%'), labelX: left - 8, labelY: y + rh / 2 + 4, anchor: 'end' }); });
    s.axes.push({ orient: 'x', at: 16 + items.length * rh + 6, ticks: [0, .25, .5, .75, 1].map(t => ({ pos: left + t * (right - left), label: fmt(t * max, c.unit ?? '%').replace(' %', '') })) });
  } else if (c.type === 'dots') {
    // beeswarm-lite: círculos en fila ordenados por valor
    const sorted = [...items].sort((a, b) => b.v - a.v); const left = 40, right = VB.w - 40; const min = Math.min(...items.map(i => i.v)), max = Math.max(...items.map(i => i.v));
    sorted.forEach((it, i) => { const x = left + ((it.v - min) / ((max - min) || 1)) * (right - left); const y = 240 + ((i % 5) - 2) * 26; const r = 9; s.marks.push({ key: it.key ?? it.label, x: x - r, y: y - r, w: 2 * r, h: 2 * r, rx: r, color: it.color ?? 0, label: it.label, value: fmt(it.v, c.unit ?? '%'), labelX: x, labelY: y - r - 4, anchor: 'middle' }); });
    s.axes.push({ orient: 'x', at: 400, ticks: [0, .5, 1].map(t => ({ pos: left + t * (right - left), label: fmt(min + t * (max - min), c.unit ?? '%') })) });
  } else if (c.type === 'lines') {
    const years = c.years ?? []; const m = { t: 20, r: 110, b: 36, l: 50 }; const all = (c.series ?? []).flatMap((q: any) => q.values).filter((v: any) => v != null);
    const max = nice(Math.max(...all) * 1.05); const x = (i: number) => m.l + (i / Math.max(years.length - 1, 1)) * (VB.w - m.l - m.r); const y = (v: number) => VB.h - m.b - (v / max) * (VB.h - m.t - m.b);
    (c.series ?? []).forEach((q: any, k: number) => { const pts: [number, number][] = years.map((_yr, i) => q.values[i] == null ? null : [x(i), y(q.values[i])]).filter(Boolean) as any; s.lines.push({ key: q.key ?? q.label, points: pts, color: q.color ?? k, label: q.label });
      const last = pts[pts.length - 1]; if (last) s.marks.push({ key: q.key ?? q.label, x: last[0] - 5, y: last[1] - 5, w: 10, h: 10, rx: 5, color: q.color ?? k, label: `${q.label} ${fmt(q.values.filter((v: any) => v != null).at(-1), c.unit ?? '%')}`, labelX: last[0] + 9, labelY: last[1] + 4, anchor: 'start' }); });
    s.axes.push({ orient: 'x', at: VB.h - m.b, ticks: years.map((yr, i) => ({ pos: x(i), label: String(yr) })) });
    s.axes.push({ orient: 'y', at: m.l, ticks: [0, .25, .5, .75, 1].map(t => ({ pos: y(t * max), label: fmt(t * max, c.unit ?? '%').replace(' %', '') })) });
  } else if (c.type === 'map') {
    s.mapFill = {}; s.mapDim = c.unit;
    const vals = items.map(i => i.v); const min = Math.min(...vals), max = Math.max(...vals);
    items.forEach(it => { s.mapFill![it.key] = (it.v - min) / ((max - min) || 1); if (!(c.higherBetter ?? true)) s.mapFill![it.key] = 1 - s.mapFill![it.key]; const p = ctx.project?.(it.key); if (p && it.highlight) { const r = 7; s.marks.push({ key: it.key, x: p[0] - r, y: p[1] - r, w: 2 * r, h: 2 * r, rx: r, color: it.color ?? 0, label: `${it.label ?? ctx.names?.[it.key] ?? it.key} ${fmt(it.v, c.unit ?? '%')}`, labelX: p[0] + 10, labelY: p[1] + 4, anchor: 'start' }); } });
  }
  (c.annotations ?? []).forEach((a, i) => { const m = a.key ? s.marks.find(mk => mk.key === a.key) : null; const x = m ? m.x + m.w / 2 : (a.x ?? VB.w / 2); const y = m ? m.y : (a.y ?? 40); s.annotations.push({ key: `a${i}`, x, y, text: a.text, dx: a.dx ?? 40, dy: a.dy ?? -30 }); });
  // invariantes
  s.marks.forEach(mk => { if (!(mk.x >= -50 && mk.x <= VB.w + 50 && mk.y >= -50 && mk.y <= VB.h + 50)) throw new Error(`Scene mark out of viewBox: ${mk.key} (${mk.x},${mk.y}) in "${c.title}"`); });
  if (new Set(s.marks.map(m => m.key)).size !== s.marks.length) throw new Error(`Duplicate mark keys in "${c.title}"`);
  return s;
}
