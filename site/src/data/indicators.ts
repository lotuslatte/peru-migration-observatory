// Indicators with an annual national series. Short names and plain-language wording live here;
// labels, units and estimates come from the pipeline (meta.json, trends.json).
import { loadMeta, loadTrends, loadAtlas } from './loaders';

export interface Ind { id: string; name: string; group: string; def: string; unit: string; say?: (v: number) => string; scale?: 'seq' | 'div' }

const LOCAL: Omit<Ind, 'def' | 'unit'>[] = [
  { id: 'mig5_cross', name: 'Llegó de otro departamento', group: 'Migración reciente', say: v => `De cada 100 personas de 5 años a más, ${v.toFixed(1)} vivían en otro departamento hace cinco años.` },
  { id: 'mig5_any', name: 'Cambió de distrito', group: 'Migración reciente', say: v => `De cada 100 personas de 5 años a más, ${v.toFixed(1)} vivían en otro distrito hace cinco años.` },
  { id: 'mig5_intra', name: 'Se mudó dentro del departamento', group: 'Migración reciente' },
  { id: 'mig5_intl', name: 'Llegó del extranjero', group: 'Migración reciente' },
  { id: 'mig5_ven', name: 'Llegó de Venezuela', group: 'Migración reciente' },
  { id: 'life_cross', name: 'Nacidos en otro departamento', group: 'Migración de toda la vida', say: v => `De cada 100 personas, ${Math.round(v)} viven en un departamento distinto de aquel donde residía su madre cuando nacieron.` },
  { id: 'life_abroad', name: 'Nacidos en el extranjero', group: 'Migración de toda la vida' },
  { id: 'gap_inf_mig', name: 'Brecha de informalidad', group: 'Migrantes y trabajo', scale: 'div', say: v => `La informalidad de los migrantes recientes ${v >= 0 ? 'supera' : 'queda por debajo de'} la de quienes no migraron en ${Math.abs(v).toFixed(1)} puntos.` },
  { id: 'gap_ur_mig', name: 'Brecha de desempleo', group: 'Migrantes y trabajo', scale: 'div' },
  { id: 'gap_inc_mig', name: 'Razón de ingresos', group: 'Migrantes y trabajo', say: v => `Por cada sol que gana quien no migró, el migrante reciente gana ${v.toFixed(2)} (ingreso mediano).` },
];

const meta = loadMeta(); const tr = loadTrends();
export const YEAR: number = meta.headline_year;
export const YEARS: number[] = tr.years;
export const GROUPS = [...new Set(LOCAL.map(l => l.group))];
export const INDICATORS: Ind[] = LOCAL.filter(l => tr.series.national[l.id]).map(l => ({ ...l, def: meta.indicators[l.id]?.label_es ?? l.name, unit: meta.indicators[l.id]?.unit ?? '%' }));

/** Suppressed cells never reach the page with a value. */
export const slim = (c: any) => !c || c.g === 'S' || c.v == null ? { v: null, g: 'S', n: c?.n ?? 0 } : { v: c.v, g: c.g, n: c.n, se: c.se, lo: c.lo, hi: c.hi };

const DOMAINS = ['sex', 'area', 'region_nat', 'age5', 'educ4', 'lengua3'];
export const depts = () => loadAtlas().regions.filter(r => r.id.length === 2).map(r => ({ id: r.id, name: r.name }));

/** Everything an indicator page needs: national series, latest values by group and by department. */
export function indicatorData(id: string) {
  const ind = INDICATORS.find(i => i.id === id)!;
  const national = tr.series.national[id].map(slim);
  const domains: Record<string, { label: string; groups: any[] }> = {};
  for (const d of DOMAINS) {
    const s = tr.series[d]?.[id]; if (!s) continue;
    const groups = Object.entries<any[]>(s).map(([k, cells]) => ({ label: tr.labels[d]?.[k] ?? k, ...slim(cells.at(-1)) }));
    if (groups.some(g => g.v != null)) domains[d] = { label: meta.domains[d]?.label_es ?? d, groups };
  }
  const hasDept = Object.values<any>(tr.series.dept).some(x => x[id]);
  const regions = hasDept ? depts().map(r => ({ ...r, c: slim(tr.series.dept[r.id]?.[id]?.at(-1)) })) : null;
  return { ind, national, domains, regions, hasDept };
}

/** Annual series by group and department, served as /data/series/<id>.json. */
export function seriesFile(id: string) {
  const ind = INDICATORS.find(i => i.id === id)!;
  const domains: Record<string, any> = {};
  for (const d of DOMAINS) {
    const s = tr.series[d]?.[id]; if (!s) continue;
    domains[d] = { label: meta.domains[d]?.label_es ?? d, groups: Object.entries<any[]>(s).map(([k, cells]) => ({ key: k, label: tr.labels[d]?.[k] ?? k, cells: cells.map(slim) })) };
  }
  const dept: Record<string, any> = {};
  for (const r of depts()) { const cells = tr.series.dept[r.id]?.[id]; if (cells) dept[r.id] = { name: r.name, cells: cells.map(slim) }; }
  return { id, name: ind.name, unit: ind.unit, years: YEARS, national: tr.series.national[id].map(slim), domains, dept };
}
