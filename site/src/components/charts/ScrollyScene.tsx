import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { cat as catColors, seq, onThemeChange } from './lib/theme';
import { buildScene, VB, type ChartSpec, type Scene } from './lib/scene';
export interface Step { id: string; title: string; html: string; chart: ChartSpec }
interface Props { steps: Step[]; mapNames?: Record<string, string> }
export default function ScrollyScene({ steps, mapNames = {} }: Props) {
  const [active, setActive] = useState(0); const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0);
  const needsMap = steps.some(s => s.chart.type === 'map'); const [topo, setTopo] = useState<any>(null);
  const pending = useRef<number | null>(null); const running = useRef(false);
  useEffect(() => { if (needsMap) fetch('/data/departamentos.topo.json').then(r => r.json()).then(setTopo); return onThemeChange(() => setTick(t => t + 1)); }, []);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.step'));
    const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) setActive(+e.target.getAttribute('data-i')!); }); }, { rootMargin: '-45% 0px -45% 0px' });
    els.forEach(el => io.observe(el)); return () => io.disconnect();
  }, []);
  useEffect(() => { if (needsMap && !topo) return; render(active); }, [active, topo, tick]);

  function render(i: number) {
    const svg = d3.select(ref.current!); svg.attr('viewBox', `0 0 ${VB.w} ${VB.h}`);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; const D = reduce ? 0 : 650; const ease = d3.easeCubicInOut;
    const cols = catColors(); const sq = seq();
    let project: ((id: string) => [number, number] | null) | undefined; let fc: any = null; let path: any = null;
    if (topo) { fc = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]); const proj = d3.geoMercator().fitExtent([[20, 10], [VB.w - 160, VB.h - 10]], fc); path = d3.geoPath(proj); project = id => { const f = fc.features.find((x: any) => x.properties.id === id); return f ? (path.centroid(f) as [number, number]) : null; }; }
    let scene: Scene; try { scene = buildScene(steps[i].chart, { project, names: mapNames }); } catch (e) { console.error(e); return; }
    const layer = (cls: string) => { let g = svg.select<SVGGElement>(`g.${cls}`); if (g.empty()) g = svg.append('g').attr('class', cls); return g; };
    // mapa
    const gm = layer('map');
    if (fc) { const mp = gm.selectAll<SVGPathElement, any>('path').data(fc.features, (f: any) => f.properties.id); mp.enter().append('path').attr('d', path).attr('fill', 'var(--panel-2)').attr('stroke', 'var(--bg)').attr('opacity', 0).merge(mp as any).transition().duration(D).ease(ease)
      .attr('opacity', scene.layout === 'map' ? 1 : 0).attr('fill', (f: any) => { const t = scene.mapFill?.[f.properties.id]; return t == null ? 'var(--panel-2)' : sq[Math.min(5, Math.floor(t * 6))]; }); }
    // ejes
    const ga = layer('axes'); const ax = ga.selectAll<SVGGElement, any>('g.axis').data(scene.axes, (a: any) => a.orient);
    ax.exit().transition().duration(D / 2).attr('opacity', 0).remove();
    const axE = ax.enter().append('g').attr('class', 'axis').attr('opacity', 0); const axAll = axE.merge(ax as any);
    axAll.transition().duration(D).attr('opacity', 1);
    axAll.each(function (a) { const g = d3.select(this); const t = g.selectAll<SVGTextElement, any>('text').data(a.ticks, (d: any) => d.label); t.exit().remove();
      t.enter().append('text').attr('font-size', 10).attr('fill', 'var(--muted)').attr('text-anchor', a.orient === 'x' ? 'middle' : 'end').merge(t as any).text(d => d.label).transition().duration(D).attr('x', d => a.orient === 'x' ? d.pos : a.at - 6).attr('y', d => a.orient === 'x' ? a.at + 14 : d.pos + 3);
      const l = g.selectAll<SVGLineElement, any>('line').data(a.orient === 'y' ? a.ticks : [], (d: any) => d.label); l.exit().remove(); l.enter().append('line').attr('stroke', 'var(--line)').merge(l as any).transition().duration(D).attr('x1', a.at).attr('x2', VB.w - 110).attr('y1', d => d.pos).attr('y2', d => d.pos); });
    // líneas
    const gl = layer('lines'); const ln = gl.selectAll<SVGPathElement, any>('path').data(scene.lines, (d: any) => d.key); const lineGen = d3.line<[number, number]>().x(p => p[0]).y(p => p[1]);
    ln.exit().transition().duration(D / 2).attr('opacity', 0).remove();
    ln.enter().append('path').attr('fill', 'none').attr('stroke-width', 2.6).attr('opacity', 0).attr('d', d => lineGen(d.points)).merge(ln as any).transition().duration(D).ease(ease).attr('opacity', 1).attr('stroke', d => cols[d.color % cols.length]).attr('d', d => lineGen(d.points));
    // marcas (rect con rx: barra ↔ círculo)
    const gk = layer('marks'); const mk = gk.selectAll<SVGRectElement, any>('rect').data(scene.marks, (d: any) => d.key);
    mk.exit().transition().duration(D / 2).attr('opacity', 0).attr('width', 0).remove();
    mk.enter().append('rect').attr('x', d => d.x + d.w / 2).attr('y', d => d.y + d.h / 2).attr('width', 0).attr('height', 0).attr('opacity', 0).merge(mk as any)
      .transition().duration(D).ease(ease).attr('x', d => d.x).attr('y', d => d.y).attr('width', d => d.w).attr('height', d => d.h).attr('rx', d => d.rx).attr('fill', d => cols[d.color % cols.length]).attr('opacity', .92);
    // etiquetas
    const gt = layer('labels'); const tx = gt.selectAll<SVGTextElement, any>('text.lab').data(scene.marks.filter(m => m.label), (d: any) => d.key);
    tx.exit().transition().duration(D / 2).attr('opacity', 0).remove();
    tx.enter().append('text').attr('class', 'lab').attr('font-size', 11).attr('fill', 'var(--ink)').attr('opacity', 0).attr('x', d => d.labelX ?? d.x).attr('y', d => d.labelY ?? d.y).merge(tx as any).text(d => (d.label ?? '').length > 34 ? d.label!.slice(0, 32) + '…' : d.label!)
      .attr('text-anchor', d => d.anchor ?? 'start').transition().duration(D).ease(ease).attr('opacity', 1).attr('x', d => d.labelX ?? d.x).attr('y', d => d.labelY ?? d.y);
    const vx = gt.selectAll<SVGTextElement, any>('text.val').data(scene.marks.filter(m => m.value), (d: any) => d.key);
    vx.exit().transition().duration(D / 2).attr('opacity', 0).remove();
    vx.enter().append('text').attr('class', 'val').attr('font-size', d => scene.layout === 'kpis' ? 26 : 10.5).attr('font-family', d => scene.layout === 'kpis' ? 'var(--font-serif)' : 'var(--font-mono)').attr('fill', 'var(--ink-2)').attr('opacity', 0).merge(vx as any).text(d => d.value!)
      .attr('font-size', scene.layout === 'kpis' ? 26 : 10.5).attr('text-anchor', scene.layout === 'kpis' ? 'middle' : 'start').attr('fill', scene.layout === 'kpis' ? 'var(--bg)' : 'var(--ink-2)')
      .transition().duration(D).ease(ease).attr('opacity', 1).attr('x', d => scene.layout === 'kpis' ? d.x + d.w / 2 : d.x + d.w + 6).attr('y', d => scene.layout === 'kpis' ? d.y + d.h / 2 + 9 : d.y + d.h / 2 + 4);
    // anotaciones
    const gn = layer('annot'); const an = gn.selectAll<SVGGElement, any>('g.a').data(scene.annotations, (d: any) => d.text);
    an.exit().transition().duration(D / 3).attr('opacity', 0).remove();
    const anE = an.enter().append('g').attr('class', 'a').attr('opacity', 0);
    anE.append('line').attr('stroke', 'var(--ink)').attr('stroke-width', 1); anE.append('text').attr('font-size', 11.5).attr('font-family', 'var(--font-serif)').attr('font-style', 'italic').attr('fill', 'var(--ink)');
    const anAll = anE.merge(an as any);
    anAll.select('line').attr('x1', d => d.x).attr('y1', d => d.y).attr('x2', d => d.x + (d.dx ?? 40)).attr('y2', d => d.y + (d.dy ?? -30));
    anAll.select('text').attr('x', d => d.x + (d.dx ?? 40) + 4).attr('y', d => d.y + (d.dy ?? -30) - 3).text(d => d.text);
    anAll.transition().delay(D * .7).duration(D / 2).attr('opacity', 1);
  }
  const st = steps[active];
  return (<div class="scrolly">
    <div class="steps">{steps.map((s, i) => <section class={`step ${i === active ? 'on' : ''}`} data-i={i} id={s.id}><div class="eyebrow">Capítulo {i + 1}</div><h2>{s.title}</h2><div dangerouslySetInnerHTML={{ __html: s.html }} /></section>)}</div>
    <div class="sticky"><div class="card"><div class="eyebrow">{st.chart.title}</div><svg ref={ref} role="img" aria-label={st.chart.title} /><p class="small muted">{st.chart.note ?? ''}</p></div></div>
    <style>{`.scrolly{display:grid;grid-template-columns:minmax(300px,5fr) minmax(320px,6fr);gap:32px;align-items:start}.steps{padding-bottom:30vh}
      .step{min-height:60vh;padding:20vh 0 0;opacity:.35;transition:opacity .3s}.step.on{opacity:1}.step h2{font-size:1.7rem}.step p{font-size:1.05rem;max-width:52ch}
      .sticky{position:sticky;top:76px}.sticky svg{width:100%;height:auto}
      @media(max-width:820px){.scrolly{grid-template-columns:1fr}.sticky{position:sticky;top:60px;order:-1;background:var(--bg);padding:6px 0}.step{min-height:auto;padding:24px 0;opacity:1}}
      @media print{.sticky{display:none}.step{opacity:1;min-height:auto;padding:12px 0}}`}</style>
  </div>);
}
