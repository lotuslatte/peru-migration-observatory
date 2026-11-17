// Site identity and navigation, shared by the layout, the footer and the search palette.
export const SITE_NAME = 'Observatorio de Migración del Perú';
export const SOURCE_SPAN = '2014–2024';

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
