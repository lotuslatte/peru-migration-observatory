// Exportación de gráficos: SVG (serializado con estilos calculados), PNG (2x) y CSV.
function inlineStyles(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = svg.querySelectorAll<SVGElement>('*'); const dst = clone.querySelectorAll<SVGElement>('*');
  const props = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'opacity', 'text-anchor', 'stroke-dasharray', 'dominant-baseline'];
  src.forEach((el, i) => { const cs = getComputedStyle(el); props.forEach(p => { const v = cs.getPropertyValue(p); if (v) dst[i].style.setProperty(p, v); }); });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const bg = getComputedStyle(document.body).backgroundColor;
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%'); rect.setAttribute('height', '100%'); rect.setAttribute('fill', bg);
  clone.insertBefore(rect, clone.firstChild);
  return clone;
}
function download(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function toSVG(svg: SVGSVGElement, name = 'grafico.svg') {
  const s = new XMLSerializer().serializeToString(inlineStyles(svg));
  download(new Blob([s], { type: 'image/svg+xml' }), name);
}
export function toPNG(svg: SVGSVGElement, name = 'grafico.png', scale = 2) {
  const s = new XMLSerializer().serializeToString(inlineStyles(svg));
  const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
  const img = new Image();
  const w = svg.viewBox.baseVal.width || svg.clientWidth, h = svg.viewBox.baseVal.height || svg.clientHeight;
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
    const ctx = c.getContext('2d')!; ctx.scale(scale, scale); ctx.drawImage(img, 0, 0, w, h);
    c.toBlob(b => b && download(b, name)); URL.revokeObjectURL(url);
  };
  img.src = url;
}
export function toCSV(rows: Record<string, any>[], name = 'datos.csv') {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const s = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  download(new Blob(['﻿' + s], { type: 'text/csv;charset=utf-8' }), name);
}
