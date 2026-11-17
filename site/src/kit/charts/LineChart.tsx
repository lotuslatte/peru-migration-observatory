import { useEffect, useRef, useState } from 'preact/hooks';
import { ticks as d3ticks } from 'd3';
import { useWidth } from './lib/hooks';
import { fmtUnit, fmtTick, unitTitle } from './lib/format';
import { CAT_VARS } from './lib/theme';
import { showTip, hideTip } from './lib/tip';
import ExportBar from './lib/ExportBar';

export type Cell = { v: number | null; g?: string; lo?: number; hi?: number; n?: number; se?: number };
export interface Series { label: string; cells: Cell[]; color?: string }
interface Props {
  years: number[]; series: Series[]; unit: string;
  /** Accessible name and export file name. */
  title: string; name?: string;
  /** Year where the method changed: the line is cut there and the change is marked. */
  breakYear?: number; breakLabel?: string;
  /** Draw the 95% confidence band (single series, or every series when few). */
  band?: boolean; yTitle?: string; yZero?: boolean; exportBar?: boolean;
}

// Cut a series into runs: at missing values and at the method break.
function runs(cells: Cell[], years: number[], breakYear?: number) {
  const out: [number, Cell][][] = []; let cur: [number, Cell][] = [];
  cells.forEach((c, i) => {
    if (!c || c.v == null) { if (cur.length) out.push(cur); cur = []; return; }
    if (breakYear && years[i] === breakYear && cur.length) { out.push(cur); cur = []; }
    cur.push([years[i], c]);
  });
  if (cur.length) out.push(cur);
  return out;
}

