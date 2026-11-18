// Department outlines as SVG paths, projected at build time from the site's shared-border topology
// (public/data/departamentos.topo.json). Never thin individual rings: neighbours stop matching.
import fs from 'node:fs';
import path from 'node:path';
import { feature, mesh } from 'topojson-client';
import { geoMercator, geoPath } from 'd3';

export function peruMap(topoFile = 'public/data/departamentos.topo.json') {
  const W = 560, H = 640, I = { x: 16, y: 452, s: 150 };
  const t = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), topoFile), 'utf8'));
  const obj = t.objects[Object.keys(t.objects)[0]];
  const fc: any = feature(t, obj);
  const idOf = (f: any) => String(f.properties.id ?? f.id);
  const main = geoPath(geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], fc)).digits(1);
  // Inset window over Lima Metropolitana and Callao, which are too small on the national map.
  const metro = { type: 'MultiPoint', coordinates: [[-77.35, -12.42], [-76.55, -11.72]] };
  const zoom = geoPath(geoMercator().fitExtent([[I.x, I.y], [I.x + I.s, I.y + I.s]], metro as any)).digits(1);
  const paths = fc.features.map((f: any) => ({ id: idOf(f), d: main(f) }));
  const inset = fc.features.filter((f: any) => ['07', '15'].includes(idOf(f))).map((f: any) => ({ id: idOf(f), d: zoom(f) }));
  // Projected centre of each department, for flow lines and labels.
  const centroids = Object.fromEntries(fc.features.map((f: any) => [idOf(f), main.centroid(f).map((v: number) => +v.toFixed(1))]));
  const edge: any = mesh(t, obj, (a: any, b: any) => a === b);
  return { box: `0 0 ${W} ${H}`, W, H, paths, inset, I, centroids, outline: main(edge), insetOutline: zoom(edge) };
}
