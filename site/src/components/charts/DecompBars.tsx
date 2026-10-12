import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { cat as catColors, onThemeChange } from './lib/theme';
import { fmtNum } from './lib/format';
import ExportBar from './lib/ExportBar';
// mode 'oaxaca': cascada gap → explicado por variable → no explicado.  mode 'shift': composición vs tasas por grupo.
export default function DecompBars({ data, mode, scale = 100, unit = 'pp', title }: { data: any; mode: 'oaxaca' | 'shift'; scale?: number; unit?: string; title?: string }) {
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove(); const cols = catColors();
    if (mode === 'oaxaca') {
      const items = [{ label: `Brecha total (${data.a.label} − ${data.b.label})`, v: data.gap.v * scale, se: data.gap.se * scale, kind: 'total' }, ...data.by_var.map((b: any) => ({ label: `Explicado: ${b.label}`, v: b.explained.v * scale, se: b.explained.se * scale, kind: 'expl' })), { label: 'No explicado (retornos)', v: data.unexplained.v * scale, se: data.unexplained.se * scale, kind: 'unexpl' }];
      const rh = 26, W = 640, m = { t: 24, r: 30, b: 8, l: 230 }; const H = m.t + m.b + items.length * rh; svg.attr('viewBox', `0 0 ${W} ${H}`);
      const ext = d3.extent(items.flatMap(i => [i.v - 1.96 * i.se, i.v + 1.96 * i.se, 0])) as [number, number];
      const x = d3.scaleLinear().domain(ext).nice().range([m.l, W - m.r]);
      svg.append('g').attr('transform', `translate(0,${m.t - 6})`).call(d3.axisTop(x).ticks(6).tickSize(-(H - m.t)) as any).call(g => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', 'var(--line)'); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 9); });
      svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', 'var(--ink)');
      items.forEach((it, i) => { const y = m.t + i * rh; const col = it.kind === 'total' ? 'var(--ink)' : it.kind === 'unexpl' ? cols[0] : (it.v * Math.sign(data.gap.v) > 0 ? cols[0] : cols[1]);
        svg.append('text').attr('x', m.l - 8).attr('y', y + rh / 2 + 4).attr('text-anchor', 'end').attr('font-size', 10.5).attr('font-weight', it.kind === 'total' ? 600 : 400).attr('fill', 'var(--ink)').text(it.label);
        svg.append('rect').attr('x', Math.min(x(0), x(it.v))).attr('y', y + 5).attr('height', rh - 10).attr('width', Math.abs(x(it.v) - x(0))).attr('fill', col).attr('opacity', it.kind === 'total' ? .9 : .75).attr('rx', 3).append('title').text(`${it.label}: ${fmtNum(it.v, 2)} ${unit} ± ${fmtNum(1.96 * it.se, 2)}`);
        svg.append('line').attr('x1', x(it.v - 1.96 * it.se)).attr('x2', x(it.v + 1.96 * it.se)).attr('y1', y + rh / 2).attr('y2', y + rh / 2).attr('stroke', 'var(--ink)').attr('opacity', .6);
        svg.append('text').attr('x', x(Math.max(it.v, 0)) + 5).attr('y', y + rh / 2 + 3.5).attr('font-size', 9.5).attr('font-family', 'var(--font-mono)').attr('fill', 'var(--ink-2)').text(`${it.v > 0 ? '+' : ''}${fmtNum(it.v, 1)}`); });
    } else {
      const items = [{ label: `Cambio total ${data.years[0]}→${data.years[1]}`, v: data.total.v * scale, se: 0, kind: 'total' }, { label: 'Composición (quién trabaja dónde)', v: data.composition.v * scale, se: data.composition.se * scale, kind: 'comp' }, { label: 'Tasas dentro de cada grupo', v: data.rate.v * scale, se: data.rate.se * scale, kind: 'rate' }, ...data.by_group.map((b: any) => ({ label: `${b.label}: composición`, v: b.comp * scale, se: 0, kind: 'g' })), ...data.by_group.map((b: any) => ({ label: `${b.label}: tasa`, v: b.within * scale, se: 0, kind: 'g2' }))];
      const rh = 22, W = 640, m = { t: 24, r: 30, b: 8, l: 230 }; const H = m.t + m.b + items.length * rh; svg.attr('viewBox', `0 0 ${W} ${H}`);
      const ext = d3.extent(items.flatMap(i => [i.v - 1.96 * i.se, i.v + 1.96 * i.se, 0])) as [number, number];
      const x = d3.scaleLinear().domain(ext).nice().range([m.l, W - m.r]);
      svg.append('g').attr('transform', `translate(0,${m.t - 6})`).call(d3.axisTop(x).ticks(6).tickSize(-(H - m.t)) as any).call(g => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', 'var(--line)'); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 9); });
      svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', 'var(--ink)');
      items.forEach((it, i) => { const y = m.t + i * rh; const col = it.kind === 'total' ? 'var(--ink)' : it.kind === 'comp' || it.kind === 'g' ? cols[1] : cols[0];
        svg.append('text').attr('x', m.l - 8).attr('y', y + rh / 2 + 4).attr('text-anchor', 'end').attr('font-size', it.kind.startsWith('g') ? 9.5 : 10.5).attr('font-weight', it.kind === 'total' ? 600 : 400).attr('fill', it.kind.startsWith('g') ? 'var(--muted)' : 'var(--ink)').text(it.label);
        svg.append('rect').attr('x', Math.min(x(0), x(it.v))).attr('y', y + 4).attr('height', rh - 8).attr('width', Math.abs(x(it.v) - x(0))).attr('fill', col).attr('opacity', it.kind.startsWith('g') ? .45 : .85).attr('rx', 3).append('title').text(`${it.label}: ${fmtNum(it.v, 2)} ${unit}`);
        if (it.se) svg.append('line').attr('x1', x(it.v - 1.96 * it.se)).attr('x2', x(it.v + 1.96 * it.se)).attr('y1', y + rh / 2).attr('y2', y + rh / 2).attr('stroke', 'var(--ink)').attr('opacity', .6);
        svg.append('text').attr('x', x(Math.max(it.v, 0)) + 5).attr('y', y + rh / 2 + 3.5).attr('font-size', 9).attr('font-family', 'var(--font-mono)').attr('fill', 'var(--ink-2)').text(`${it.v > 0 ? '+' : ''}${fmtNum(it.v, 2)}`); });
    }
  }, [data, mode, tick]);
  const rows = () => mode === 'oaxaca' ? data.by_var.map((b: any) => ({ variable: b.label, explicado: b.explained.v * scale, explicado_se: b.explained.se * scale, no_explicado: b.unexplained.v * scale })) : data.by_group.map((b: any) => ({ grupo: b.label, share_t0: b.share_t0, share_t1: b.share_t1, rate_t0: b.rate_t0, rate_t1: b.rate_t1, composicion: b.comp * scale, tasa: b.within * scale }));
  return (<div class="chart"><div class="eyebrow">{title ?? data.label_es}</div><svg ref={ref} role="img" aria-label={title ?? data.label_es} />
    <p class="small muted">{mode === 'oaxaca' ? `Oaxaca–Blinder two-fold (coeficientes de referencia: muestra agrupada). Barras = IC 95 % bootstrap Rao–Wu (R = ${data.R}). Jade: componente que reduce la brecha; carmín: la amplía o no se explica.` : `Shift-share con pesos de punto medio; IC bootstrap (R = ${data.R}). Jade = cambio de composición; carmín = cambio de tasas dentro de los grupos.`}</p>
    <ExportBar svgRef={ref} rows={rows} name={mode === 'oaxaca' ? 'oaxaca' : 'shift_share'} /></div>);
}
