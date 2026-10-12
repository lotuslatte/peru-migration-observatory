import { useEffect, useState } from 'preact/hooks';
// 100 personas de 5+ años: no se movieron / se mudaron dentro de su departamento / llegaron de otro departamento o del extranjero
export default function Waffle({ intra, cross, intl }: { intra: number; cross: number; intl: number }) {
  const [shown, setShown] = useState(0);
  const a = Math.round(cross), b = Math.round(intl), c = Math.round(intra);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(100); return; }
    let i = 0; const id = setInterval(() => { i += 3; setShown(Math.min(i, 100)); if (i >= 100) clearInterval(id); }, 18);
    return () => clearInterval(id);
  }, []);
  const cls = (i: number) => i < a ? 'cross' : i < a + b ? 'intl' : i < a + b + c ? 'intra' : 'stay';
  return (
    <figure class="waffle" aria-label={`${a} de cada 100 llegaron de otro departamento, ${b} del extranjero y ${c} se mudaron dentro de su departamento en los últimos cinco años`}>
      <div class="grid" role="img">{Array.from({ length: 100 }, (_, i) => <span class={`p ${cls(i)} ${i < shown ? 'on' : ''}`} style={{ transitionDelay: `${(i % 10) * 12}ms` }} />)}</div>
      <figcaption>De cada <b class="stay">100</b> peruanos, <b class="cross">{a}</b> llegaron de otro departamento, <b class="intl">{b === 0 ? "menos de 1" : b}</b> del extranjero y <b class="intra">{c}</b> se mudaron dentro de su departamento en los últimos cinco años.</figcaption>
      <style>{`.waffle{margin:0}.waffle .grid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px;max-width:340px}
        .waffle .p{aspect-ratio:1;border-radius:50%;background:var(--panel-2);transform:scale(.4);opacity:.2;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .35s}
        .waffle .p.on{transform:scale(1);opacity:1}.waffle .p.cross.on{background:var(--informal)}.waffle .p.intl.on{background:var(--warn)}.waffle .p.intra.on{background:var(--accent-2)}.waffle .p.stay.on{background:var(--panel-2);opacity:.9}
        .waffle figcaption{margin-top:14px;font-family:var(--font-serif);font-size:1.15rem;line-height:1.35;max-width:340px;color:var(--ink-2)}
        .waffle b{font-size:1.5rem;font-weight:500}.waffle b.cross{color:var(--informal)}.waffle b.intl{color:var(--warn)}.waffle b.intra{color:var(--accent-2)}.waffle b.stay{color:var(--muted)}`}</style>
    </figure>
  );
}
