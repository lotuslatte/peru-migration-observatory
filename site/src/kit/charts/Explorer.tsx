import { useEffect, useState } from 'preact/hooks';
import LineChart, { type Cell, type Series } from './LineChart';
import { useJson, LoadState } from './lib/hooks';
import { fmtUnit } from './lib/format';
import { toCSV, copyText } from './lib/export';

interface Ind { id: string; name: string; unit: string }
interface Break { year: number; label_es: string; indicators: string[] }
interface SeriesFile {
  years: number[]; national: Cell[];
  domains: Record<string, { label: string; groups: { key: string; label: string; cells: Cell[] }[] }>;
  dept: Record<string, { name: string; cells: Cell[] }>;
}
type State = { ind: string; g: string; dept: string; a: number; b: number };

const GROUPS: [string, string][] = [['national', 'todo el Perú'], ['sex', 'por sexo'], ['area', 'por área'], ['region_nat', 'por región natural'], ['age4', 'por edad'], ['educ4', 'por educación'], ['lengua3', 'por lengua'], ['etnia6', 'por etnia'], ['dept', 'un departamento']];

/** Query builder written as a sentence: indicator, group, place and years. The selection lives in the URL. */
export default function Explorer({ indicators, regions, years, breaks, seriesBase, examples, start, filePrefix = 'obs', nationalLabel = 'Perú' }: {
  indicators: Ind[]; regions: { id: string; name: string }[]; years: number[]; breaks: Break[]; seriesBase: string;
  examples: [string, Partial<State>][]; start: Pick<State, 'ind' | 'g' | 'dept'>; filePrefix?: string; nationalLabel?: string;
}) {
  const [S, setS] = useState<State>({ ...start, a: years[0], b: years[years.length - 1] });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search), n: Partial<State> = {};
    if (indicators.some(i => i.id === q.get('i'))) n.ind = q.get('i')!;
    if (GROUPS.some(g => g[0] === q.get('g'))) n.g = q.get('g')!;
    if (regions.some(r => r.id === q.get('d'))) n.dept = q.get('d')!;
    if (years.includes(Number(q.get('a')))) n.a = Number(q.get('a'));
    if (years.includes(Number(q.get('b')))) n.b = Number(q.get('b'));
    setS(s => ({ ...s, ...n })); setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams({ i: S.ind, g: S.g, a: String(S.a), b: String(S.b) }); if (S.g === 'dept') q.set('d', S.dept);
    history.replaceState(null, '', '?' + q);
  }, [S, ready]);

  const { data: D, error } = useJson<SeriesFile>(ready ? `${seriesBase}${S.ind}.json` : null);
  const loaded = D && (D as any).id === S.ind ? D : null;
  const ind = indicators.find(i => i.id === S.ind)!;
  const set = (patch: Partial<State>) => setS(s => ({ ...s, ...patch }));
  const sel = (label: string, value: string | number, opts: [string | number, string, boolean?][], on: (v: string) => void) =>
    <select aria-label={label} value={value} onChange={e => on((e.target as HTMLSelectElement).value)}>{opts.map(([v, l, off]) => <option value={v} disabled={off}>{l}</option>)}</select>;

  const idx = years.map((y, i) => [y, i]).filter(([y]) => y >= S.a && y <= S.b).map(x => x[1]);
  const yrs = idx.map(i => years[i]);
  const pick = (cells: Cell[]) => idx.map(i => cells[i] ?? { v: null });
  const available = (g: string) => !loaded || g === 'national' || (g === 'dept' ? Object.keys(loaded.dept).length > 0 : !!loaded.domains[g]?.groups.some(x => x.cells.some(c => c.v != null)));
  const g = available(S.g) ? S.g : 'national';

  let series: Series[] = [];
  if (loaded) {
    const nat: Series = { label: nationalLabel, cells: pick(loaded.national) };
    if (g === 'national') series = [{ ...nat, color: 'var(--accent)' }];
    else if (g === 'dept') series = [{ label: loaded.dept[S.dept]?.name ?? S.dept, cells: pick(loaded.dept[S.dept]?.cells ?? []), color: 'var(--accent)' }, { ...nat, color: 'var(--ink)' }];
    else series = loaded.domains[g].groups.map(x => ({ label: x.label, cells: pick(x.cells) })).filter(s => s.cells.some(c => c.v != null));
  }
  const brk = breaks.find(b => b.indicators.includes(S.ind));
  const crosses = brk && S.a < brk.year && S.b >= brk.year;
  const lastY = yrs[yrs.length - 1];
  const ends = series.map(s => ({ label: s.label, v: s.cells[s.cells.length - 1]?.v })).filter(e => e.v != null).sort((x, y) => y.v! - x.v!);
  const csv = () => series.flatMap(s => s.cells.map((c, i) => ({ indicador: S.ind, grupo: s.label, anio: yrs[i], valor: c.v, error_estandar: c.se ?? null, ic95_inf: c.lo ?? null, ic95_sup: c.hi ?? null, n: c.n ?? null, sello: c.g ?? null })));

  return (
    <>
      <div class="r-q">
        Muéstrame {sel('Indicador', S.ind, indicators.map(i => [i.id, i.name.toLowerCase()]), v => set({ ind: v }))}{' '}
        {sel('Grupo', g, GROUPS.map(([k, l]) => [k, l, !available(k)]), v => set({ g: v }))}{' '}
        {g === 'dept' && <>{sel('Departamento', S.dept, regions.map(r => [r.id, r.name]), v => set({ dept: v }))}{' '}</>}
        de {sel('Desde', S.a, years.filter(y => y < S.b).map(y => [y, String(y)]), v => set({ a: Number(v) }))} a {sel('Hasta', S.b, years.filter(y => y > S.a).map(y => [y, String(y)]), v => set({ b: Number(v) }))}
      </div>
      {!loaded ? <LoadState error={error} /> : <>
        <p class="r-ans" aria-live="polite">{!ends.length ? 'Sin datos publicables para esta selección.' : ends.length === 1
          ? <><b>{fmtUnit(ends[0].v, ind.unit)}</b> en {lastY}</>
          : <><b>{fmtUnit(ends[0].v, ind.unit)}</b> en {ends[0].label} y <b>{fmtUnit(ends[ends.length - 1].v, ind.unit)}</b> en {ends[ends.length - 1].label}, {lastY}</>}</p>
        <p class="r-src">ENAHO, INEI. <a href={`/indicadores/${S.ind}/`}>{ind.name}: cómo se mide</a>.</p>
        {crosses && <p class="r-break">{brk!.label_es}</p>}
        <LineChart years={yrs} series={series} unit={ind.unit} title={`${ind.name}, ${GROUPS.find(x => x[0] === g)![1]}`} name={`${filePrefix}_${S.ind}_${g}`} breakYear={crosses ? brk!.year : undefined} band={series.length === 1} exportBar={false} />
        <div class="r-scroll" style="margin-top:32px"><table class="r-table"><thead><tr><th scope="col">Grupo</th>{yrs.map(y => <th scope="col">{y}</th>)}</tr></thead>
          <tbody>{series.map(s => <tr><td>{s.label}</td>{s.cells.map(c => <td>{c.v == null ? '' : fmtUnit(c.v, ind.unit)}{c.g === 'B' && <span class="r-grade"> B</span>}</td>)}</tr>)}</tbody></table></div>
        <div class="r-actions">
          <button type="button" class="r-btn" onClick={() => toCSV(csv(), `${filePrefix}_${S.ind}_${g}.csv`)}>Descargar CSV</button>
          <button type="button" class="r-btn" onClick={e => copyText(e.currentTarget as HTMLElement, location.href, 'Enlace copiado')}>Copiar enlace</button>
        </div>
        <p class="r-src">Celda vacía: muestra insuficiente. B: estimación menos precisa. El CSV incluye error estándar, intervalo, n y sello.</p>
      </>}
      <div class="r-try">Prueba: {examples.map(([label, patch]) => <button type="button" onClick={() => set(patch)}>{label}</button>)}</div>
    </>
  );
}
