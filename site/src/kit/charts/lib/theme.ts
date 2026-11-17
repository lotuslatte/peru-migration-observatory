// Charts read colours from CSS custom properties, so themes and the per-site accent apply without code changes.
const isBrowser = typeof window !== 'undefined' && typeof getComputedStyle === 'function';
export const cssVar = (name: string) => isBrowser ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '';
export const seq = () => [1, 2, 3, 4, 5, 6].map(i => cssVar(`--seq-${i}`));
export const div = () => [1, 2, 3, 4, 5, 6, 7].map(i => cssVar(`--div-${i}`));
export const cat = () => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => cssVar(`--cat-${i}`));
/** Series colours as CSS variable references, usable directly in SVG attributes. */
export const CAT_VARS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `var(--cat-${i})`);
export const onThemeChange = (cb: () => void) => {
  if (!isBrowser) return () => {};
  const mo = new MutationObserver(cb); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
};
