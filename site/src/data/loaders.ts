// Carga en tiempo de build de los contratos JSON generados por el pipeline (site/public/data/).
import fs from 'node:fs';
import path from 'node:path';
export interface Cell { v: number | null; g: 'A' | 'B' | 'S'; n: number; se?: number; rse?: number; lo?: number; hi?: number }
export interface Dim { id: string; label_es: string; label_en: string; unit: string; higher_better: boolean; primary: boolean }
export interface Region { id: string; name: string; region_nat: string; parent: string | null; values: Record<string, Cell>; pct: Record<string, number | null>; rank: Record<string, number | null> }
export interface Atlas { year: number; n_regions: number; dims: Dim[]; regions: Region[] }
export interface Headline { year: number; generated: string; source: string; n_persons: number; pet_weighted: number; years: number[]; kpis: Record<string, Cell>; by_sex: Record<string, Record<string, Cell>>; by_area: Record<string, Record<string, Cell>>; trend: Record<string, Cell[]> }
export interface Profile { id: string; name: string; region_nat: string; parent: string | null; year: number; n: number; pet_weighted: number; dims: Record<string, Cell>; pct: Record<string, number>; rank: Record<string, number>; status_dist: any[]; sector_dist: any[]; educ_dist: any[]; inc_pct: Record<string, Cell>; quality: Record<string, Cell>; dumbbells: Record<string, Record<string, Record<string, Cell & { label: string }>>>; trend: Record<string, Cell[]> }

const DATA = path.resolve(process.cwd(), 'public/data');
function read<T>(rel: string): T { return JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8')) as T; }
export const loadHeadline = () => read<Headline>('headline.json');
export const loadAtlas = () => read<Atlas>('atlas_regions.json');
export const loadTrends = () => read<any>('trends.json');
export const loadCompendiumIndex = () => read<any>('compendium_index.json');
export const loadMeta = () => read<any>('meta.json');
export const loadProfile = (id: string) => read<Profile>(`profiles/${id}.json`);
export const loadProfiles = () => loadAtlas().regions.map(r => loadProfile(r.id));
export const loadFlows = () => read<any>('flows.json');
export const loadVenezuela = () => read<any>('venezuela.json');
export const loadClimate = () => read<any>('climate.json');
export const loadModels = () => read<any>('models.json');
export const loadDecomp = () => read<any>('decompositions.json');
export const loadDrought = () => read<any>('drought_model.json');
export const loadDigest = () => read<any>('digest.json');
export const loadIndex = () => read<any>('index.json');
export const readCsv = (rel: string) => fs.readFileSync(path.join(DATA, rel), 'utf8');
