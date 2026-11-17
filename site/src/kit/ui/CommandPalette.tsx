import { useEffect, useState, useRef } from 'preact/hooks';

export interface PaletteItem { label: string; href: string; group: string; hint?: string }

/** Site search: pages, indicators, places and glossary terms. Opens with Ctrl+K or any [data-open-palette] element.
 *  The index is fetched from `src` the first time the palette opens, so pages do not carry it. */
export default function CommandPalette({ src, placeholder = 'Buscar un indicador, un lugar o una página' }: { src: string; placeholder?: string }) {
  const [items, setItems] = useState<PaletteItem[]>([]); const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null); const box = useRef<HTMLDivElement>(null); const opener = useRef<HTMLElement | null>(null);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = norm(q).split(/\s+/).filter(Boolean);
  const res = items.filter(it => { const t = norm(it.label + ' ' + (it.hint ?? '') + ' ' + it.group); return words.every(w => t.includes(w)); }).slice(0, 14);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    const triggers = Array.from(document.querySelectorAll('[data-open-palette]'));
    triggers.forEach(b => b.addEventListener('click', onOpen));
    return () => { window.removeEventListener('keydown', onKey); triggers.forEach(b => b.removeEventListener('click', onOpen)); };
  }, []);
  useEffect(() => { if (open && !items.length && !failed) fetch(src).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(setItems).catch(() => setFailed(true)); }, [open]);
  // Remember who had the focus and give it back on close.
  useEffect(() => { if (open) { opener.current = document.activeElement as HTMLElement; setQ(''); setI(0); setTimeout(() => input.current?.focus(), 10); } else { opener.current?.focus?.(); opener.current = null; } }, [open]);
  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !box.current) return;
    const f = Array.from(box.current.querySelectorAll<HTMLElement>('input, a[href]')); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  if (!open) return null;
  return (
    <div class="cp-back" onClick={() => setOpen(false)}>
      <div class="cp" ref={box} role="dialog" aria-modal="true" aria-label="Buscar" onClick={e => e.stopPropagation()} onKeyDown={trap}>
        <input ref={input} type="search" placeholder={placeholder} aria-label={placeholder} value={q} onInput={e => { setQ((e.target as HTMLInputElement).value); setI(0); }}
          onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(x => Math.min(x + 1, res.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(x - 1, 0)); } if (e.key === 'Enter' && res[i]) location.href = res[i].href; }} />
        {res.length
          ? <ul>{res.map((r, k) => <li class={k === i ? 'sel' : ''}><a href={r.href} aria-current={k === i ? 'true' : undefined}><span class="l">{r.label}</span><span class="g">{r.group}</span></a></li>)}</ul>
          : <p class="none" role="status">{failed ? 'No se pudo cargar el buscador. Recarga la página.' : items.length ? `Nada coincide con «${q}».` : 'Cargando…'}</p>}
      </div>
      <style>{`.cp-back{position:fixed;inset:0;background:color-mix(in srgb,var(--ink) 35%,transparent);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding-top:12vh}
        .cp{width:min(600px,92vw);background:var(--bg);border:1px solid var(--ink);border-radius:6px;overflow:hidden}
        .cp input{width:100%;border:0;border-bottom:1px solid var(--line);border-radius:0;padding:16px 18px;font-size:1.0625rem;background:var(--bg)}
        .cp input:focus-visible{outline:0}
        .cp ul{list-style:none;margin:0;padding:6px;max-height:54vh;overflow:auto}
        .cp li a{display:flex;gap:12px;align-items:baseline;justify-content:space-between;padding:9px 12px;border-radius:4px;text-decoration:none;color:var(--ink)}
        .cp li.sel a,.cp li a:hover{background:var(--panel-2)}
        .cp .g{font-size:.8125rem;color:var(--muted);flex:none}
        .cp .none{margin:0;padding:16px 18px;color:var(--muted)}`}</style>
    </div>
  );
}
