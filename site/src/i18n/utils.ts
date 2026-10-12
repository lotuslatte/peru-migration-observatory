import es from './es.json';
import en from './en.json';
export type Lang = 'es' | 'en';
const dict = { es, en } as const;
export function t(lang: Lang = 'es') { return dict[lang]; }
