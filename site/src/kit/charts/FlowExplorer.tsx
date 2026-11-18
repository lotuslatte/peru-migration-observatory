import { useEffect, useRef, useState } from 'preact/hooks';
import { useWidth } from './lib/hooks';
import { fmtInt, fmtUnit } from './lib/format';
import ExportBar from './lib/ExportBar';

export interface FlowCell { o: string; d: string; flow: number; n: number; g: string }
interface MapData { box: string; W: number; H: number; paths: { id: string; d: string }[]; outline: string; centroids: Record<string, [number, number]> }
interface Facts { in_rate: number | null; out_rate: number | null; net_rate: number | null }
interface Props { matrix: FlowCell[]; names: Record<string, string>; map: MapData; facts: Record<string, Facts>; period: string; placeBase?: string }

const readParam = () => typeof location === 'undefined' ? '' : new URLSearchParams(location.search).get('d') ?? '';

/**
 * Origin and destination flows between departments. One place is picked at a time: the map draws
 * who arrives (accent) and who leaves (ink) and two ranked lists give the figures, so nothing
 * depends on reading small labels. Without a place, the largest corridors of the country are shown.
 */
export default function FlowExplorer({ matrix, names, map, facts, period, placeBase }: Props) {
  const [box, W] = useWidth<HTMLDivElement>(560);
  const svg = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState('');
  useEffect(() => { const d = readParam(); if (names[d]) setSel(d); }, []);
  const pick = (id: string) => {
    setSel(id);
    const u = new URL(location.href); if (id) u.searchParams.set('d', id); else u.searchParams.delete('d');
    history.replaceState(null, '', u);
  };
  const ok = matrix.filter(m => m.g !== 'S' && m.flow > 0);
  const top = (rows: FlowCell[], k: number) => [...rows].sort((a, b) => b.flow - a.flow).slice(0, k);
  const arrivals = sel ? top(ok.filter(m => m.d === sel), 8) : [];
  const departures = sel ? top(ok.filter(m => m.o === sel), 8) : [];
  const national = top(ok, 12);
  const drawn = sel ? [...arrivals.slice(0, 6), ...departures.slice(0, 6)] : national;
  const max = Math.max(1, ...drawn.map(m => m.flow));
  // Sizes are written in viewBox units and scaled so that text is never below 13 px on screen.
  const scale = Math.min(W, 560) / map.W, px = (n: number) => n / scale;
  const width = (v: number) => px(1 + 4.5 * Math.sqrt(v / max));
  const P = (id: string) => map.centroids[id];
  const curve = (m: FlowCell) => {
    const a = P(m.o), b = P(m.d); const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const cx = (a[0] + b[0]) / 2 - dy * 0.18, cy = (a[1] + b[1]) / 2 + dx * 0.18;
    // Stop short of the destination so the arrowhead does not cover its dot.
    const ex = b[0] - (dx / L) * px(7), ey = b[1] - (dy / L) * px(7);
    return `M${a[0]},${a[1]} Q${cx},${cy} ${ex},${ey}`;
  };
  const isIn = (m: FlowCell) => !sel || m.d === sel;
  const labelled = new Set(sel ? [sel, ...arrivals.slice(0, 3).map(m => m.o), ...departures.slice(0, 3).map(m => m.d)] : national.slice(0, 4).flatMap(m => [m.o, m.d]));
  const ends = new Set(drawn.flatMap(m => [m.o, m.d]));
  const f = sel ? facts[sel] : null;
  const rows = () => (sel ? [...ok.filter(m => m.d === sel), ...ok.filter(m => m.o === sel)] : ok).map(m => ({ origen: names[m.o], destino: names[m.d], personas_por_anio: m.flow, n: m.n, sello: m.g }));
  const Bars = ({ list, side, ink }: { list: FlowCell[]; side: 'o' | 'd'; ink?: boolean }) => {
    const hi = Math.max(1, ...list.map(m => m.flow));
    return <ol class={`bars${ink ? ' ink' : ''}`}>{list.map(m => <li>
      <span>{sel ? <button type="button" onClick={() => pick(m[side])}>{names[m[side]]}</button> : <><button type="button" onClick={() => pick(m.o)}>{names[m.o]}</button> a <button type="button" onClick={() => pick(m.d)}>{names[m.d]}</button></>}{m.g === 'B' && <span class="r-grade"> B</span>}</span>
      <span class="val">{fmtInt(m.flow)}</span>
      <span class="bar" aria-hidden="true"><i style={`width:${Math.max(2, m.flow / hi * 100)}%`} /></span>
    </li>)}</ol>;
  };
  const summary = sel
    ? `Flujos de ${names[sel]}. Llegan sobre todo desde ${arrivals.slice(0, 3).map(m => names[m.o]).join(', ') || 'ningún departamento con muestra suficiente'}. Se van sobre todo hacia ${departures.slice(0, 3).map(m => names[m.d]).join(', ') || 'ningún departamento con muestra suficiente'}.`
    : `Los corredores más grandes del país: ${national.slice(0, 4).map(m => `${names[m.o]} a ${names[m.d]}`).join('; ')}.`;
  return (
    <div class="flow">
      <label class="field">Departamento
        <select value={sel} onChange={e => pick((e.target as HTMLSelectElement).value)}>
          <option value="">Todo el país</option>
          {Object.keys(names).sort((a, b) => names[a].localeCompare(names[b], 'es')).map(id => <option value={id}>{names[id]}</option>)}
        </select>
      </label>
      {f && <dl class="flow-facts">
        <div><dt>Llegaron en cinco años</dt><dd>{fmtUnit(f.in_rate, '%')}</dd></div>
        <div><dt>Se fueron</dt><dd>{fmtUnit(f.out_rate, '%')}</dd></div>
        <div><dt>Saldo</dt><dd>{f.net_rate == null ? 's/d' : (f.net_rate > 0 ? '+' : f.net_rate < 0 ? '−' : '') + fmtUnit(Math.abs(f.net_rate), '‰')}</dd></div>
      </dl>}
      <div class="flow-grid">
        <div class="flow-map" ref={box}>
          <svg ref={svg} viewBox={map.box} role="img" aria-label={summary}>
            <defs>
              <marker id="fx-in" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" /></marker>
              <marker id="fx-out" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" /></marker>
            </defs>
            <g>{map.paths.map(p => <path d={p.d} fill={p.id === sel ? 'var(--rule)' : 'var(--panel-2)'} style="cursor:pointer" onClick={() => pick(p.id === sel ? '' : p.id)}><title>{names[p.id]}</title></path>)}</g>
            <path d={map.outline} fill="none" stroke="var(--bg)" stroke-width={px(1)} pointer-events="none" />
            <g fill="none" stroke-linecap="round" pointer-events="none">
              {drawn.map(m => <path d={curve(m)} stroke={isIn(m) ? 'var(--accent)' : 'var(--ink)'} stroke-width={width(m.flow)} opacity={m.g === 'A' ? 0.8 : 0.5} marker-end={`url(#${isIn(m) ? 'fx-in' : 'fx-out'})`} />)}
            </g>
            <g pointer-events="none">{[...ends].map(id => <circle cx={P(id)[0]} cy={P(id)[1]} r={px(id === sel ? 5 : 3.2)} fill="var(--ink)" stroke="var(--bg)" stroke-width={px(1)} />)}</g>
            <g pointer-events="none">
              {[...labelled].map(id => { const [x, y] = P(id); const left = x > map.W * 0.62 || id === '07'; return <text x={x + (left ? -px(8) : px(8))} y={y + px(4.5)} text-anchor={left ? 'end' : 'start'} style={`font-size:${px(13)}px;font-weight:500;fill:var(--ink);paint-order:stroke;stroke:var(--bg);stroke-width:${px(3.5)}px;stroke-linejoin:round`}>{names[id]}</text>; })}
            </g>
          </svg>
          {sel ? <ul class="flow-key"><li>Llegan a {names[sel]}</li><li class="out">Se van de {names[sel]}</li></ul> : <ul class="flow-key"><li>Los 12 corredores más grandes; el grosor crece con el número de personas</li></ul>}
        </div>
        <div>
          {sel ? <>
            <h3>Llegan desde</h3>
            {arrivals.length ? <Bars list={arrivals} side="o" /> : <p class="r-src">Ningún origen tiene muestra suficiente para publicarse.</p>}
            <h3 style="margin-top:var(--s-6)">Se van hacia</h3>
            {departures.length ? <Bars list={departures} side="d" ink /> : <p class="r-src">Ningún destino tiene muestra suficiente para publicarse.</p>}
            {placeBase && <p style="margin-top:var(--s-4)"><a href={`${placeBase}${sel}/`}>Perfil de {names[sel]}</a> · <button class="r-btn" type="button" onClick={() => pick('')}>Ver todo el país</button></p>}
          </> : <>
            <h3>Los corredores más grandes</h3>
            <Bars list={national} side="o" />
          </>}
          <p class="r-src">Personas por año, promedio {period}. B: estimación menos precisa. Los pares con menos de 30 casos en la muestra no se publican.</p>
        </div>
      </div>
      <ExportBar svgRef={svg} rows={rows} name={sel ? `flujos_${sel}` : 'flujos_pais'} />
    </div>
  );
}
