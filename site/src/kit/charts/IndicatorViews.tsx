import { useEffect, useState } from 'preact/hooks';
import LineChart, { type Cell } from './LineChart';
import ChoroMap, { type MapShapes } from './ChoroMap';
import DotRows from './DotRows';
import Tabs, { Chips } from './Tabs';
import { useJson, LoadState } from './lib/hooks';
import { fmtUnit, fmtInt, MISSING } from './lib/format';
import { toCSV } from './lib/export';

interface Break { year: number; label_es: string }
interface DistCat { label: string; cells: Cell[] }
/** Data embedded in an indicator page. */
export interface IndicatorData {
  id: string; name: string; unit: string; type: string; year: number; years: number[]; breaks: Break[];
  national: Cell[] | DistCat[];
  domains: Record<string, { label: string; groups: (Cell & { label: string })[] }>;
  regions: { id: string; name: string; c: Cell }[] | null; map: MapShapes | null;
}
/** Per-year series fetched on demand: `dept[id].cells` follows `years`. */
interface SeriesFile { years: number[]; dept: Record<string, { name: string; cells: Cell[] }> }

const NOTE = 'La barra clara es el intervalo de confianza de 95%. (B) marca una estimación menos precisa.';
const MAX_COMPARE = 5;

/** The interactive part of an indicator page: trend, map by year, groups, department comparison and data. */
export default function IndicatorViews({ data: D, seriesSrc, placeHref = '/atlas/', filePrefix = 'obs', nationalLabel = 'Perú' }: { data: IndicatorData; seriesSrc?: string; placeHref?: string; filePrefix?: string; nationalLabel?: string }) {
  const dist = D.type === 'dist';
  const brk = D.breaks[0];
  const domKeys = Object.keys(D.domains);
  const tabs: [string, string][] = dist
    ? [['reparto', 'Reparto'], ['tendencia', 'Tendencia'], ['datos', 'Datos']]
    : [['tendencia', 'Tendencia'], ...(D.regions ? [['mapa', 'Mapa']] : []), ...(domKeys.length ? [['quienes', 'Quiénes']] : []), ...(D.regions && seriesSrc ? [['comparar', 'Comparar']] : []), ['datos', 'Datos']] as [string, string][];
  const valid = (t: string) => tabs.some(x => x[0] === t);

  const [tab, setTab] = useState(tabs[0][0]);
  const [dom, setDom] = useState(domKeys[0]);
  const [cat, setCat] = useState(0);
  const [yi, setYi] = useState(D.years.length - 1);
  const [picked, setPicked] = useState<string[]>([]);

  // The view lives in the URL: #tab, ?y=<year> for the map and ?c=<ids> for the comparison.
  useEffect(() => {
    const q = new URLSearchParams(location.search), h = location.hash.slice(1);
    if (valid(h)) setTab(h);
    const y = D.years.indexOf(Number(q.get('y'))); if (y >= 0) setYi(y);
    const c = (q.get('c') ?? '').split(',').filter(id => D.regions?.some(r => r.id === id)).slice(0, MAX_COMPARE); if (c.length) setPicked(c);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams();
    if (tab === 'mapa' && yi !== D.years.length - 1) q.set('y', String(D.years[yi]));
    if (tab === 'comparar' && picked.length) q.set('c', picked.join(','));
    const s = q.toString();
    history.replaceState(null, '', `${location.pathname}${s ? '?' + s : ''}#${tab}`);
  }, [tab, yi, picked]);

  const needSeries = !!seriesSrc && (tab === 'comparar' || (tab === 'mapa' && yi !== D.years.length - 1));
  const [wanted, setWanted] = useState(false);
  useEffect(() => { if (needSeries) setWanted(true); }, [needSeries]);
  const { data: S, error } = useJson<SeriesFile>(wanted ? seriesSrc! : null);

  const national = D.national as Cell[], cats = D.national as DistCat[];
  const breakNote = brk && <p class="r-break">{brk.label_es}</p>;
  const yearChips = <Chips label="Año" items={D.years.map((y, k) => [k, String(y)] as [number, string]).slice(-6)} current={yi} onChange={setYi} />;

  let body;
  if (tab === 'tendencia' && !dist) {
    body = <>{breakNote}<LineChart years={D.years} series={[{ label: D.name, cells: national }]} unit={D.unit} title={`${D.name} por año`} name={`${filePrefix}_${D.id}_tendencia`} breakYear={brk?.year} band /></>;
  } else if (tab === 'tendencia') {
    body = <><Chips label="Categoría" items={cats.map((c, k) => [k, c.label] as [number, string])} current={cat} onChange={setCat} />{breakNote}
      <LineChart years={D.years} series={[{ label: cats[cat].label, cells: cats[cat].cells }]} unit={D.unit} title={`${cats[cat].label} por año`} name={`${filePrefix}_${D.id}_tendencia`} breakYear={brk?.year} band />
      <p class="r-src">Porcentaje de los ocupados en la categoría elegida.</p></>;
  } else if (tab === 'mapa' && D.regions && D.map) {
    const latest = yi === D.years.length - 1;
    const rows = latest ? D.regions : S ? D.regions.map(r => ({ ...r, c: S.dept[r.id]?.cells[yi] ?? { v: null, g: 'S' } })) : null;
    body = <>
      <div class="r-ctl"><label>Año<select value={yi} onChange={e => setYi(Number((e.target as HTMLSelectElement).value))}>{D.years.map((y, k) => <option value={k}>{y}</option>)}</select></label></div>
      {brk && D.years[yi] < brk.year && <p class="r-break">{D.years[yi]} es anterior al cambio de método de {brk.year}: no se compara con los años posteriores.</p>}
      {rows ? <ChoroMap map={D.map} rows={rows} unit={D.unit} title={`${D.name} por departamento, ${D.years[yi]}`} name={`${filePrefix}_${D.id}_mapa_${D.years[yi]}`} hrefFor={id => `${placeHref}${id}/`} /> : <LoadState error={error} />}
    </>;
  } else if (tab === 'quienes') {
    const rows = D.domains[dom].groups.map(c => ({ label: c.label, c })).sort((a, b) => (b.c.v ?? -1e9) - (a.c.v ?? -1e9));
    const ref = national[national.length - 1];
    body = <><Chips label="Grupo" items={domKeys.map(k => [k, D.domains[k].label] as [string, string])} current={dom} onChange={setDom} />
      <DotRows rows={rows} unit={D.unit} title={`${D.name} por ${D.domains[dom].label.toLowerCase()}, ${D.year}`} name={`${filePrefix}_${D.id}_${dom}`} reference={ref?.v != null ? { label: nationalLabel, v: ref.v } : undefined} />
      <p class="r-src">{D.year}. {NOTE}</p></>;
  } else if (tab === 'comparar' && D.regions) {
    const rest = D.regions.filter(r => !picked.includes(r.id));
    body = <>
      <div class="r-ctl"><label>Agregar un departamento (hasta {MAX_COMPARE})
        <select value="" disabled={picked.length >= MAX_COMPARE} onChange={e => { const v = (e.target as HTMLSelectElement).value; if (v) setPicked(p => [...p, v]); (e.target as HTMLSelectElement).value = ''; }}>
          <option value="">Elegir…</option>{rest.map(r => <option value={r.id}>{r.name}</option>)}</select></label></div>
      {picked.length > 0 && <div class="chips" role="group" aria-label="Departamentos elegidos">{picked.map(id => <button type="button" aria-pressed="true" title="Quitar" onClick={() => setPicked(p => p.filter(x => x !== id))}>{D.regions!.find(r => r.id === id)!.name} ×</button>)}</div>}
      {breakNote}
      {S ? <LineChart years={D.years} unit={D.unit} title={`${D.name}: ${nationalLabel} y departamentos`} name={`${filePrefix}_${D.id}_comparar`} breakYear={brk?.year}
        series={[{ label: nationalLabel, cells: national, color: 'var(--ink)' }, ...picked.map((id, k) => ({ label: S.dept[id]?.name ?? id, cells: S.dept[id]?.cells ?? [], color: k === 0 ? 'var(--accent)' : `var(--cat-${k + 2})` }))]} />
        : <LoadState error={error} />}
      {!picked.length && <p class="r-src">Elige uno o más departamentos para compararlos con el promedio nacional.</p>}
    </>;
  } else if (tab === 'reparto') {
    body = <>{yearChips}<DotRows rows={cats.map(c => ({ label: c.label, c: c.cells[yi] }))} unit={D.unit} title={`Reparto de los ocupados por categoría, ${D.years[yi]}`} name={`${filePrefix}_${D.id}_reparto_${D.years[yi]}`} />
      <p class="r-src">{D.years[yi]}. Porcentaje de los ocupados. {NOTE}</p></>;
  } else {
    const list: (string | number | Cell)[][] = dist ? cats.flatMap(c => D.years.map((y, i) => [c.label, y, c.cells[i]])) : D.years.map((y, i) => [y, national[i]]);
    const shown = dist ? list.filter(r => r[1] === D.years[yi]) : list;
    const csv = () => list.map(r => { const c = r[r.length - 1] as Cell; return { ...(dist ? { categoria: r[0], anio: r[1] } : { anio: r[0] }), valor: c.v, error_estandar: c.se ?? null, ic95_inf: c.lo ?? null, ic95_sup: c.hi ?? null, n: c.n ?? null, sello: c.g ?? null }; });
    body = <>{dist && yearChips}
      <div class="r-scroll"><table class="r-table"><thead><tr><th scope="col">{dist ? 'Categoría' : 'Año'}</th><th scope="col">Valor</th><th scope="col">Error estándar</th><th scope="col">IC 95%</th><th scope="col">n</th><th scope="col">Sello</th></tr></thead>
        <tbody>{shown.map(r => { const c = r[r.length - 1] as Cell; return <tr><td>{r[0] as string}</td><td>{fmtUnit(c.v, D.unit)}</td><td>{c.se ?? MISSING}</td><td>{c.v == null ? MISSING : `${fmtUnit(c.lo, D.unit)} a ${fmtUnit(c.hi, D.unit)}`}</td><td>{fmtInt(c.n)}</td><td>{c.g}</td></tr>; })}</tbody></table></div>
      <div class="r-actions"><button type="button" class="r-btn" onClick={() => toCSV(csv(), `${filePrefix}_${D.id}.csv`)}>Descargar esta serie (CSV)</button></div>
      <p class="r-src">Serie nacional{dist ? ' de todas las categorías y años' : ''}. El archivo completo del indicador, con grupos y departamentos, está más abajo en «Descargar y citar».</p></>;
  }
  return <Tabs tabs={tabs} current={tab} onChange={setTab} label={`Vistas de ${D.name}`} idBase="vista">{body}</Tabs>;
}
