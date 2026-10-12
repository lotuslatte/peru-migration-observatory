import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { cat as catColors, onThemeChange } from './lib/theme';
import { fmtUnit, decimalsFor } from './lib/format';
import ExportBar from './lib/ExportBar';
type Region = { id: string; name: string; parent: string | null; region_nat: string; values: Record<string, any> };
type Dim = { id: string; label_es: string; unit: string };
export default function BivariateScatter({ regions, dims, x0 = 'informality', y0 = 'median_inc_real' }: { regions: Region[]; dims: Dim[]; x0?: string; y0?: string }) {
  const [xd, setX] = useState(x0); const [yd, setY] = useState(y0); const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  const dx = dims.find(d => d.id === xd)!, dy = dims.find(d => d.id === yd)!;
  const pts = regions.filter(r => !r.parent && r.values[xd]?.v != null && r.values[yd]?.v != null);
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const W = 640, H = 420, m = { t: 20, r: 20, b: 44, l: 60 }; svg.attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleLinear().domain(d3.extent(pts, p => p.values[xd].v) as [number, number]).nice().range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain(d3.extent(pts, p => p.values[yd].v) as [number, number]).nice().range([H - m.b, m.t]);
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6) as any).call(g => { g.select('.domain').attr('stroke', 'var(--line)'); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 10); });
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(W - m.l - m.r)) as any).call(g => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', 'var(--line)'); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 10); });
    svg.append('text').attr('x', W / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--muted)').text(dx.label_es);
    svg.append('text').attr('transform', `translate(14,${H / 2}) rotate(-90)`).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--muted)').text(dy.label_es);
    const mx = d3.median(pts, p => p.values[xd].v)!, my = d3.median(pts, p => p.values[yd].v)!;
    svg.append('line').attr('x1', x(mx)).attr('x2', x(mx)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--muted)').attr('stroke-dasharray', '4,3');
    svg.append('line').attr('y1', y(my)).attr('y2', y(my)).attr('x1', m.l).attr('x2', W - m.r).attr('stroke', 'var(--muted)').attr('stroke-dasharray', '4,3');
    const cols = catColors(); const nat: Record<string, string> = { Costa: cols[1], Sierra: cols[2], Selva: cols[3] };
    const g = svg.append('g');
    pts.forEach(p => {
      const cx = x(p.values[xd].v), cy = y(p.values[yd].v);
      if (p.values[xd].lo != null) g.append('line').attr('x1', x(p.values[xd].lo)).attr('x2', x(p.values[xd].hi)).attr('y1', cy).attr('y2', cy).attr('stroke', nat[p.region_nat]).attr('opacity', .35);
      if (p.values[yd].lo != null) g.append('line').attr('y1', y(p.values[yd].lo)).attr('y2', y(p.values[yd].hi)).attr('x1', cx).attr('x2', cx).attr('stroke', nat[p.region_nat]).attr('opacity', .35);
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', nat[p.region_nat]).style('cursor', 'pointer').on('click', () => location.href = `/atlas/${p.id}/`).append('title').text(`${p.name}: ${fmtUnit(p.values[xd].v, dx.unit, decimalsFor(dx.unit))} · ${fmtUnit(p.values[yd].v, dy.unit, decimalsFor(dy.unit))}`);
      g.append('text').attr('x', cx + 7).attr('y', cy + 3).attr('font-size', 9).attr('fill', 'var(--ink-2)').text(p.name);
    });
    const lg = svg.append('g').attr('transform', `translate(${W - m.r - 200},${m.t})`);
    Object.entries(nat).forEach(([k, c], i) => { lg.append('circle').attr('cx', i * 66).attr('cy', 0).attr('r', 5).attr('fill', c); lg.append('text').attr('x', i * 66 + 9).attr('y', 3.5).attr('font-size', 10).attr('fill', 'var(--muted)').text(k); });
  }, [xd, yd, tick]);
  const sel = (v: string, set: (s: string) => void) => <select value={v} onChange={e => set((e.target as HTMLSelectElement).value)}>{dims.map(d => <option value={d.id}>{d.label_es}</option>)}</select>;
  const rows = () => pts.map(p => ({ departamento: p.name, region_natural: p.region_nat, [dx.label_es]: p.values[xd].v, [dy.label_es]: p.values[yd].v }));
  return (<div class="chart"><div class="toolbar"><span class="eyebrow">Dispersión</span><label class="small muted">X {sel(xd, setX)}</label><label class="small muted">Y {sel(yd, setY)}</label></div>
    <svg ref={ref} role="img" aria-label="Diagrama de dispersión entre dos dimensiones" /><p class="small muted">Líneas punteadas = medianas departamentales (cuadrantes). Barras = IC 95 %.</p><ExportBar svgRef={ref} rows={rows} name={`dispersion_${xd}_${yd}`} /></div>);
}
