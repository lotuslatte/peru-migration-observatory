import { useRef } from 'preact/hooks';
import { useWidth } from './lib/hooks';
import { fmtUnit } from './lib/format';
import ExportBar from './lib/ExportBar';
import type { Cell } from './LineChart';

export interface DotRow { label: string; c: Cell }

/** One row per group: a dot for the estimate and a bar for its 95% interval. The scale starts at zero unless a value is negative. */
export default function DotRows({ rows, unit, title, name, reference }: { rows: DotRow[]; unit: string; title: string; name?: string; reference?: { label: string; v: number } }) {
  const [box, W] = useWidth<HTMLDivElement>(720);
  const svg = useRef<SVGSVGElement>(null);
  const narrow = W < 560;
  const ok = rows.filter(r => r.c.v != null);
  const hi = Math.max(...ok.map(r => r.c.hi ?? r.c.v!), reference?.v ?? -Infinity);
  const lo = Math.min(0, ...ok.map(r => r.c.lo ?? r.c.v!));
  const labelW = narrow ? Math.min(150, W * 0.4) : 240, valueW = 92, rowH = narrow ? 42 : 44, top = reference ? 26 : 6;
  const H = rows.length * rowH + top + 6;
  const X = (v: number) => labelW + (v - lo) / (hi - lo || 1) * (W - labelW - valueW);
  const maxChars = Math.floor(labelW / 7.4);
  const clip = (s: string) => s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
  const exportRows = () => rows.map(r => ({ grupo: r.label, valor: r.c.v, ic95_inf: r.c.lo ?? null, ic95_sup: r.c.hi ?? null, n: r.c.n ?? null, sello: r.c.g ?? null }));
  const file = name ?? title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '_').toLowerCase();
  return (
    <div class="chart" ref={box}>
      <svg ref={svg} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${rows.map(r => `${r.label}: ${r.c.v == null ? 'sin dato' : fmtUnit(r.c.v, unit)}`).join('; ')}`}>
        {reference && <g><line x1={X(reference.v)} x2={X(reference.v)} y1={top - 4} y2={H} stroke="var(--rule)" stroke-dasharray="3 3" /><text x={X(reference.v)} y={12} text-anchor="middle">{reference.label} {fmtUnit(reference.v, unit)}</text></g>}
        {rows.map((r, i) => { const y = top + i * rowH + rowH / 2; return <g>
          <title>{r.label}</title>
          <text x="0" y={y + 5} style="fill:var(--ink-2);font-size:14px">{clip(r.label)}</text>
          {r.c.v == null ? <text x={labelW} y={y + 5}>Muestra insuficiente</text> : <>
            <line x1={X(lo)} x2={X(r.c.v)} y1={y} y2={y} stroke="var(--line)" stroke-width="2" />
            <line x1={X(r.c.lo ?? r.c.v)} x2={X(r.c.hi ?? r.c.v)} y1={y} y2={y} stroke="var(--accent)" stroke-width="6" opacity=".3" stroke-linecap="round" />
            <circle cx={X(r.c.v)} cy={y} r="6.5" fill="var(--accent)" />
            <text x={X(r.c.hi ?? r.c.v) + 12} y={y + 5} style="fill:var(--ink);font-size:14px">{fmtUnit(r.c.v, unit)}{r.c.g === 'B' ? ' (B)' : ''}</text></>}
        </g>; })}
      </svg>
      <ExportBar svgRef={svg} rows={exportRows} name={file} />
    </div>
  );
}
