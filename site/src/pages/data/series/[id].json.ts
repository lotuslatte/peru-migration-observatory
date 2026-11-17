// /data/series/<id>.json: annual series of an indicator by group and department.
import type { APIRoute } from 'astro';
import { INDICATORS, seriesFile } from '../../../data/indicators';

export const getStaticPaths = () => INDICATORS.map(i => ({ params: { id: i.id } }));
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(seriesFile(params.id!)), { headers: { 'Content-Type': 'application/json' } });
