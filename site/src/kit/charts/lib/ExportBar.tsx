import { useState } from 'preact/hooks';
import { toSVG, toPNG, toCSV, copyText } from './export';
import { fmtNum, MISSING } from './format';
const show = (v: any) => v == null || v === '' ? MISSING : typeof v === 'number' ? fmtNum(v, Number.isInteger(v) ? 0 : 2) : String(v);

/** Actions under a chart: its data as a table, CSV, image files and a link to the current view.
 *  `rows` returns the data behind the chart; `table` adds the text alternative. */
export default function ExportBar({ svgRef, rows, name, table = true, link = true }: { svgRef?: { current: SVGSVGElement | null }; rows?: () => Record<string, any>[]; name: string; table?: boolean; link?: boolean }) {
  const [open, setOpen] = useState(false);
  const data = open && rows ? rows() : [];
  return (
    <div class="export">
      {rows && table && <details class="data-table" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Ver los datos en tabla</summary>
        {open && data.length > 0 && <div class="scroll-x" style="max-height:50vh;overflow:auto"><table class="data"><thead><tr>{Object.keys(data[0]).map(c => <th scope="col">{c}</th>)}</tr></thead>
          <tbody>{data.map(r => <tr>{Object.keys(data[0]).map(c => <td>{show(r[c])}</td>)}</tr>)}</tbody></table></div>}</details>}
      <div class="toolbar export-actions">
        <span class="small muted">Descargar</span>
        {rows && <button type="button" class="btn small" onClick={() => toCSV(rows(), name + '.csv')}>CSV</button>}
        {svgRef && <button type="button" class="btn small" onClick={() => svgRef.current && toSVG(svgRef.current, name + '.svg')}>SVG</button>}
        {svgRef && <button type="button" class="btn small" onClick={() => svgRef.current && toPNG(svgRef.current, name + '.png')}>PNG</button>}
        {link && <button type="button" class="btn small" onClick={e => copyText(e.currentTarget as HTMLElement, location.href, 'Enlace copiado')}>Copiar enlace</button>}
      </div>
    </div>
  );
}
