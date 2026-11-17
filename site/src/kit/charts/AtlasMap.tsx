import { useEffect, useRef, useState, useMemo } from 'preact/hooks';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { seq, div, onThemeChange } from './lib/theme';
import { fmtUnit, decimalsFor } from './lib/format';
import ExportBar from './lib/ExportBar';
import { getJson } from './lib/fetch';
import { useAtlasData, LoadState, NsMark } from './lib/hooks';
import type { Region, Dim } from '../../data/loaders';

// Sin `regions`/`dims` la isla los pide a `src`: evita serializar el atlas completo en el HTML de cada página.
interface Props { regions?: Region[]; dims?: Dim[]; src?: string; initial?: string; mode?: 'map' | 'matrix'; compact?: boolean; year: number | string; showModeToggle?: boolean; title?: string; level?: 'dept' | 'prov'; hrefBase?: string }

export default function AtlasMap(props: Props) {
  const { regions, dims, error } = useAtlasData<Region, Dim>(props.regions, props.dims, props.src ?? '/data/atlas_regions.json');
  if (!regions || !dims) return <LoadState error={error} />;
  return <AtlasMapInner {...props} regions={regions} dims={dims} />;
}

function AtlasMapInner({ regions, dims, initial, mode: mode0 = 'map', compact = false, year, showModeToggle = true, title, level = 'dept', hrefBase = '/atlas/' }: Props & { regions: Region[]; dims: Dim[] }) {
  const [dim, setDim] = useState(initial ?? dims[0].id);
  const [mode, setMode] = useState<'map' | 'matrix'>(mode0);
  const [scaleMode, setScaleMode] = useState<'abs' | 'pct'>('abs');
  const [whiskers, setWhiskers] = useState(false);
  const [versus, setVersus] = useState(false);
  const [hover, setHover] = useState<Region | null>(null);
  const [topo, setTopo] = useState<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tick, setTick] = useState(0);
  const [outline, setOutline] = useState<any>(null);
  const [mapErr, setMapErr] = useState(false);
  const tt = useRef({ x: 0, y: 0 });   // posición del tooltip: cursor, o centro de la figura cuando se llega con teclado
  const place = (x: number, y: number) => { tt.current = { x, y }; const el = document.getElementById('atlas-tt'); if (el) { el.style.left = x + 'px'; el.style.top = y + 'px'; } };
  useEffect(() => {
    getJson(level === 'prov' ? '/data/provincias.topo.json' : '/data/departamentos.topo.json').then(setTopo).catch(e => { console.error(e); setMapErr(true); });
    if (level === 'prov') getJson('/data/departamentos.topo.json').then(setOutline).catch(e => console.error(e));
    return onThemeChange(() => setTick(t => t + 1));
  }, []);
  const d = dims.find(x => x.id === dim)!;
  // Provinces all have a parent, so only the departmental atlas drops sub-regions.
  const depts = useMemo(() => level === 'prov' ? regions : regions.filter(r => !r.parent), [regions, level]);
  const vals = depts.map(r => r.values[dim]?.v).filter((v): v is number => v != null);
  const color = useMemo(() => {
    // Signed measures (net migration) get two hues around zero; the rest one hue where dark always means higher.
    const neg = vals.filter(v => v < 0).sort(d3.ascending), pos = vals.filter(v => v >= 0).sort(d3.ascending);
    if (neg.length && pos.length) {
      const dv = div(), q = (a: number[], p: number) => d3.quantileSorted(a, p)!;
      const t = d3.scaleThreshold<number, string>().domain([q(neg, 1 / 3), q(neg, 2 / 3), 0, q(pos, 1 / 3), q(pos, 2 / 3)]).range([dv[6], dv[5], dv[4], dv[2], dv[1], dv[0]]);
      return (v: number | null) => v == null ? 'var(--nodata)' : t(v);
    }
    const s = d3.scaleQuantile<string>().domain(vals).range(seq());   // skewed rates need quantiles
    return (v: number | null) => v == null ? 'var(--nodata)' : s(v);
  }, [dim, tick, topo]);
  // Different from Peru only when the 95% interval excludes the national value.
  const nat = (d as any).national?.v as number | undefined;
  const fillFor = (r?: Region) => { const c = r?.values[dim]; if (!versus || nat == null) return color(c?.v ?? null); if (c?.v == null) return 'var(--panel-2)'; return c.lo != null && c.lo > nat ? 'var(--div-7)' : c.hi != null && c.hi < nat ? 'var(--div-1)' : 'var(--div-4)'; };
  const byId = useMemo(() => Object.fromEntries(regions.map(r => [r.id, r])), [regions]);

  // MAP
  useEffect(() => {
    if (!topo || !svgRef.current || mode !== 'map') return;
    const svg = d3.select(svgRef.current); svg.selectAll('*').remove();
    const W = 560, H = 640; svg.attr('viewBox', `0 0 ${W} ${H}`);
    const key = Object.keys(topo.objects)[0];
    const fc: any = topojson.feature(topo, topo.objects[key]);
    const proj = d3.geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], fc);
    const path = d3.geoPath(proj);
    svg.append('g').selectAll('path').data(fc.features).join('path')
      .attr('d', path as any).attr('fill', (f: any) => fillFor(byId[f.properties.id]))
      .attr('stroke', 'var(--bg)').attr('stroke-width', .8).style('cursor', 'pointer')
      .on('mousemove', (e: MouseEvent, f: any) => { place(e.clientX + 12, e.clientY + 12); setHover(byId[f.properties.id]); })
      .on('mouseleave', () => setHover(null))
      .on('click', (_e: any, f: any) => { if (level === 'dept') location.href = `${hrefBase}${f.properties.id}/`; else setHover(byId[f.properties.id]); })
      .attr('tabindex', 0).attr('role', 'link').attr('aria-label', (f: any) => byId[f.properties.id]?.name ?? f.properties.id)
      .on('focus', (e: FocusEvent, f: any) => { const b = (e.target as Element).getBoundingClientRect(); place(b.left + b.width / 2, b.top + b.height / 2); setHover(byId[f.properties.id]); }).on('blur', () => setHover(null)).on('keydown', (e: KeyboardEvent, f: any) => { if (e.key === 'Enter' && level === 'dept') location.href = `${hrefBase}${f.properties.id}/`; });
    if (level === 'prov' && outline) { const ok = Object.keys(outline.objects)[0]; const ofc: any = topojson.feature(outline, outline.objects[ok]);
      svg.append('g').selectAll('path').data(ofc.features).join('path').attr('d', path as any).attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', .7).attr('opacity', .6).attr('pointer-events', 'none'); }
    // legend
    if (versus && nat != null) { const lg = svg.append('g').attr('transform', `translate(10,${H - 60})`); [['--div-7', 'Por encima de Perú'], ['--div-4', 'Sin diferencia clara'], ['--div-1', 'Por debajo de Perú']].forEach(([c, l], i) => { lg.append('rect').attr('y', i * 18).attr('width', 12).attr('height', 12).attr('fill', `var(${c})`); lg.append('text').attr('x', 18).attr('y', i * 18 + 11).attr('font-size', 13).attr('fill', 'var(--muted)').text(l); }); return; }
    const negs = vals.filter(v => v < 0).sort(d3.ascending), poss = vals.filter(v => v >= 0).sort(d3.ascending), signed = negs.length > 0 && poss.length > 0;
    const dv = div(), qs = (a: number[], p: number) => d3.quantileSorted(a, p)!;
    const cols = signed ? [dv[6], dv[5], dv[4], dv[2], dv[1], dv[0]] : seq();
    const cuts = signed ? [qs(negs, 1 / 3), qs(negs, 2 / 3), 0, qs(poss, 1 / 3), qs(poss, 2 / 3)] : d3.scaleQuantile<string>().domain(vals).range(cols).quantiles();
    const edges = [d3.min(vals), ...cuts, d3.max(vals)];
    const lg = svg.append('g').attr('transform', `translate(10,${H - 44})`);
    const bw = 54, short = (v?: number) => fmtUnit(v ?? null, d.unit, decimalsFor(d.unit)).replace('%', '').replace('S/', '');
    lg.selectAll('rect').data(cols).join('rect').attr('x', (_c, i) => i * bw).attr('width', bw - 2).attr('height', 10).attr('fill', c => c);
    edges.forEach((v, i) => { if (i % 2 === 0 || i === edges.length - 1) lg.append('text').attr('x', i * bw).attr('y', 26).attr('text-anchor', i === 0 ? 'start' : i === edges.length - 1 ? 'end' : 'middle').attr('font-size', 13).attr('fill', 'var(--muted)').text(short(v)); });
    lg.append('text').attr('y', -7).attr('font-size', 13).attr('fill', 'var(--muted)').text(signed ? 'Un color para los valores negativos y otro para los positivos.' : 'Más oscuro: valor más alto.');
  }, [topo, outline, dim, mode, tick, versus]);

  // MATRIX (heatmap of all dims × regions, sorted by selected dim)
  useEffect(() => {
    if (!svgRef.current || mode !== 'matrix') return;
    const svg = d3.select(svgRef.current); svg.selectAll('*').remove();
    const rows = [...regions].sort((a, b) => ((b.pct[dim] ?? -1) - (a.pct[dim] ?? -1)));
    const rh = 22, left = 150, top = 70, cw = 72; const W = left + dims.length * cw + 10, H = top + rows.length * rh + 10;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const cols = seq();
    const g = svg.append('g');
    dims.forEach((dd, j) => {
      g.append('text').attr('x', left + j * cw + cw / 2).attr('y', top - 8).attr('text-anchor', 'start').attr('transform', `rotate(-35 ${left + j * cw + cw / 2} ${top - 8})`)
        .attr('font-size', 13).attr('fill', dd.id === dim ? 'var(--accent)' : 'var(--muted)').style('cursor', 'pointer').text(dd.label_es.length > 26 ? dd.label_es.slice(0, 24) + '…' : dd.label_es).on('click', () => setDim(dd.id))
        .attr('tabindex', 0).attr('role', 'button').attr('aria-label', `Ordenar por ${dd.label_es}`).on('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDim(dd.id); } });
    });
    rows.forEach((r, i) => {
      g.append('text').attr('x', left - 8).attr('y', top + i * rh + rh / 2 + 4).attr('text-anchor', 'end').attr('font-size', 13).attr('fill', 'var(--ink)').style('cursor', 'pointer').text(r.name).on('click', () => location.href = `/atlas/${r.id}/`)
        .attr('tabindex', 0).attr('role', 'link').attr('aria-label', `Perfil de ${r.name}`).on('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') location.href = `/atlas/${r.id}/`; });
      dims.forEach((dd, j) => {
        const c = r.values[dd.id]; const p = r.pct[dd.id];
        const fill = c?.v == null ? 'var(--panel-2)' : p == null ? 'var(--panel-2)' : cols[Math.min(cols.length - 1, Math.floor(p / 100 * cols.length))];
        g.append('rect').attr('x', left + j * cw + 1).attr('y', top + i * rh + 1).attr('width', cw - 2).attr('height', rh - 2).attr('rx', 3).attr('fill', fill)
          .append('title').text(`${r.name} · ${dd.label_es}: ${fmtUnit(c?.v, dd.unit, decimalsFor(dd.unit))} (${c?.g})`);
        g.append('text').attr('x', left + j * cw + cw / 2).attr('y', top + i * rh + rh / 2 + 4).attr('text-anchor', 'middle').attr('font-size', 13)
          .attr('fill', p != null && p > 55 ? 'var(--bg)' : 'var(--ink)').attr('font-family', 'var(--font-mono)')
          .text(c?.v == null ? '—' : scaleMode === 'pct' ? `${p}` : fmtUnit(c.v, dd.unit, decimalsFor(dd.unit)).replace('%', '').replace('S/', ''));
      });
    });
  }, [dim, mode, scaleMode, tick]);

  const rankedAll = [...depts].sort((a, b) => ((b.values[dim]?.v ?? -1e9) - (a.values[dim]?.v ?? -1e9)) * (d.higher_better ? 1 : -1));
  const ranked = level === 'prov' ? rankedAll.filter(r => r.values[dim]?.v != null).slice(0, 15).concat(rankedAll.filter(r => r.values[dim]?.v != null).slice(-15)) : rankedAll;
  const anyNs = ranked.some(r => r.values[dim]?.ns);
  const rows = () => regions.map(r => ({ id: r.id, departamento: r.name, indicador: d.label_es, valor: r.values[dim]?.v, se: r.values[dim]?.se, ic_lo: r.values[dim]?.lo, ic_hi: r.values[dim]?.hi, n: r.values[dim]?.n, grado: r.values[dim]?.g, no_concluyente: r.values[dim]?.ns ? 1 : '', percentil: r.pct[dim] }));
  return (
    <div class="atlas">
      <div class="toolbar">
        <select value={dim} onChange={e => setDim((e.target as HTMLSelectElement).value)} aria-label="Dimensión">
          {dims.map(x => <option value={x.id}>{x.primary ? '● ' : '○ '}{x.label_es}</option>)}
        </select>
        {showModeToggle && <span class="seg"><button class={`btn ${mode === 'map' ? 'active' : ''}`} onClick={() => setMode('map')}>Mapa</button><button class={`btn ${mode === 'matrix' ? 'active' : ''}`} onClick={() => setMode('matrix')}>Matriz</button></span>}
        {mode === 'matrix' && <span class="seg"><button class={`btn ${scaleMode === 'abs' ? 'active' : ''}`} onClick={() => setScaleMode('abs')}>Valor</button><button class={`btn ${scaleMode === 'pct' ? 'active' : ''}`} onClick={() => setScaleMode('pct')}>Percentil</button></span>}
        {mode === 'map' && !compact && <label class="small muted"><input type="checkbox" checked={whiskers} onChange={e => setWhiskers((e.target as HTMLInputElement).checked)} /> IC 95 %</label>}
        {mode === 'map' && !compact && nat != null && <label class="small muted"><input type="checkbox" checked={versus} onChange={e => setVersus((e.target as HTMLInputElement).checked)} /> Frente al Perú</label>}
      </div>
      <div class={`layout ${compact ? 'compact' : ''}`}>
        <div class="chart">{mapErr && mode === 'map' && <LoadState error />}<svg ref={svgRef} role="img" aria-label={`${title ?? d.label_es} por departamento, ${year}`} /></div>
        {mode === 'map' && (
          <div class="rank">
            <div class="eyebrow">{d.label_es} · {year}</div>
            <ol>
              {ranked.map((r, i) => { const c = r.values[dim]; const dom = d3.extent(vals) as [number, number]; const w = c?.v == null ? 0 : (c.v - dom[0]) / (dom[1] - dom[0] || 1) * 100;
                return <li class={hover?.id === r.id ? 'hl' : ''} style={anyNs ? '--q:54px' : undefined}>{level === 'dept' ? <a href={`${hrefBase}${r.id}/`}>{r.name}</a> : <span title={(r as any).dept_name}>{r.name}</span>}
                  <span class="bar"><span class="fill" style={{ width: w + '%', background: color(c?.v ?? null) }} />{whiskers && c?.lo != null && <span class="wh" style={{ left: ((c.lo - dom[0]) / (dom[1] - dom[0] || 1) * 100) + '%', width: ((c.hi! - c.lo) / (dom[1] - dom[0] || 1) * 100) + '%' }} />}</span>
                  <span class="v mono">{c?.v == null ? '—' : fmtUnit(c.v, d.unit, decimalsFor(d.unit))}</span><span class="q"><span class={`badge compact ${c?.g}`}></span>{c?.ns && <NsMark compact />}</span></li>; })}
            </ol>
          </div>)}
      </div>
      {hover && <div id="atlas-tt" class="tooltip" role="status" style={{ left: tt.current.x + 'px', top: tt.current.y + 'px' }}><strong>{hover.name}</strong><br />{d.label_es}: {fmtUnit(hover.values[dim]?.v, d.unit, decimalsFor(d.unit))} <span class="mono">[{hover.values[dim]?.g}]</span>{hover.values[dim]?.lo != null && <><br /><span class="small">IC 95 %: {fmtUnit(hover.values[dim].lo, d.unit, decimalsFor(d.unit))} – {fmtUnit(hover.values[dim].hi, d.unit, decimalsFor(d.unit))} · n={hover.values[dim].n}</span></>}{hover.values[dim]?.ns && <><br /><span class="small">Brecha no concluyente (el IC incluye la ausencia de brecha)</span></>}<br /><span class="small">Percentil {hover.pct[dim] ?? '—'}{level === 'dept' ? ' · clic para ver perfil' : ` · ${(hover as any).dept_name ?? ''}`}</span></div>}
      <ExportBar svgRef={svgRef} rows={rows} name={`atlas_${dim}_${year}`} />
      <style>{`.atlas .layout{display:grid;grid-template-columns:minmax(280px,1fr) minmax(260px,.9fr);gap:18px;align-items:start}.atlas .layout.compact{grid-template-columns:1fr}
        .atlas .seg{display:inline-flex;gap:2px}.atlas .rank ol{list-style:none;margin:8px 0 0;padding:0;font-size:.85rem}
        .atlas .rank li{display:grid;grid-template-columns:120px 1fr 64px var(--q,22px);gap:8px;align-items:center;padding:3px 4px;border-radius:6px}.atlas .rank li.hl{background:var(--panel-2)}
        .atlas .rank a{color:var(--ink);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.atlas .bar{position:relative;height:10px;background:var(--panel-2);border-radius:5px;overflow:visible}
        .atlas .fill{position:absolute;left:0;top:0;height:100%;border-radius:5px}.atlas .wh{position:absolute;top:3px;height:4px;background:var(--ink);opacity:.5}.atlas .v{text-align:right;font-size:.78rem}.atlas .q{display:inline-flex;gap:3px;align-items:center}
        @media(max-width:760px){.atlas .layout{grid-template-columns:1fr}.atlas .rank li{grid-template-columns:100px 1fr 56px var(--q,22px)}}`}</style>
    </div>
  );
}
