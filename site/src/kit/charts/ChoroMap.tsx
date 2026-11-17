import { useRef } from 'preact/hooks';
import { fmtUnit } from './lib/format';
import { showTip, showTipAt, hideTip } from './lib/tip';
import ExportBar from './lib/ExportBar';
import type { Cell } from './LineChart';

/** Outlines projected at build time (see peruMap in the site's data helpers). */
export interface MapShapes { box: string; paths: { id: string; d: string }[]; inset: { id: string; d: string }[]; I: { x: number; y: number; s: number }; outline: string; insetOutline: string }
export interface MapRow { id: string; name: string; c: Cell }
interface Props {
  map: MapShapes; rows: MapRow[]; unit: string; title: string; name?: string;
  /** 'seq': one hue, darker is higher. 'div': signed values, two hues around zero. */
  scale?: 'seq' | 'div';
  hrefFor?: (id: string) => string; placeWord?: [string, string]; insetLabel?: string; ranking?: boolean;
}

/** Class breaks. Sequential: six quantile classes. Diverging: three classes on each side of zero. */
export function classify(values: number[], scale: 'seq' | 'div') {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
  if (scale === 'seq') {
    const cuts = [1, 2, 3, 4, 5].map(k => q(sorted, k / 6));
    return { cuts, fills: [1, 2, 3, 4, 5, 6].map(i => `var(--seq-${i})`), bin: (v: number) => cuts.filter(t => v >= t).length, starts: [sorted[0], ...cuts] };
  }
  const neg = sorted.filter(v => v < 0), pos = sorted.filter(v => v >= 0);
  const nc = neg.length ? [q(neg, 1 / 3), q(neg, 2 / 3)] : [], pc = pos.length ? [q(pos, 1 / 3), q(pos, 2 / 3)] : [];
  const cuts = [...nc, 0, ...pc];
  const fills = [...(neg.length ? ['var(--div-7)', 'var(--div-6)', 'var(--div-5)'] : []), ...(pos.length ? ['var(--div-3)', 'var(--div-2)', 'var(--div-1)'] : [])];
  const inner = neg.length && pos.length ? cuts : neg.length ? nc : pc;
  return { cuts: inner, fills, bin: (v: number) => inner.filter(t => v >= t).length, starts: [sorted[0], ...inner] };
}

/** Choropleth with class legend, a "no data" swatch, an inset for Lima and Callao and a ranking. */
export default function ChoroMap({ map, rows, unit, title, name, scale = 'seq', hrefFor, placeWord = ['departamento', 'departamentos'], insetLabel = 'Lima y Callao', ranking = true }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const byId = new Map(rows.map(r => [r.id, r]));
  const ok = rows.filter(r => r.c.v != null);
  const cls = classify(ok.map(r => r.c.v!), scale);
  const fill = (id: string) => { const r = byId.get(id); return r && r.c.v != null ? cls.fills[cls.bin(r.c.v)] : 'url(#nodata)'; };
  const lines = (r: MapRow) => [r.name, r.c.v == null ? 'Sin dato publicable' : fmtUnit(r.c.v, unit), ...(r.c.lo != null && r.c.hi != null ? [`IC 95%: ${fmtUnit(r.c.lo, unit)} a ${fmtUnit(r.c.hi, unit)}`] : []), ...(r.c.g === 'B' ? ['Estimación menos precisa'] : [])];
  const sorted = [...ok].sort((a, b) => b.c.v! - a.c.v!);
  const missing = rows.length - ok.length;
  const I = map.I;
  const shape = (p: { id: string; d: string }) => {
    const r = byId.get(p.id); if (!r) return <path d={p.d} fill="url(#nodata)" />;
    const go = () => { if (hrefFor) location.href = hrefFor(p.id); };
    return <path d={p.d} fill={fill(p.id)} tabIndex={0} role={hrefFor ? 'link' : 'img'} aria-label={lines(r).join('. ')}
      onPointerEnter={e => (e.currentTarget.parentNode as Element).appendChild(e.currentTarget)}
      onPointerMove={e => showTip(e.clientX, e.clientY, lines(r))} onPointerLeave={hideTip}
      onFocus={e => showTipAt(e.currentTarget, lines(r))} onBlur={hideTip}
      onClick={go} onKeyDown={e => { if (e.key === 'Enter') go(); }} />;
  };
  const item = (r: MapRow) => <li><span>{hrefFor ? <a href={hrefFor(r.id)}>{r.name}</a> : r.name}</span><span>{fmtUnit(r.c.v, unit)}{r.c.g === 'B' && <span class="r-grade" title="Estimación menos precisa"> B</span>}</span></li>;
  const exportRows = () => rows.map(r => ({ id: r.id, lugar: r.name, valor: r.c.v, ic95_inf: r.c.lo ?? null, ic95_sup: r.c.hi ?? null, n: r.c.n ?? null, sello: r.c.g ?? null }));
  const file = name ?? title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '_').toLowerCase();

  if (!ok.length) return <p class="r-src">Sin datos publicables para este mapa.</p>;
  return (
    <div>
      <div class="r-map">
        <div>
          <svg ref={svg} viewBox={map.box} role="group" aria-label={title}>
            <defs>
              <pattern id="nodata" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--nodata)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--rule)" stroke-width="1.6" /></pattern>
              <clipPath id="metro-clip"><rect x={I.x} y={I.y} width={I.s} height={I.s} /></clipPath>
            </defs>
            <g>{map.paths.map(shape)}</g>
            <path class="r-edge" d={map.outline} />
            <rect class="r-inset" x={I.x} y={I.y} width={I.s} height={I.s} />
            <g class="r-metro" clip-path="url(#metro-clip)">{map.inset.map(shape)}<path class="r-edge" d={map.insetOutline} /></g>
            <text class="r-inset-t" x={I.x} y={I.y - 8}>{insetLabel}</text>
          </svg>
          <div class="r-scale" aria-hidden="true">{cls.fills.map((f, i) => <span><i style={`background:${f}`} />{fmtUnit(cls.starts[i], unit)}</span>)}</div>
          <p class="r-src">{scale === 'seq' ? 'Cada tono empieza en el valor indicado. Más oscuro: valor más alto.' : 'Cada tono empieza en el valor indicado. Un color para los valores negativos y otro para los positivos.'}{missing > 0 && <> <span class="r-keys" style="display:inline-flex;margin:0 0 0 6px"><span><i class="h" />{missing} {placeWord[missing > 1 ? 1 : 0]} sin dato publicable</span></span></>}</p>
        </div>
        {ranking && <div>
          <p class="r-rank-t">Más alto</p><ul class="r-rank">{sorted.slice(0, 5).map(item)}</ul>
          <p class="r-rank-t">Más bajo</p><ul class="r-rank">{sorted.slice(-5).map(item)}</ul>
        </div>}
      </div>
      {ranking && <details class="r-details"><summary>Ver los {sorted.length} {placeWord[1]} con dato</summary><ul class="r-rank">{sorted.map(item)}</ul></details>}
      <ExportBar svgRef={svg} rows={exportRows} name={file} table={false} />
    </div>
  );
}
