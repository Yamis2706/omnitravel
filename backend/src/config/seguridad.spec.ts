import {
  ORIGENES_DESARROLLO,
  opcionesSsl,
  origenesCors,
  revisarSecretoJwt,
  telemetriaActiva,
} from './seguridad';

describe('origenesCors', () => {
  it('sin configurar permite solo Expo web local', () => {
    expect(origenesCors(undefined)).toEqual(ORIGENES_DESARROLLO);
    expect(origenesCors('  ')).toEqual(ORIGENES_DESARROLLO);
  });

  it('usa la lista configurada', () => {
    expect(
      origenesCors('https://omnitravel.app, https://admin.omnitravel.app'),
    ).toEqual(['https://omnitravel.app', 'https://admin.omnitravel.app']);
  });
});

describe('revisarSecretoJwt', () => {
  const FUERTE = 'a'.repeat(64);

  it('falla si no hay secreto', () => {
    expect(revisarSecretoJwt(undefined, 'development').error).toMatch(
      /JWT_SECRET/,
    );
  });

  it('en desarrollo solo advierte con el secreto de ejemplo', () => {
    const r = revisarSecretoJwt('cambia_esto', 'development');
    expect(r.error).toBeUndefined();
    expect(r.advertencia).toMatch(/débil/);
  });

  it('en producción rechaza secretos débiles', () => {
    expect(revisarSecretoJwt('cambia_esto', 'production').error).toMatch(
      /débil/,
    );
    expect(revisarSecretoJwt('corto123', 'production').error).toBeDefined();
  });

  it('acepta un secreto fuerte', () => {
    expect(revisarSecretoJwt(FUERTE, 'production')).toEqual({});
  });
});

describe('opcionesSsl', () => {
  it('sin DB_SSL no usa TLS', () => {
    expect(opcionesSsl(undefined, undefined)).toBe(false);
  });

  it('sin CA mantiene el comportamiento actual (cifrado sin verificar)', () => {
    expect(opcionesSsl('true', undefined)).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('con CA verifica el servidor y restaura los saltos de línea', () => {
    expect(opcionesSsl('true', 'L1\\nL2')).toEqual({
      ca: 'L1\nL2',
      rejectUnauthorized: true,
    });
  });
});

describe('telemetriaActiva', () => {
  it('requiere ambas credenciales', () => {
    expect(telemetriaActiva({})).toBe(false);
    expect(telemetriaActiva({ OBSERVE_APP_KEY: 'k' })).toBe(false);
    expect(
      telemetriaActiva({ OBSERVE_APP_KEY: 'k', OBSERVE_APP_SECRET: 's' }),
    ).toBe(true);
  });
});
