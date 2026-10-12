import { toSVG, toPNG, toCSV } from './export';
export default function ExportBar({ svgRef, rows, name }: { svgRef: { current: SVGSVGElement | null }; rows?: () => Record<string, any>[]; name: string }) {
  return (
    <div class="toolbar" style="justify-content:flex-end;gap:6px;margin-top:8px">
      {rows && <button class="btn small" onClick={() => toCSV(rows(), name + '.csv')}>CSV</button>}
      <button class="btn small" onClick={() => svgRef.current && toSVG(svgRef.current, name + '.svg')}>SVG</button>
      <button class="btn small" onClick={() => svgRef.current && toPNG(svgRef.current, name + '.png')}>PNG</button>
    </div>
  );
}
