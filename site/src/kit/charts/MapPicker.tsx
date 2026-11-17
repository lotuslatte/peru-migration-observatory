import { useState } from 'preact/hooks';
import ChoroMap, { type MapShapes, type MapRow } from './ChoroMap';

export interface MapLayer { id: string; name: string; unit: string; rows: MapRow[]; scale?: 'seq' | 'div'; href?: string }

/** A map with a selector for what it shows. Used on the home page. */
export default function MapPicker({ map, layers, year, placeHref = '/atlas/', label = 'Mostrar en el mapa' }: { map: MapShapes; layers: MapLayer[]; year: number; placeHref?: string; label?: string }) {
  const [k, setK] = useState(0);
  const L = layers[k];
  return (
    <div class="map-picker">
      <div class="r-ctl"><label>{label}<select value={k} onChange={e => setK(Number((e.target as HTMLSelectElement).value))}>{layers.map((l, i) => <option value={i}>{l.name}</option>)}</select></label></div>
      <ChoroMap map={map} rows={L.rows} unit={L.unit} scale={L.scale} ranking={false} title={`${L.name} por departamento, ${year}`} hrefFor={id => `${placeHref}${id}/`} />
      {L.href && <p class="small"><a href={L.href}>Ver {L.name.toLowerCase()} en detalle</a></p>}
    </div>
  );
}
