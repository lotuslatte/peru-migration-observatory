import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { onThemeChange } from './lib/theme';
import ExportBar from './lib/ExportBar';
interface Props { chord: any; net?: Record<string, number | null>; focus?: string }
export default function FlowChord({ chord, net = {}, focus }: Props) {
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0); const [sel, setSel] = useState<string | null>(focus ?? null); const [minFlow, setMinFlow] = useState(1500);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  const ids: string[] = chord.ids; const names: Record<string, string> = chord.names;
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const W = 720, H = 720, R = 300, r0 = R - 22; svg.attr('viewBox', `0 0 ${W} ${H}`);
    const M: number[][] = chord.matrix.map((row: number[]) => row.map(v => v >= minFlow ? v : 0));
    const layout = d3.chordDirected().padAngle(0.02).sortSubgroups(d3.descending)(M);
    const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);
    const arc = d3.arc<any>().innerRadius(r0).outerRadius(R);
    const ribbon = d3.ribbonArrow<any, any>().radius(r0 - 2).padAngle(0.005).headRadius(10);
    const color = (i: number) => { const v = net[ids[i]]; return v == null ? 'var(--muted)' : v > 0 ? 'var(--formal)' : 'var(--informal)'; };
    const isDim = (d: any) => sel != null && ids[d.source.index] !== sel && ids[d.target.index] !== sel;
    g.append('g').selectAll('path').data(layout).join('path').attr('d', ribbon as any).attr('fill', d => 'var(--informal)').attr('stroke', 'none')
      .attr('opacity', d => isDim(d) ? .06 : (chord.g[d.source.index][d.target.index] === 'A' ? .55 : .3))
      .append('title').text(d => `${names[ids[d.source.index]]} → ${names[ids[d.target.index]]}: ${M[d.source.index][d.target.index].toLocaleString('es-PE')} personas/año (${chord.g[d.source.index][d.target.index]})`);
    const grp = g.append('g').selectAll('g').data(layout.groups).join('g');
    grp.append('path').attr('d', arc as any).attr('fill', d => color(d.index)).attr('opacity', d => sel && ids[d.index] !== sel ? .5 : 1).style('cursor', 'pointer').on('click', (_e, d) => setSel(s => s === ids[d.index] ? null : ids[d.index]))
      .append('title').text(d => `${names[ids[d.index]]}: saldo ${net[ids[d.index]] ?? '—'} ‰`);
    grp.append('text').each(d => { (d as any).angle = (d.startAngle + d.endAngle) / 2; }).attr('dy', '.35em').attr('font-size', 10.5).attr('fill', 'var(--ink)')
      .attr('transform', (d: any) => `rotate(${(d.angle * 180 / Math.PI - 90)}) translate(${R + 6}) ${d.angle > Math.PI ? 'rotate(180)' : ''}`)
      .attr('text-anchor', (d: any) => d.angle > Math.PI ? 'end' : null).text(d => names[ids[d.index]]);
  }, [minFlow, sel, tick]);
  const rows = () => ids.flatMap((o, i) => ids.map((d, j) => ({ origen: names[o], destino: names[d], personas_anio: chord.matrix[i][j], n: chord.n[i][j], sello: chord.g[i][j] })).filter(r => r.personas_anio > 0));
  return (<div class="chart"><div class="toolbar"><span class="eyebrow">Diagrama de cuerdas · flujos ≥ {minFlow.toLocaleString('es-PE')} personas/año</span>
    <input type="range" min="500" max="8000" step="250" value={minFlow} onInput={e => setMinFlow(+(e.target as HTMLInputElement).value)} aria-label="Flujo mínimo" />{sel && <button class="btn" onClick={() => setSel(null)}>Quitar foco: {names[sel]}</button>}</div>
    <svg ref={ref} role="img" aria-label="Diagrama de cuerdas de flujos interdepartamentales" style="max-width:720px" />
    <p class="small muted">Cintas con flecha: origen → destino (carmín = movimiento). Arcos: jade si el departamento gana población, carmín si la pierde. Clic en un arco para aislar sus flujos. Pares con menos de 30 casos no se dibujan; su volumen se conserva en los totales departamentales.</p>
    <ExportBar svgRef={ref} rows={rows} name="cuerdas_flujos" /></div>);
}
