import { useEffect, useState, useRef } from 'preact/hooks';
interface Item { label: string; href: string; group: string }
export default function CommandPalette({ regions }: { regions: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const items: Item[] = [
    { label: 'Inicio', href: '/', group: 'Páginas' }, { label: 'Atlas de movilidad', href: '/atlas/', group: 'Páginas' }, { label: 'Flujos origen–destino', href: '/flujos/', group: 'Páginas' },
    { label: 'Población venezolana', href: '/venezuela/', group: 'Páginas' }, { label: 'Clima y migración', href: '/clima/', group: 'Páginas' },
    { label: 'Historias', href: '/historias/', group: 'Páginas' }, { label: 'Compendio estadístico', href: '/compendio/', group: 'Páginas' },
    { label: 'Metodología', href: '/acerca/metodologia/', group: 'Páginas' },
    { label: 'Descargar datos', href: '/datos/', group: 'Páginas' }, { label: 'Acerca del Observatorio', href: '/acerca/', group: 'Páginas' },
    ...regions.map(r => ({ label: r.name, href: `/atlas/${r.id}/`, group: 'Departamentos' })),
  ];
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const res = items.filter(it => norm(it.label).includes(norm(q))).slice(0, 12);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.querySelectorAll('[data-open-palette]').forEach(b => b.addEventListener('click', () => setOpen(true)));
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 10); } }, [open]);
  if (!open) return null;
  return (
    <div class="cp-back" onClick={() => setOpen(false)}>
      <div class="cp" role="dialog" aria-label="Buscar" onClick={e => e.stopPropagation()}>
        <input ref={input} type="search" placeholder="Buscar departamento, página…" value={q} onInput={e => { setQ((e.target as HTMLInputElement).value); setI(0); }}
          onKeyDown={e => { if (e.key === 'ArrowDown') setI(x => Math.min(x + 1, res.length - 1)); if (e.key === 'ArrowUp') setI(x => Math.max(x - 1, 0)); if (e.key === 'Enter' && res[i]) location.href = res[i].href; }} />
        <ul>{res.map((r, k) => <li class={k === i ? 'sel' : ''}><a href={r.href}><span class="g">{r.group}</span>{r.label}</a></li>)}</ul>
      </div>
      <style>{`.cp-back{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding-top:12vh}
        .cp{width:min(560px,92vw);background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);overflow:hidden}
        .cp input{width:100%;border:0;border-bottom:1px solid var(--line);border-radius:0;padding:14px 16px;font-size:1rem}
        .cp ul{list-style:none;margin:0;padding:6px;max-height:50vh;overflow:auto}.cp li a{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:8px;text-decoration:none;color:var(--ink)}
        .cp li.sel a,.cp li a:hover{background:var(--panel-2)}.cp .g{font-family:var(--font-mono);font-size:.68rem;color:var(--muted);min-width:96px}`}</style>
    </div>
  );
}
