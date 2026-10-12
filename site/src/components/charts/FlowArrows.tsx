import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { onThemeChange } from './lib/theme';
import ExportBar from './lib/ExportBar';
interface Props { chord: any; topN?: number }
export default function FlowArrows({ chord, topN: n0 = 30 }: Props) {
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0); const [topN, setTopN] = useState(n0); const [only, setOnly] = useState<string>(''); const [topo, setTopo] = useState<any>(null);
  useEffect(() => { fetch('/data/departamentos.topo.json').then(r => r.json()).then(setTopo); return onThemeChange(() => setTick(t => t + 1)); }, []);
  const ids: string[] = chord.ids; const names: Record<string, string> = chord.names;
  useEffect(() => {
    if (!topo) return; const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const W = 560, H = 660; svg.attr('viewBox', `0 0 ${W} ${H}`);
    const fc: any = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
    const proj = d3.geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], fc); const path = d3.geoPath(proj);
    svg.append('g').selectAll('path').data(fc.features).join('path').attr('d', path as any).attr('fill', 'var(--panel-2)').attr('stroke', 'var(--bg)');
    const defs = svg.append('defs'); defs.append('marker').attr('id', 'arr').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto-start-reverse').append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', 'var(--informal)');
    let flows: { o: string; d: string; v: number; g: string }[] = [];
    ids.forEach((o, i) => ids.forEach((d, j) => { const v = chord.matrix[i][j]; if (v > 0 && (!only || o === only || d === only)) flows.push({ o, d, v, g: chord.g[i][j] }); }));
    flows.sort((a, b) => b.v - a.v); flows = flows.slice(0, topN);
    const wS = d3.scaleSqrt().domain([0, d3.max(flows, f => f.v) ?? 1]).range([0.6, 9]);
    const P = (id: string) => proj(chord.centroids[id] as [number, number])!;
    svg.append('g').selectAll('path').data(flows).join('path').attr('d', f => { const a = P(f.o), b = P(f.d); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; const cx = mx - dy / L * L * .18, cy = my + dx / L * L * .18; return `M${a[0]},${a[1]} Q${cx},${cy} ${b[0]},${b[1]}`; })
      .attr('fill', 'none').attr('stroke', 'var(--informal)').attr('stroke-width', f => wS(f.v)).attr('opacity', f => f.g === 'A' ? .7 : .4).attr('marker-end', 'url(#arr)').append('title').text(f => `${names[f.o]} → ${names[f.d]}: ${f.v.toLocaleString('es-PE')} personas/año (${f.g})`);
    svg.append('g').selectAll('circle').data(ids).join('circle').attr('cx', id => P(id)[0]).attr('cy', id => P(id)[1]).attr('r', 3).attr('fill', 'var(--ink)').style('cursor', 'pointer').on('click', (_e, id) => setOnly(o => o === id ? '' : id));
    svg.append('g').selectAll('text').data(ids).join('text').attr('x', id => P(id)[0] + 5).attr('y', id => P(id)[1] + 3).attr('font-size', 8.5).attr('fill', 'var(--ink-2)').text(id => names[id]);
  }, [topo, topN, only, tick]);
  const rows = () => ids.flatMap((o, i) => ids.map((d, j) => ({ origen: names[o], destino: names[d], personas_anio: chord.matrix[i][j] })).filter(r => r.personas_anio > 0));
  return (<div class="chart"><div class="toolbar"><span class="eyebrow">Mapa de flechas · top {topN}</span><input type="range" min="5" max="120" step="5" value={topN} onInput={e => setTopN(+(e.target as HTMLInputElement).value)} aria-label="Número de flujos" />
    <select value={only} onChange={e => setOnly((e.target as HTMLSelectElement).value)}><option value="">Todos los departamentos</option>{ids.map(id => <option value={id}>{names[id]}</option>)}</select></div>
    <svg ref={ref} role="img" aria-label="Mapa de flechas de migración interdepartamental" /><p class="small muted">Grosor ∝ √(personas/año). Curvatura separa ida y vuelta. Clic en un punto para filtrar ese departamento.</p><ExportBar svgRef={ref} rows={rows} name="flechas_flujos" /></div>);
}
