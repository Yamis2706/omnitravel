import { normalizarRespuestaRuta } from '../../utils/ruta';
import type { Coordenada, ResultadoRuta, RestriccionesRuta } from '../types';
import { apiFetch } from './client';

/**
 * Servicio de rutas: consume `POST /routes` del backend (NestJS → Valhalla).
 *
 * El backend calcula con `costing: 'pedestrian'` y aplica las restricciones
 * del perfil de accesibilidad (`restrictions`), devolviendo distancia,
 * duración, pasos de navegación y advertencias. La normalización del
 * contrato vive en `utils/ruta.ts` (probada con Jest).
 */
export async function calcularRutaAccesible(
  origen: Coordenada,
  destino: Coordenada,
  restricciones?: RestriccionesRuta,
): Promise<ResultadoRuta> {
  const datos = await apiFetch<unknown>('/routes', {
    method: 'POST',
    body: JSON.stringify({
      origin: [origen.latitude, origen.longitude],
      destination: [destino.latitude, destino.longitude],
      restrictions: restricciones ?? {},
    }),
  });

  return normalizarRespuestaRuta(datos);
}
