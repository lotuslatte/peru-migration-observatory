import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { cat as catColors, onThemeChange } from './lib/theme';
import { fmtUnit } from './lib/format';
import ExportBar from './lib/ExportBar';
type Item = { k: number | string; label: string; v: number | null; g: string; lo?: number; hi?: number; n?: number };
interface Props { items: Item[]; title: string; unit?: string; compare?: Item[]; compareLabel?: string; baseLabel?: string; color?: number; height?: number }
export default function BarDist({ items, title, unit = '%', compare, compareLabel = 'Nacional', baseLabel = 'Región', color = 0, height }: Props) {
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const rh = compare ? 34 : 26; const W = 560, m = { t: 8, r: 70, b: 8, l: 190 }; const H = height ?? m.t + m.b + items.length * rh;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const max = d3.max([...items, ...(compare ?? [])], d => d.hi ?? d.v ?? 0) ?? 1;
    const x = d3.scaleLinear().domain([0, max]).range([m.l, W - m.r]);
    const y = d3.scaleBand<string>().domain(items.map(d => String(d.k))).range([m.t, H - m.b]).padding(.25);
    const cols = catColors();
    const g = svg.append('g');
    items.forEach(d => {
      const yy = y(String(d.k))!; const bh = compare ? y.bandwidth() / 2 - 1 : y.bandwidth();
      g.append('text').attr('x', m.l - 8).attr('y', yy + y.bandwidth() / 2 + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--ink)').text(d.label.length > 30 ? d.label.slice(0, 28) + '…' : d.label);
      g.append('rect').attr('x', m.l).attr('y', yy).attr('height', bh).attr('width', d.v == null ? 0 : x(d.v) - m.l).attr('fill', cols[color]).attr('rx', 3).append('title').text(`${baseLabel}: ${fmtUnit(d.v, unit)} [${d.g}]`);
      if (d.lo != null) g.append('line').attr('x1', x(d.lo)).attr('x2', x(d.hi!)).attr('y1', yy + bh / 2).attr('y2', yy + bh / 2).attr('stroke', 'var(--ink)').attr('opacity', .6);
      g.append('text').attr('x', x(d.v ?? 0) + 5).attr('y', yy + bh / 2 + 4).attr('font-size', 10).attr('font-family', 'var(--font-mono)').attr('fill', 'var(--ink-2)').text(d.v == null ? '—' : fmtUnit(d.v, unit));
      if (compare) { const c = compare.find(z => String(z.k) === String(d.k));
        if (c) { g.append('rect').attr('x', m.l).attr('y', yy + bh + 2).attr('height', bh).attr('width', c.v == null ? 0 : x(c.v) - m.l).attr('fill', 'var(--muted)').attr('opacity', .45).attr('rx', 3).append('title').text(`${compareLabel}: ${fmtUnit(c.v, unit)}`);
          g.append('text').attr('x', x(c.v ?? 0) + 5).attr('y', yy + bh + bh / 2 + 6).attr('font-size', 9).attr('font-family', 'var(--font-mono)').attr('fill', 'var(--muted)').text(c.v == null ? '—' : fmtUnit(c.v, unit)); } }
    });
  }, [items, compare, tick]);
  const rows = () => items.map(d => ({ categoria: d.label, valor: d.v, ic_lo: d.lo, ic_hi: d.hi, n: d.n, grado: d.g, ...(compare ? { [compareLabel]: compare.find(z => String(z.k) === String(d.k))?.v } : {}) }));
  return (<div class="chart"><div class="eyebrow">{title}{compare && <span class="muted"> · barra gris = {compareLabel}</span>}</div><svg ref={ref} role="img" aria-label={title} />
    <ExportBar svgRef={ref} rows={rows} name={title.replace(/\W+/g, '_').toLowerCase()} /></div>);
}
