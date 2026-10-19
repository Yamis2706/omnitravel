import type { Coordenada } from '../services/types';

const RADIO_TIERRA_KM = 6371;

/** Convierte grados a radianes. */
function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Distancia en línea recta entre dos coordenadas (fórmula del semiverseno).
 * Es la distancia "a vuelo de pájaro" que el feed usa para ordenar por
 * cercanía; la distancia caminable real la calcula el motor de ruteo.
 */
export function distanciaKm(desde: Coordenada, hasta: Coordenada): number {
  const dLat = aRadianes(hasta.latitude - desde.latitude);
  const dLon = aRadianes(hasta.longitude - desde.longitude);
  const lat1 = aRadianes(desde.latitude);
  const lat2 = aRadianes(hasta.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(a));
}
