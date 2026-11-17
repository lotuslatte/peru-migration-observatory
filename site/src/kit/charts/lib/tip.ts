// One tooltip for every chart. Content is set as text nodes, never as HTML.
let node: HTMLDivElement | null = null;
function el() {
  if (!node) { node = document.createElement('div'); node.className = 'tip'; node.setAttribute('role', 'status'); node.hidden = true; document.body.append(node); }
  return node;
}
/** Show the tooltip near a viewport point. The first line is the heading. */
export function showTip(x: number, y: number, lines: string[]) {
  const t = el(); t.replaceChildren();
  lines.forEach((line, i) => { const d = document.createElement(i === 0 ? 'strong' : 'div'); d.textContent = line; if (i === 0) d.style.display = 'block'; t.append(d); });
  t.hidden = false;
  const left = Math.min(Math.max(8, x + 14), innerWidth - t.offsetWidth - 8);
  const top = y - t.offsetHeight - 12 < 8 ? y + 18 : y - t.offsetHeight - 12;
  t.style.left = left + 'px'; t.style.top = top + 'px';
}
/** Show the tooltip above an element (keyboard focus has no pointer position). */
export function showTipAt(target: Element, lines: string[]) {
  const r = target.getBoundingClientRect();
  showTip(r.left + r.width / 2 - 14, r.top, lines);
}
export function hideTip() { if (node) node.hidden = true; }
