import { useEffect, useRef, useState } from 'preact/hooks';
import { onThemeChange } from './theme';
import { getJson } from './fetch';

/** Counter that changes with the theme; put it in the dependencies of the drawing effect. */
export function useThemeTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => onThemeChange(() => setTick(t => t + 1)), []);
  return tick;
}

/** Width of a container, tracked with ResizeObserver, so charts are drawn at their real size. */
export function useWidth<T extends HTMLElement>(initial = 720): [{ current: T | null }, number] {
  const ref = useRef<T>(null); const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => { const next = Math.round(el.clientWidth); if (next > 0) setW(next); };
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Remote JSON with loading and error state. A null `url` requests nothing. */
export function useJson<T = any>(url: string | null): { data: T | null; error: boolean } {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState(false);
  useEffect(() => { if (!url) return; let live = true; getJson<T>(url).then(d => live && setData(d)).catch(e => { console.error(e); if (live) setError(true); }); return () => { live = false; }; }, [url]);
  return { data, error };
}

/** Atlas regions and dimensions: from props when given, otherwise fetched once from `src`. */
export function useAtlasData<R, D>(regions: R[] | undefined, dims: D[] | undefined, src: string): { regions: R[] | null; dims: D[] | null; error: boolean } {
  const { data, error } = useJson<{ regions: R[]; dims: D[] }>(regions && dims ? null : src);
  return { regions: regions ?? data?.regions ?? null, dims: dims ?? data?.dims ?? null, error };
}

export const NS_TITLE = 'Brecha no concluyente: el intervalo de confianza de 95% incluye la ausencia de brecha.';
/** Mark for gaps whose confidence interval includes no gap. */
export function NsMark({ compact = false }: { compact?: boolean }) {
  return <span class="nsmark" title={NS_TITLE}>{compact ? <><span aria-hidden="true">n.c.</span><span class="sr-only">brecha no concluyente</span></> : 'no concluyente'}</span>;
}

export function LoadState({ error }: { error: boolean }) {
  return error
    ? <p class="small load-error" role="alert">No se pudieron cargar los datos de este gráfico. Recarga la página o descárgalos desde <a href="/datos/">Datos</a>.</p>
    : <p class="small muted" role="status">Cargando datos…</p>;
}
