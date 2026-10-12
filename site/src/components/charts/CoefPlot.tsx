import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { cat as catColors, onThemeChange } from './lib/theme';
import { fmtNum } from './lib/format';
import ExportBar from './lib/ExportBar';
type Term = { id: string; label: string; group: string; est: number; se: number; lo: number; hi: number; p: number };
interface Props { model: any; showAll?: boolean; title?: string }
export default function CoefPlot({ model, showAll: s0 = false, title }: Props) {
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0); const [showAll, setShowAll] = useState(s0);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  const unit = model.unit === '%' ? ' %' : ' pp';
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const terms: Term[] = showAll ? model.terms : model.terms.filter((t: Term) => t.id === model.key);
    const rows = [{ id: 'raw', label: 'Brecha cruda (sin controles)', est: model.raw_gap.v, lo: model.raw_gap.lo, hi: model.raw_gap.hi, key: true, group: 'brecha' }, ...terms.map(t => ({ ...t, key: t.id === model.key, label: t.id === model.key ? `Brecha ajustada · ${model.key_label}` : t.label }))];
    const rh = 24, W = 640, m = { t: 26, r: 24, b: 8, l: 230 }; const H = m.t + m.b + rows.length * rh; svg.attr('viewBox', `0 0 ${W} ${H}`);
    const ext = d3.extent(rows.flatMap(r => [r.lo, r.hi, 0])) as [number, number];
    const x = d3.scaleLinear().domain(ext).nice().range([m.l, W - m.r]);
    const cols = catColors();
    svg.append('g').attr('transform', `translate(0,${m.t - 6})`).call(d3.axisTop(x).ticks(6).tickSize(-(H - m.t - m.b + 6)) as any).call(g => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', 'var(--line)'); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 9); });
    svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', 'var(--ink)').attr('stroke-width', 1.2);
    let lastGroup = '';
    rows.forEach((r, i) => {
      const y = m.t + i * rh + rh / 2;
      if (showAll && r.group !== lastGroup && !r.key && r.id !== 'raw') { svg.append('line').attr('x1', m.l - 220).attr('x2', W - m.r).attr('y1', y - rh / 2).attr('y2', y - rh / 2).attr('stroke', 'var(--line)'); lastGroup = r.group; }
      svg.append('text').attr('x', m.l - 8).attr('y', y + 4).attr('text-anchor', 'end').attr('font-size', 10.5).attr('font-weight', r.key || r.id === 'raw' ? 600 : 400).attr('fill', r.key ? 'var(--informal)' : 'var(--ink)').text(r.label.length > 38 ? r.label.slice(0, 36) + '…' : r.label);
      const col = r.id === 'raw' ? 'var(--muted)' : r.key ? cols[0] : cols[1];
      svg.append('line').attr('x1', x(r.lo)).attr('x2', x(r.hi)).attr('y1', y).attr('y2', y).attr('stroke', col).attr('stroke-width', 2.2);
      svg.append('circle').attr('cx', x(r.est)).attr('cy', y).attr('r', r.key || r.id === 'raw' ? 6 : 4).attr('fill', col).append('title').text(`${r.label}: ${fmtNum(r.est, 2)}${unit} [${fmtNum(r.lo, 2)}; ${fmtNum(r.hi, 2)}]`);
      svg.append('text').attr('x', x(r.hi) + 6).attr('y', y + 3.5).attr('font-size', 9.5).attr('font-family', 'var(--font-mono)').attr('fill', 'var(--ink-2)').text(`${r.est > 0 ? '+' : ''}${fmtNum(r.est, 1)}`);
    });
  }, [model, showAll, tick]);
  const rows = () => model.terms.map((t: Term) => ({ termino: t.label, coef: t.est, se: t.se, ic_lo: t.lo, ic_hi: t.hi, p: t.p }));
  return (<div class="chart"><div class="toolbar"><span class="eyebrow">{title ?? model.label_es}</span><button class={`btn ${showAll ? 'active' : ''}`} onClick={() => setShowAll(s => !s)}>{showAll ? 'Sólo la brecha' : 'Todos los términos'}</button></div>
    <svg ref={ref} role="img" aria-label={model.label_es} />
    <p class="small muted">Puntos = coeficientes; barras = IC 95 % con errores de diseño (PSU = conglomerado). n = {model.n.toLocaleString('es-PE')}, R² = {model.r2}. Controles: {model.controls.join(', ')}.{model.logit_ame ? ` Efecto marginal logit: ${fmtNum(model.logit_ame.v, 1)}${unit}.` : ''}</p>
    <ExportBar svgRef={ref} rows={rows} name={`modelo_${model.key}`} /></div>);
}
