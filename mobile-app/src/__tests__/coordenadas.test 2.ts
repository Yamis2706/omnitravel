import { leerCoordenada } from '../services/coordenadas';

/**
 * Pruebas del lector de coordenadas con la serialización REAL verificada en
 * el proyecto Supabase del equipo (registro POI id 1 — Museo del Oro Quindío,
 * Armenia: lon -75.673, lat 4.535).
 */
describe('leerCoordenada (geography Point 4326 → coordenadas del mapa)', () => {
  it('parsea el WKB hex con SRID que devuelve PostgREST', () => {
    const fila = '0101000020E6100000508D976E12EB52C0A4703D0AD7231240';
    expect(leerCoordenada(fila)).toEqual({
      longitud: -75.673,
      latitud: 4.535,
    });
  });

  it('parsea el WKB hex sin SRID (mayúsculas incluidas)', () => {
    // Sin bloque de SRID (21 bytes): mismo punto.
    const fila = '0101000000508D976E12EB52C0A4703D0AD7231240';
    expect(leerCoordenada(fila)).toEqual({
      longitud: -75.673,
      latitud: 4.535,
    });
  });

  it('parsea JSON GeoJSON', () => {
    expect(
      leerCoordenada({ type: 'Point', coordinates: [-75.673, 4.535] }),
    ).toEqual({ longitud: -75.673, latitud: 4.535 });
  });

  it('parsea WKT textual', () => {
    expect(leerCoordenada('POINT(-75.673 4.535)')).toEqual({
      longitud: -75.673,
      latitud: 4.535,
    });
  });

  it('devuelve null ante entradas inválidas', () => {
    expect(leerCoordenada(null)).toBeNull();
    expect(leerCoordenada(undefined)).toBeNull();
    expect(leerCoordenada('')).toBeNull();
    expect(leerCoordenada('no-es-geo')).toBeNull();
    expect(leerCoordenada({ type: 'Point', coordinates: [] })).toBeNull();
  });
});
