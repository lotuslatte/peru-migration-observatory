import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { seq, onThemeChange } from './lib/theme';
import ExportBar from './lib/ExportBar';
type Cellf = { o: string; d: string; flow: number; n: number; g: string };
export default function ODMatrix({ matrix, names, focus }: { matrix: Cellf[]; names: Record<string, string>; focus?: string }) {
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0); const [mode, setMode] = useState<'abs' | 'row'>('abs'); const [sel, setSel] = useState<string | null>(focus ?? null);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  const ids = Object.keys(names).sort();
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const cw = 24, left = 110, top = 110; const W = left + ids.length * cw + 10, H = top + ids.length * cw + 10; svg.attr('viewBox', `0 0 ${W} ${H}`);
    const vis = matrix.filter(m => m.g !== 'S');
    const rowTot: Record<string, number> = {}; vis.forEach(m => { rowTot[m.o] = (rowTot[m.o] ?? 0) + m.flow; });
    const val = (m: Cellf) => mode === 'abs' ? m.flow : m.flow / (rowTot[m.o] || 1) * 100;
    const cols = seq(); const max = d3.max(vis, val) ?? 1;
    const color = d3.scaleSequentialLog([1, max], t => cols[Math.min(cols.length - 1, Math.floor(t * cols.length))]);
    const colorLin = d3.scaleLinear<string>().domain([0, max]).range([cols[0], cols[5]]);
    const g = svg.append('g');
    ids.forEach((id, i) => {
      g.append('text').attr('x', left - 6).attr('y', top + i * cw + cw / 2 + 4).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', sel === id ? 'var(--informal)' : 'var(--ink-2)').style('cursor', 'pointer').text(names[id]).on('click', () => setSel(s => s === id ? null : id));
      g.append('text').attr('transform', `translate(${left + i * cw + cw / 2 + 3},${top - 6}) rotate(-60)`).attr('font-size', 9).attr('fill', sel === id ? 'var(--informal)' : 'var(--ink-2)').text(names[id]);
    });
    g.append('text').attr('x', left - 6).attr('y', top - 40).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', 'var(--muted)').text('ORIGEN ↓ · DESTINO →');
    ids.forEach((o, i) => ids.forEach((d, j) => {
      const m = matrix.find(x => x.o === o && x.d === d);
      const dim = sel && sel !== o && sel !== d;
      const fill = !m ? 'var(--panel)' : m.g === 'S' ? 'var(--panel-2)' : (mode === 'abs' ? color(Math.max(1, m.flow)) : colorLin(val(m)));
      g.append('rect').attr('x', left + j * cw + 1).attr('y', top + i * cw + 1).attr('width', cw - 2).attr('height', cw - 2).attr('rx', 2).attr('fill', fill).attr('opacity', dim ? .25 : 1)
        .append('title').text(`${names[o]} → ${names[d]}: ${m ? (m.g === 'S' ? 'suprimido (n<30)' : mode === 'abs' ? `${m.flow.toLocaleString('es-PE')} personas/año` : `${val(m).toFixed(1)} % de los que salen de ${names[o]}`) : 'sin casos'}`);
    }));
  }, [mode, sel, tick]);
  const rows = () => matrix.map(m => ({ origen: names[m.o], destino: names[m.d], personas_por_anio: m.flow, n: m.n, grado: m.g }));
  return (<div class="chart"><div class="toolbar"><span class="eyebrow">Matriz origen–destino · promedio anual 2020–2024</span><span style="display:inline-flex;gap:2px"><button class={`btn ${mode === 'abs' ? 'active' : ''}`} onClick={() => setMode('abs')}>Personas</button><button class={`btn ${mode === 'row' ? 'active' : ''}`} onClick={() => setMode('row')}>% del origen</button></span>{sel && <button class="btn" onClick={() => setSel(null)}>Quitar foco: {names[sel]}</button>}</div>
    <svg ref={ref} role="img" aria-label="Matriz origen destino de migración interdepartamental" /><p class="small muted">Filas = departamento donde vivían hace 5 años; columnas = donde viven hoy. Gris = menos de 30 casos (no se publica). Clic en un nombre para resaltar sus filas y columnas.</p>
    <ExportBar svgRef={ref} rows={rows} name="matriz_origen_destino" /></div>);
}
