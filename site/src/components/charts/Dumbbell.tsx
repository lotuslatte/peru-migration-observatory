import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { cat as catColors, onThemeChange } from './lib/theme';
import { fmtUnit, decimalsFor } from './lib/format';
import ExportBar from './lib/ExportBar';
type Cell = { v: number | null; g: string; lo?: number; hi?: number; n?: number; label: string };
interface Row { label: string; a: Cell; b: Cell }
interface Props { rows: Row[]; title: string; unit: string; aLabel: string; bLabel: string }
export default function Dumbbell({ rows, title, unit, aLabel, bLabel }: Props) {
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const rh = 30, W = 560, m = { t: 26, r: 30, b: 8, l: 170 }; const H = m.t + m.b + rows.length * rh;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const vals = rows.flatMap(r => [r.a.v, r.b.v, r.a.lo, r.a.hi, r.b.lo, r.b.hi]).filter((v): v is number => v != null);
    const x = d3.scaleLinear().domain([Math.min(0, d3.min(vals) ?? 0), (d3.max(vals) ?? 1) * 1.05]).nice().range([m.l, W - m.r]);
    const cols = catColors();
    svg.append('g').attr('transform', `translate(0,${m.t - 6})`).call(d3.axisTop(x).ticks(5).tickSize(-(H - m.t - m.b + 6)) as any).call(g => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', 'var(--line)'); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 9); });
    const lg = svg.append('g').attr('transform', `translate(${W - m.r - 150},${m.t - 20})`);
    [[aLabel, cols[1]], [bLabel, cols[0]]].forEach(([l, c], i) => { lg.append('circle').attr('cx', i * 80).attr('cy', 0).attr('r', 5).attr('fill', c); lg.append('text').attr('x', i * 80 + 9).attr('y', 3.5).attr('font-size', 10).attr('fill', 'var(--muted)').text(l); });
    rows.forEach((r, i) => {
      const yy = m.t + i * rh + rh / 2;
      svg.append('text').attr('x', m.l - 10).attr('y', yy + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--ink)').text(r.label);
      if (r.a.v != null && r.b.v != null) svg.append('line').attr('x1', x(r.a.v)).attr('x2', x(r.b.v)).attr('y1', yy).attr('y2', yy).attr('stroke', 'var(--muted)').attr('stroke-width', 2);
      [[r.a, cols[1]], [r.b, cols[0]]].forEach(([c, col]: any) => {
        if (c.v == null) return;
        if (c.lo != null) svg.append('line').attr('x1', x(c.lo)).attr('x2', x(c.hi)).attr('y1', yy).attr('y2', yy).attr('stroke', col).attr('opacity', .35).attr('stroke-width', 6);
        svg.append('circle').attr('cx', x(c.v)).attr('cy', yy).attr('r', 6).attr('fill', col).append('title').text(`${c.label}: ${fmtUnit(c.v, unit, decimalsFor(unit))} [${c.g}]`);
      });
      const gap = r.a.v != null && r.b.v != null ? r.a.v - r.b.v : null;
      svg.append('text').attr('x', W - m.r + 4).attr('y', yy + 4).attr('font-size', 9).attr('font-family', 'var(--font-mono)').attr('fill', 'var(--muted)').attr('text-anchor', 'start').text(gap == null ? '' : (gap > 0 ? '+' : '') + fmtUnit(gap, unit === 'S/' ? 'S/' : 'pp', decimalsFor(unit)));
    });
  }, [rows, tick]);
  const out = () => rows.map(r => ({ indicador: r.label, [aLabel]: r.a.v, [`${aLabel}_grado`]: r.a.g, [bLabel]: r.b.v, [`${bLabel}_grado`]: r.b.g }));
  return (<div class="chart"><div class="eyebrow">{title}</div><svg ref={ref} role="img" aria-label={title} /><ExportBar svgRef={ref} rows={out} name={title.replace(/\W+/g, '_').toLowerCase()} /></div>);
}
