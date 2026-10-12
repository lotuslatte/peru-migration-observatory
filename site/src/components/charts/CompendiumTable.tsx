import { useEffect, useMemo, useState } from 'preact/hooks';
import * as d3 from 'd3';
import { toCSV } from './lib/export';
import { fmtNum } from './lib/format';
interface Props { file: string; title: string; id: string }
type Row = Record<string, any>;
export default function CompendiumTable({ file, title, id }: Props) {
  const [rows, setRows] = useState<Row[]>([]); const [q, setQ] = useState(''); const [sort, setSort] = useState<{ k: string; d: 1 | -1 }>({ k: '', d: 1 }); const [ci, setCi] = useState(false); const [year, setYear] = useState<string>('');
  useEffect(() => { fetch('/data/' + file).then(r => r.text()).then(t => setRows(d3.csvParse(t) as any)); }, [file]);
  const tidy = rows.length && 'row_label' in rows[0];
  const years = useMemo(() => tidy ? Array.from(new Set(rows.map(r => r.year))).sort() : [], [rows]);
  useEffect(() => { if (years.length && !year) setYear(years[years.length - 1]); }, [years]);
  // pivot tidy rows → row_label × col_label
  const view = useMemo(() => {
    if (!tidy) return { cols: rows.length ? Object.keys(rows[0]) : [], data: rows };
    const sub = rows.filter(r => !year || r.year === year);
    const cols = Array.from(new Set(sub.map(r => r.col_label)));
    const map = new Map<string, Row>();
    sub.forEach(r => { const k = r.domain + '|' + r.row_key; if (!map.has(k)) map.set(k, { Dominio: r.domain, Fila: r.row_label }); const o = map.get(k)!;
      o[r.col_label] = r.estimate === '' ? null : +r.estimate; o[r.col_label + ' (grado)'] = r.grade; o[r.col_label + ' (IC)'] = r.ci_lo === '' ? '' : `${fmtNum(+r.ci_lo, 1)}–${fmtNum(+r.ci_hi, 1)}`; o[r.col_label + ' (n)'] = r.n; });
    return { cols: ['Dominio', 'Fila', ...cols], data: Array.from(map.values()) };
  }, [rows, year]);
  const filtered = useMemo(() => { const n = q.toLowerCase(); let d = view.data.filter(r => !n || Object.values(r).some(v => String(v).toLowerCase().includes(n)));
    if (sort.k) d = [...d].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * sort.d; }); return d; }, [view, q, sort]);
  const hdr = (k: string) => setSort(s => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : 1 }));
  return (<div class="ctab">
    <div class="toolbar"><input type="search" placeholder="Filtrar filas…" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
      {years.length > 1 && <select value={year} onChange={e => setYear((e.target as HTMLSelectElement).value)}>{years.map(y => <option value={y}>{y}</option>)}</select>}
      {tidy && <label class="small muted"><input type="checkbox" checked={ci} onChange={e => setCi((e.target as HTMLInputElement).checked)} /> IC 95 % y n</label>}
      <span style="flex:1" /><button class="btn" onClick={() => toCSV(rows, `${id}.csv`)}>CSV (tidy)</button><a class="btn" href={'/data/' + file} download>Archivo</a></div>
    <div class="scroll-x" style="max-height:70vh;overflow:auto"><table class="data"><thead><tr>{view.cols.map(c => <th onClick={() => hdr(c)}>{c}{sort.k === c ? (sort.d === 1 ? ' ▲' : ' ▼') : ''}</th>)}</tr></thead>
      <tbody>{filtered.map(r => <tr>{view.cols.map((c, i) => { const v = r[c]; const g = r[c + ' (grado)'];
        if (i < 2 || !tidy) return <td>{v == null || v === '' ? '—' : typeof v === 'number' ? fmtNum(v, Number.isInteger(v) ? 0 : 1) : v}</td>;
        return <td>{g === 'S' || v == null ? <span class="muted">—</span> : <>{fmtNum(v, 1)} <span class={`badge compact ${g}`}></span>{ci && <div class="small muted mono">{r[c + ' (IC)']} · n={r[c + ' (n)']}</div>}</>}</td>; })}</tr>)}</tbody></table></div>
    <p class="small muted">{filtered.length} filas · {title}. Grados: A publicable (RSE&lt;15 %), B revisar (15–30 %), S suprimido (≥30 % o n&lt;30).</p>
  </div>);
}
