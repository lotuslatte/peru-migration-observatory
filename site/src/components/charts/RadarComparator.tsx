import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { cat as catColors, onThemeChange } from './lib/theme';
import { fmtUnit, decimalsFor } from './lib/format';
import ExportBar from './lib/ExportBar';
type Region = { id: string; name: string; parent: string | null; values: Record<string, any>; pct: Record<string, number | null> };
type Dim = { id: string; label_es: string; unit: string; primary: boolean };
export default function RadarComparator({ regions, dims, a: a0, b: b0 }: { regions: Region[]; dims: Dim[]; a: string; b?: string }) {
  const qs = typeof window !== 'undefined' ? new URLSearchParams(location.search) : null;
  const [a, setA] = useState(qs?.get('a') ?? a0); const [b, setB] = useState(qs?.get('b') ?? b0 ?? (a0 === '15' ? '08' : '15'));
  useEffect(() => { if (typeof window === 'undefined') return; const u = new URL(location.href); u.searchParams.set('a', a); u.searchParams.set('b', b); history.replaceState(null, '', u.toString()); }, [a, b]);
  const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0);
  const prim = dims.filter(d => d.primary);
  const byId = Object.fromEntries(regions.map(r => [r.id, r]));
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  useEffect(() => {
    const svg = d3.select(ref.current!); svg.selectAll('*').remove();
    const W = 520, H = 420, cx = W / 2, cy = H / 2 + 10, R = 150; svg.attr('viewBox', `0 0 ${W} ${H}`);
    const ang = (i: number) => (Math.PI * 2 * i) / prim.length - Math.PI / 2;
    const cols = catColors();
    [25, 50, 75, 100].forEach(p => svg.append('polygon').attr('points', prim.map((_d, i) => `${cx + Math.cos(ang(i)) * R * p / 100},${cy + Math.sin(ang(i)) * R * p / 100}`).join(' ')).attr('fill', 'none').attr('stroke', 'var(--line)'));
    prim.forEach((d, i) => {
      svg.append('line').attr('x1', cx).attr('y1', cy).attr('x2', cx + Math.cos(ang(i)) * R).attr('y2', cy + Math.sin(ang(i)) * R).attr('stroke', 'var(--line)');
      const lx = cx + Math.cos(ang(i)) * (R + 22), ly = cy + Math.sin(ang(i)) * (R + 22);
      svg.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', Math.abs(Math.cos(ang(i))) < .2 ? 'middle' : Math.cos(ang(i)) > 0 ? 'start' : 'end').attr('font-size', 10).attr('fill', 'var(--muted)').text(d.label_es.split(' (')[0]);
    });
    [[a, cols[0]], [b, cols[1]]].forEach(([id, col]) => {
      const r = byId[id]; if (!r) return;
      const pts = prim.map((d, i) => { const p = r.pct[d.id] ?? 0; return [cx + Math.cos(ang(i)) * R * p / 100, cy + Math.sin(ang(i)) * R * p / 100]; });
      svg.append('polygon').attr('points', pts.map(p => p.join(',')).join(' ')).attr('fill', col).attr('opacity', .18).attr('stroke', col).attr('stroke-width', 2);
      pts.forEach((p, i) => svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 4).attr('fill', col).append('title').text(`${r.name} · ${prim[i].label_es}: ${fmtUnit(r.values[prim[i].id]?.v, prim[i].unit, decimalsFor(prim[i].unit))} (percentil ${r.pct[prim[i].id]})`));
    });
  }, [a, b, tick]);
  const ra = byId[a], rb = byId[b];
  const rows = () => prim.map(d => ({ dimension: d.label_es, [ra?.name ?? a]: ra?.values[d.id]?.v, [`${ra?.name}_pct`]: ra?.pct[d.id], [rb?.name ?? b]: rb?.values[d.id]?.v, [`${rb?.name}_pct`]: rb?.pct[d.id] }));
  const sel = (v: string, set: (s: string) => void) => <select value={v} onChange={e => set((e.target as HTMLSelectElement).value)}>{regions.filter(r => !r.parent).map(r => <option value={r.id}>{r.name}</option>)}</select>;
  return (<div class="chart"><div class="toolbar"><span class="eyebrow">Comparador</span>{sel(a, setA)}<span class="muted">vs</span>{sel(b, setB)}<button class="btn" onClick={() => navigator.clipboard?.writeText(location.href)} title="Copiar enlace con esta comparación">Copiar enlace</button></div>
    <svg ref={ref} role="img" aria-label="Radar de seis dimensiones" />
    <div class="scroll-x"><table class="data"><thead><tr><th>Dimensión</th><th>{ra?.name}</th><th>pct</th><th>{rb?.name}</th><th>pct</th><th>Diferencia</th></tr></thead><tbody>
      {prim.map(d => { const va = ra?.values[d.id], vb = rb?.values[d.id]; const diff = va?.v != null && vb?.v != null ? va.v - vb.v : null; const sig = va?.se != null && vb?.se != null && diff != null ? Math.abs(diff) / Math.sqrt(va.se ** 2 + vb.se ** 2) > 1.96 : false;
        return <tr><td>{d.label_es}</td><td>{fmtUnit(va?.v, d.unit, decimalsFor(d.unit))} <span class={`badge compact ${va?.g}`}></span></td><td class="mono">{ra?.pct[d.id]}</td><td>{fmtUnit(vb?.v, d.unit, decimalsFor(d.unit))} <span class={`badge compact ${vb?.g}`}></span></td><td class="mono">{rb?.pct[d.id]}</td><td class="mono">{diff == null ? '—' : (diff > 0 ? '+' : '') + fmtUnit(diff, d.unit === 'S/' ? 'S/' : 'pp', decimalsFor(d.unit))}{sig ? ' *' : ''}</td></tr>; })}
    </tbody></table></div><p class="small muted">* diferencia significativa al 95 % (prueba z con errores estándar de diseño). Percentil entre los 25 departamentos; 100 = mejor posición.</p>
    <ExportBar svgRef={ref} rows={rows} name={`radar_${a}_${b}`} /></div>);
}
