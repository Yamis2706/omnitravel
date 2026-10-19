/**
 * Lectura de coordenadas desde la serialización de `geography(Point,4326)`.
 *
 * El backend (`GET /mapa`) entrega `poi.ubicacion` como GeoJSON
 * (`ST_AsGeoJSON`). Se conservan también los formatos WKB/WKT por si los
 * datos llegan de cargas manuales; ejemplo de WKB hex little-endian con SRID:
 *   `0101000020E6100000508D976E12EB52C0A4703D0AD7231240`
 *    orden=01 · tipo=Point(01) · SRID=4326(E6100000) · X · Y
 *
 * Módulo puro (sin dependencias de red) para uso testable.
 */

export interface CoordenadaGeografica {
  latitud: number;
  longitud: number;
}

/** Longitud, latitud desde WKB punto little/big endian, ya sin cabecera de tipo. */
function leerDoublesWkb(hex: string): CoordenadaGeografica | null {
  const bytes = new Uint8Array(
    hex.match(/.{2}/g)?.map((par) => parseInt(par, 16)) ?? [],
  );
  if (bytes.length < 16) {
    return null;
  }
  const vista = new DataView(bytes.buffer);
  return {
    longitud: vista.getFloat64(0, true),
    latitud: vista.getFloat64(8, true),
  };
}

/**
 * Interpreta las variantes de serialización admitidas para el punto del POI:
 * - WKB hex LE con SRID (formato efectivo de PostgREST `::text`, 22 bytes).
 * - WKB hex LE sin SRID (21 bytes), por si la BD cambia de configuración.
 * - JSON GeoJSON `{type: "Point", coordinates: [lon, lat]}` (imports="/">
 *   herramientas de carga del equipo).
 * - WKT textual `POINT(longitud latitud)` (carga manual).
 */
export function leerCoordenada(
  ubicacion:
    string | { type: string; coordinates: number[] } | null | undefined,
): CoordenadaGeografica | null {
  if (!ubicacion) {
    return null;
  }
  if (typeof ubicacion === 'object') {
    const [x, y] = ubicacion.coordinates ?? [];
    if (typeof x === 'number' && typeof y === 'number') {
      return { latitud: y, longitud: x };
    }
    return null;
  }

  const hex = ubicacion.trim().toLowerCase();
  if (/^0101000020[0-9a-f]{40}$/.test(hex)) {
    return leerDoublesWkb(hex.slice(18));
  }
  if (/^0101000000[0-9a-f]{32}$/.test(hex)) {
    return leerDoublesWkb(hex.slice(10));
  }

  const wkt = /^point\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(
    ubicacion.trim(),
  );
  if (wkt) {
    return { longitud: Number(wkt[1]), latitud: Number(wkt[2]) };
  }
  return null;
}
