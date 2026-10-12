import { useEffect, useRef, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { cat as catColors, onThemeChange } from './lib/theme';
import { fmtUnit } from './lib/format';
// Cada paso describe un gráfico simple: kpis | bars | dumbbell | lines | map-hint
export interface Step { id: string; title: string; html: string; chart: any }
export default function ScrollyStory({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0); const ref = useRef<SVGSVGElement>(null); const [tick, setTick] = useState(0);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.step'));
    const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) setActive(+e.target.getAttribute('data-i')!); }); }, { rootMargin: '-45% 0px -45% 0px' });
    els.forEach(el => io.observe(el)); return () => io.disconnect();
  }, []);
  useEffect(() => { draw(ref.current!, steps[active].chart); }, [active, tick]);
  return (<div class="scrolly">
    <div class="steps">{steps.map((s, i) => <section class={`step ${i === active ? 'on' : ''}`} data-i={i} id={s.id}><div class="eyebrow">Capítulo {i + 1}</div><h2>{s.title}</h2><div dangerouslySetInnerHTML={{ __html: s.html }} /></section>)}</div>
    <div class="sticky"><div class="card"><div class="eyebrow">{steps[active].chart.title}</div><svg ref={ref} role="img" aria-label={steps[active].chart.title} /><p class="small muted">{steps[active].chart.note ?? ''}</p></div></div>
    <style>{`.scrolly{display:grid;grid-template-columns:minmax(300px,5fr) minmax(320px,6fr);gap:32px;align-items:start}.steps{padding-bottom:30vh}
      .step{min-height:60vh;padding:20vh 0 0;opacity:.35;transition:opacity .3s}.step.on{opacity:1}.step h2{font-size:1.7rem}.step p{font-size:1.05rem;max-width:52ch}
      .sticky{position:sticky;top:76px}.sticky svg{width:100%;height:auto}
      @media(max-width:820px){.scrolly{grid-template-columns:1fr}.sticky{position:sticky;top:60px;order:-1;background:var(--bg);padding:6px 0}.step{min-height:auto;padding:24px 0;opacity:1}}`}</style>
  </div>);
}
function draw(svg: SVGSVGElement, c: any) {
  const s = d3.select(svg); s.selectAll('*').remove(); const W = 600; const cols = catColors();
  if (c.type === 'kpis') {
    const H = 260; s.attr('viewBox', `0 0 ${W} ${H}`); const n = c.items.length; const cw = W / n;
    c.items.forEach((it: any, i: number) => { const g = s.append('g').attr('transform', `translate(${i * cw + cw / 2},0)`);
      g.append('text').attr('y', 120).attr('text-anchor', 'middle').attr('font-family', 'var(--font-serif)').attr('font-size', 54).attr('font-weight', 600).attr('fill', cols[i % cols.length]).text(fmtUnit(it.v, it.unit ?? '%').replace(' %', '%'));
      g.append('text').attr('y', 156).attr('text-anchor', 'middle').attr('font-size', 13).attr('fill', 'var(--ink-2)').text(it.label);
      if (it.sub) g.append('text').attr('y', 178).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--muted)').text(it.sub); });
  } else if (c.type === 'bars') {
    const rh = 36; const m = { t: 10, r: 80, b: 10, l: 180 }; const H = m.t + m.b + c.items.length * rh; s.attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleLinear().domain([0, d3.max(c.items, (d: any) => d.v) as number * 1.05]).range([m.l, W - m.r]);
    c.items.forEach((d: any, i: number) => { const y = m.t + i * rh;
      s.append('text').attr('x', m.l - 10).attr('y', y + rh / 2 + 4).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'var(--ink)').text(d.label);
      s.append('rect').attr('x', m.l).attr('y', y + 6).attr('height', rh - 12).attr('width', Math.max(0, x(d.v) - m.l)).attr('rx', 4).attr('fill', d.color != null ? cols[d.color] : cols[0]);
      s.append('text').attr('x', x(d.v) + 6).attr('y', y + rh / 2 + 4).attr('font-size', 12).attr('font-family', 'var(--font-mono)').attr('fill', 'var(--ink-2)').text(fmtUnit(d.v, c.unit ?? '%')); });
  } else if (c.type === 'lines') {
    const H = 300, m = { t: 20, r: 110, b: 30, l: 50 }; s.attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scalePoint<number>().domain(c.years).range([m.l, W - m.r]);
    const all = c.series.flatMap((q: any) => q.values).filter((v: any) => v != null);
    const y = d3.scaleLinear().domain([Math.min(0, d3.min(all) as number), (d3.max(all) as number) * 1.05]).nice().range([H - m.b, m.t]);
    s.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(d => String(d)) as any).selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 10);
    s.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)) as any).call(g => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', 'var(--line)'); g.selectAll('text').attr('fill', 'var(--muted)').attr('font-size', 10); });
    c.series.forEach((q: any, i: number) => { const pts = c.years.map((yr: number, k: number) => ({ yr, v: q.values[k] })).filter((p: any) => p.v != null);
      s.append('path').datum(pts).attr('d', d3.line<any>().x(p => x(p.yr)!).y(p => y(p.v))).attr('fill', 'none').attr('stroke', cols[i]).attr('stroke-width', 2.4);
      const l = pts[pts.length - 1]; s.append('text').attr('x', x(l.yr)! + 6).attr('y', y(l.v) + 4).attr('font-size', 11).attr('fill', cols[i]).text(`${q.label} ${fmtUnit(l.v, c.unit ?? '%')}`); });
  }
}
