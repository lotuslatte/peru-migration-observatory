// Sparkline mínima para fichas: últimos 11 años, último punto resaltado, sin ejes.
export default function Sparkline({ cells, w = 120, h = 28, color = 'var(--formal)' }: { cells: { v: number | null }[]; w?: number; h?: number; color?: string }) {
  const pts = cells.map((c, i) => ({ i, v: c?.v })).filter(p => p.v != null) as { i: number; v: number }[];
  if (pts.length < 2) return null;
  const xs = (i: number) => 2 + (i / (cells.length - 1)) * (w - 4);
  const min = Math.min(...pts.map(p => p.v)), max = Math.max(...pts.map(p => p.v)); const ys = (v: number) => max === min ? h / 2 : h - 3 - ((v - min) / (max - min)) * (h - 6);
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${xs(p.i).toFixed(1)},${ys(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (<svg class="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><path d={d} fill="none" stroke={color} stroke-width="1.6" /><circle cx={xs(last.i)} cy={ys(last.v)} r="2.6" fill={color} /></svg>);
}
