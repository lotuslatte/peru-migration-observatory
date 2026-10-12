import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { cat as catColors, onThemeChange } from './lib/theme';
import { fmtUnit, decimalsFor } from './lib/format';
import ExportBar from './lib/ExportBar';
type Cell = { v: number | null; g: string; lo?: number; hi?: number; n?: number };
interface Series { label: string; cells: Cell[] }
interface Props { years: number[]; series: Series[]; unit: string; title: string; height?: number; notes?: Record<string, string>; yZero?: boolean; smooth?: Cell[][]; canSmooth?: boolean }
export default function TrendLine({ years, series, unit, title, height = 300, notes = {}, yZero = false, smooth, canSmooth }: Props) {
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0); const [sm, setSm] = useState(false);
  const smoothable = !!(smooth && smooth.length === series.length);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const W = 720, H = height, m = { t: 24, r: 120, b: 34, l: 54 };
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scalePoint<number>().domain(years).range([m.l, W - m.r]);
    const all = series.flatMap(s => s.cells.flatMap(c => [c.v, c.lo, c.hi]).filter((v): v is number => v != null));
    const y = d3.scaleLinear().domain([yZero ? 0 : (d3.min(all) ?? 0) * 0.95, (d3.max(all) ?? 1) * 1.04]).nice().range([H - m.b, m.t]);
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(d => String(d)) as any).call(g => g.select('.domain').attr('stroke', 'var(--line)')).selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 10);
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(W - m.l - m.r)) as any).call(g => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', 'var(--line)'); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 10); });
    const cols = catColors();
    Object.keys(notes).forEach(yr => { const xx = x(+yr); if (xx != null) svg.append('line').attr('x1', xx).attr('x2', xx).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--muted)').attr('stroke-dasharray', '3,3').attr('opacity', .6).append('title').text(notes[yr]); });
    series.forEach((s, i) => {
      const pts = years.map((yr, k) => ({ yr, c: s.cells[k] })).filter(p => p.c && p.c.v != null);
      const area = d3.area<any>().x(p => x(p.yr)!).y0(p => y(p.c.lo ?? p.c.v)).y1(p => y(p.c.hi ?? p.c.v)).defined(p => p.c.lo != null);
      svg.append('path').datum(pts).attr('d', area).attr('fill', cols[i % cols.length]).attr('opacity', .12);
      const line = d3.line<any>().x(p => x(p.yr)!).y(p => y(p.c.v));
      svg.append('path').datum(pts).attr('d', line).attr('fill', 'none').attr('stroke', cols[i % cols.length]).attr('stroke-width', sm && smoothable ? 1 : 2.2).attr('opacity', sm && smoothable ? .45 : 1);
      if (sm && smoothable) { const sp = years.map((yr, k) => ({ yr, c: smooth![i][k] })).filter(p => p.c && p.c.v != null);
        svg.append('path').datum(sp).attr('d', d3.area<any>().x(p => x(p.yr)!).y0(p => y(p.c.lo ?? p.c.v)).y1(p => y(p.c.hi ?? p.c.v))).attr('fill', cols[i % cols.length]).attr('opacity', .15);
        svg.append('path').datum(sp).attr('d', line).attr('fill', 'none').attr('stroke', cols[i % cols.length]).attr('stroke-width', 3); }
      svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', p => x(p.yr)!).attr('cy', p => y(p.c.v)).attr('r', 3).attr('fill', cols[i % cols.length]).append('title').text(p => `${s.label} ${p.yr}: ${fmtUnit(p.c.v, unit, decimalsFor(unit))} [${p.c.g}]`);
      const last = pts[pts.length - 1];
      if (last) svg.append('text').attr('x', x(last.yr)! + 8).attr('y', y(last.c.v) + 4).attr('font-size', 11).attr('fill', cols[i % cols.length]).text(`${s.label} ${fmtUnit(last.c.v, unit, decimalsFor(unit))}`);
    });
  }, [years, series, tick, sm]);
  const rows = () => series.flatMap(s => years.map((yr, k) => ({ serie: s.label, año: yr, valor: s.cells[k]?.v, ic_lo: s.cells[k]?.lo, ic_hi: s.cells[k]?.hi, n: s.cells[k]?.n, grado: s.cells[k]?.g })));
  return (<div class="chart"><div class="toolbar" style="justify-content:space-between"><span class="eyebrow">{title}</span>{smoothable && <button class={`btn ${sm ? 'active' : ''}`} onClick={() => setSm(v => !v)} title="Media móvil de 3 años con IC combinado">{sm ? 'Serie anual' : 'Suavizar (3 años)'}</button>}</div><svg ref={ref} role="img" aria-label={title} />
    <details class="data-table"><summary>Ver tabla</summary><div class="scroll-x"><table class="data"><thead><tr><th>Serie</th>{years.map(y => <th>{y}</th>)}</tr></thead><tbody>{series.map(s => <tr><td>{s.label}</td>{s.cells.map(c => <td>{c?.v == null ? '—' : fmtUnit(c.v, unit, decimalsFor(unit))}</td>)}</tr>)}</tbody></table></div></details>
    <ExportBar svgRef={ref} rows={rows} name={title.replace(/\W+/g, '_').toLowerCase()} /></div>);
}
