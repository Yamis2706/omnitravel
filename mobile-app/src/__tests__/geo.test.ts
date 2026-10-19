import { distanciaKm } from '../utils/geo';

describe('distanciaKm (semiverseno)', () => {
  it('calcula una distancia plausible entre puntos de Armenia', () => {
    const centro = { latitude: 4.537, longitude: -75.675 };
    const terminal = { latitude: 4.5396, longitude: -75.6651 };
    // Proyección de línea recta: ~1 km de escala urbana, no cero ni enorme.
    const km = distanciaKm(centro, terminal);
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(2);
  });

  it('da cero para el mismo punto (sin NaN)', () => {
    const punto = { latitude: 4.53389, longitude: -75.68111 };
    expect(distanciaKm(punto, punto)).toBe(0);
  });

  it('es simétrica', () => {
    const a = { latitude: 4.5346, longitude: -75.6786 };
    const b = { latitude: 4.5357, longitude: -75.6802 };
    expect(distanciaKm(a, b)).toBeCloseTo(distanciaKm(b, a), 10);
  });

  it('cruza el meridiano y sigue siendo positiva y finita', () => {
    const a = { latitude: 0, longitude: 179.9 };
    const b = { latitude: 0, longitude: -179.9 };
    const km = distanciaKm(a, b);
    expect(Number.isFinite(km)).toBe(true);
    expect(km).toBeGreaterThan(0);
  });
});