/** Annual series with optional confidence band. Drawn at the container's real width, so text keeps its size on phones. */
export default function LineChart({ years, series, unit, title, name, breakYear, breakLabel = 'Cambio de método', band = false, yTitle, yZero = false, exportBar = true }: Props) {
  const [box, W] = useWidth<HTMLDivElement>(720);
  const svg = useRef<SVGSVGElement>(null);
  const [at, setAt] = useState<number | null>(null);
  const many = series.length > 1;
  const sideLabels = many && W >= 640;
  const H = Math.round(Math.min(420, Math.max(260, W * 0.46)));
  const m = { t: 34, r: sideLabels ? 168 : 18, b: 30, l: 56 };
  const color = (i: number) => series[i].color ?? CAT_VARS[i % CAT_VARS.length];

  const values = series.flatMap(s => s.cells.flatMap(c => !c || c.v == null ? [] : [band && c.lo != null ? c.lo : c.v, band && c.hi != null ? c.hi : c.v]));
  const empty = !values.length;
  let lo = Math.min(...values), hi = Math.max(...values);
  const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1;
  lo = yZero ? Math.min(0, lo) : lo - pad; hi += pad;
  if (!yZero && lo < 0 && Math.min(...values) >= 0) lo = 0;
  const tk = empty ? [] : d3ticks(lo, hi, H < 300 ? 4 : 5);
  const y0 = empty ? 0 : Math.min(lo, tk[0]), y1 = empty ? 1 : Math.max(hi, tk[tk.length - 1]);
  const first = years[0], last = years[years.length - 1];
  const X = (yr: number) => years.length > 1 ? m.l + (yr - first) / (last - first) * (W - m.l - m.r) : m.l;
  const Y = (v: number) => H - m.b - (v - y0) / (y1 - y0 || 1) * (H - m.t - m.b);
  const step = Math.ceil(years.length / Math.max(2, Math.floor((W - m.l - m.r) / 52)));

  // Labels at the right end of each line, pushed apart so they never overlap.
  const ends = series.map((s, i) => { const k = s.cells.map(c => c && c.v != null).lastIndexOf(true); return k < 0 ? null : { i, x: X(years[k]), y: Y(s.cells[k].v!), label: s.label }; }).filter(Boolean) as { i: number; x: number; y: number; label: string }[];
  const placed = [...ends].sort((a, b) => a.y - b.y); let prev = -99;
  const labelY = new Map<number, number>(); placed.forEach(e => { const ly = Math.max(e.y + 4, prev + 17); prev = ly; labelY.set(e.i, ly); });

  const tipFor = (k: number) => [String(years[k]), ...series.map(s => { const c = s.cells[k]; const v = !c || c.v == null ? 'sin dato' : fmtUnit(c.v, unit); const ci = c && c.lo != null && c.hi != null && !many ? ` (IC 95%: ${fmtUnit(c.lo, unit)} a ${fmtUnit(c.hi, unit)})` : ''; return (many ? s.label + ': ' : '') + v + ci; })];
  const nearest = (clientX: number) => { const r = svg.current!.getBoundingClientRect(); const px = clientX - r.left; let best = 0, d = Infinity; years.forEach((yr, k) => { const dd = Math.abs(X(yr) - px); if (dd < d) { d = dd; best = k; } }); return best; };
  useEffect(() => { if (at == null || !svg.current) return; const r = svg.current.getBoundingClientRect(); showTip(r.left + X(years[at]), r.top + m.t + 10, tipFor(at)); }, [at, W]);

  const rows = () => series.flatMap(s => years.map((yr, k) => ({ serie: s.label, anio: yr, valor: s.cells[k]?.v ?? null, ic95_inf: s.cells[k]?.lo ?? null, ic95_sup: s.cells[k]?.hi ?? null, n: s.cells[k]?.n ?? null, sello: s.cells[k]?.g ?? null })));
  const file = name ?? title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '_').toLowerCase();

  return (
    <div class="chart" ref={box}>
      {many && !sideLabels && <div class="r-legend">{series.map((s, i) => <span><i style={`background:${color(i)}`} />{s.label}</span>)}</div>}
      {empty ? <p class="r-src">Sin datos publicables para esta selección.</p> :
        <svg ref={svg} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. Use las flechas izquierda y derecha para recorrer los años.`} tabIndex={0}
          onPointerMove={e => setAt(nearest(e.clientX))} onPointerLeave={() => { setAt(null); hideTip(); }}
          onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); setAt(a => Math.min(years.length - 1, (a ?? -1) + 1)); } if (e.key === 'ArrowLeft') { e.preventDefault(); setAt(a => Math.max(0, (a ?? years.length) - 1)); } if (e.key === 'Escape') { setAt(null); hideTip(); } }}
          onBlur={() => { setAt(null); hideTip(); }}>
          <text x={m.l} y={14} style="fill:var(--ink-2)">{yTitle ?? unitTitle(unit)}</text>
          {tk.map(t => <g><line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} stroke="var(--line)" /><text x={m.l - 8} y={Y(t) + 4} text-anchor="end">{fmtTick(t, unit)}</text></g>)}
          {years.map((yr, k) => (years.length - 1 - k) % step === 0 && <text x={X(yr)} y={H - 8} text-anchor="middle">{yr}</text>)}
          {breakYear && breakYear > first && breakYear <= last && <g>
            <line x1={X(breakYear - 0.5)} x2={X(breakYear - 0.5)} y1={m.t - 8} y2={H - m.b} stroke="var(--warn)" stroke-dasharray="4 4" />
            <text x={X(breakYear - 0.5) - 6} y={m.t + 2} text-anchor="end" style="fill:var(--warn)">{breakLabel}</text></g>}
          {series.map((s, i) => runs(s.cells, years, breakYear).map(seg => <g>
            {band && seg.length > 1 && seg.every(([, c]) => c.lo != null && c.hi != null) && <polygon fill={color(i)} opacity=".15" points={[...seg.map(([yr, c]) => `${X(yr)},${Y(c.hi!)}`), ...[...seg].reverse().map(([yr, c]) => `${X(yr)},${Y(c.lo!)}`)].join(' ')} />}
            {seg.length > 1
              ? <polyline fill="none" stroke={color(i)} stroke-width={many ? 2 : 2.4} stroke-linejoin="round" stroke-linecap="round" points={seg.map(([yr, c]) => `${X(yr)},${Y(c.v!)}`).join(' ')} />
              : <circle cx={X(seg[0][0])} cy={Y(seg[0][1].v!)} r="3.5" fill={color(i)} />}
          </g>))}
          {ends.map(e => <g>
            <circle cx={e.x} cy={e.y} r="4.5" fill={color(e.i)} stroke="var(--bg)" stroke-width="2" />
            {sideLabels && <text x={W - m.r + 12} y={labelY.get(e.i)} style="fill:var(--ink-2)">{e.label.length > 21 ? e.label.slice(0, 20) + '…' : e.label}</text>}
          </g>)}
          {at != null && <line x1={X(years[at])} x2={X(years[at])} y1={m.t} y2={H - m.b} stroke="var(--ink)" stroke-width="1" />}
          {at != null && series.map((s, i) => s.cells[at]?.v != null && <circle cx={X(years[at])} cy={Y(s.cells[at].v!)} r="4.5" fill={color(i)} stroke="var(--bg)" stroke-width="2" />)}
        </svg>}
      {exportBar && !empty && <ExportBar svgRef={svg} rows={rows} name={file} />}
    </div>
  );
}
