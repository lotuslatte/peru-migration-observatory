const FALLBACK: Record<string, string> = {
  '--seq-1': '#f3e6e7', '--seq-2': '#e3b9be', '--seq-3': '#d08a92', '--seq-4': '#bb5c68', '--seq-5': '#9b2f3e', '--seq-6': '#6d1b28',
  '--cat-1': '#b23a48', '--cat-2': '#1f5f8b', '--cat-3': '#d9a441', '--cat-4': '#2f7d5a', '--cat-5': '#7a4e9a', '--cat-6': '#6b7180', '--cat-7': '#c8743a', '--cat-8': '#3aa6a0', '--cat-9': '#8c6d3f',
};
const isBrowser = typeof window !== 'undefined' && typeof getComputedStyle === 'function';
export const cssVar = (name: string) => isBrowser ? (getComputedStyle(document.documentElement).getPropertyValue(name).trim() || FALLBACK[name] || '') : (FALLBACK[name] || '');
export const seq = () => [1, 2, 3, 4, 5, 6].map(i => cssVar(`--seq-${i}`));
export const cat = () => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => cssVar(`--cat-${i}`));
export const onThemeChange = (cb: () => void) => {
  if (!isBrowser) return () => {};
  const mo = new MutationObserver(cb); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', cb);
  return () => { mo.disconnect(); mq.removeEventListener('change', cb); };
};
