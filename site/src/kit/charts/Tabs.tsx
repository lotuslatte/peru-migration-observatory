import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';

/** Tabs with the full ARIA pattern: roving focus, arrow keys, Home and End, and a labelled panel. */
export default function Tabs({ tabs, current, onChange, label, idBase = 'tab', children }: { tabs: [string, string][]; current: string; onChange: (id: string) => void; label: string; idBase?: string; children: ComponentChildren }) {
  const list = useRef<HTMLDivElement>(null);
  const move = (e: KeyboardEvent) => {
    const i = tabs.findIndex(t => t[0] === current); let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1; else return;
    e.preventDefault(); onChange(tabs[n][0]);
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`#${idBase}-${tabs[n][0]}`)?.focus());
  };
  return (
    <>
      <div class="tabs" role="tablist" aria-label={label} ref={list} onKeyDown={move}>
        {tabs.map(([id, text]) => <button type="button" role="tab" id={`${idBase}-${id}`} aria-selected={id === current} aria-controls={`${idBase}-panel`} tabIndex={id === current ? 0 : -1} onClick={() => onChange(id)}>{text}</button>)}
      </div>
      <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-${current}`} tabIndex={0}>{children}</div>
    </>
  );
}

/** Row of toggle chips for picking one option. */
export function Chips<T extends string | number>({ items, current, onChange, label }: { items: [T, string][]; current: T; onChange: (v: T) => void; label: string }) {
  return <div class="chips" role="group" aria-label={label}>{items.map(([k, text]) => <button type="button" aria-pressed={k === current} onClick={() => onChange(k)}>{text}</button>)}</div>;
}
