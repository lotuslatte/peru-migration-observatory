// Site identity and navigation, shared by the layout, the footer and the search palette.
export const SITE_NAME = 'Observatorio de Migración del Perú';
import { loadMeta } from './loaders';

// Years come from the pipeline (meta.json): nothing here changes with a new release.
const meta = loadMeta();
export const YEAR: number = meta.headline_year;
export const FIRST_YEAR: number = meta.years[0];
export const SOURCE_SPAN = `${FIRST_YEAR}–${YEAR}`;
/** Pooled window of the flows, the origin and destination matrix and the province atlas. */
export const POOL_SPAN = `${meta.pool_years[0]}–${meta.pool_years.at(-1)}`;
export const DATA_VERSION: string = meta.data_version;
export const GENERATED: string = meta.generated;

export const NAV: [string, string][] = [
  ['/indicadores/', 'Indicadores'],
  ['/atlas/', 'Territorios'],
  ['/flujos/', 'Flujos'],
  ['/venezuela/', 'Venezuela'],
  ['/datos/', 'Datos'],
  ['/acerca/metodologia/', 'Método'],
];

export const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: 'Indicadores', links: [['/indicadores/', 'Todos los indicadores'], ['/novedades/', 'Qué cambió'], ['/compendio/', 'Compendio de tablas']] },
  { title: 'Territorios', links: [['/atlas/', 'Departamentos'], ['/atlas/provincias/', 'Provincias'], ['/flujos/', 'Flujos entre departamentos']] },
  { title: 'Leer', links: [['/historias/peru-en-movimiento/', 'Perú en movimiento'], ['/venezuela/', 'Población venezolana'], ['/clima/', 'Clima y movilidad'], ['/analisis/', 'Análisis con controles'], ['/glosario/', 'Glosario'], ['/preguntas/', 'Preguntas frecuentes']] },
  { title: 'Datos y método', links: [['/datos/', 'Descargas'], ['/acerca/metodologia/', 'Metodología'], ['/acerca/validacion/', 'Validación'], ['/acerca/', 'Acerca de']] },
];
