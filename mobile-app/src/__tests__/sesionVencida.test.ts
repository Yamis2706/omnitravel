import * as SecureStore from 'expo-secure-store';
import {
  ApiError,
  apiFetch,
  MENSAJE_SESION_VENCIDA,
  registrarManejadorSesionVencida,
  tokenVencido,
} from '../services/api/client';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const getItem = SecureStore.getItemAsync as jest.Mock;
const AHORA = Date.UTC(2026, 9, 18, 12, 0, 0);

/** JWT sin firma válida: el cliente solo lee `exp`. */
function jwtCon(payload: object): string {
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

const VIGENTE = jwtCon({ sub: '3', exp: Math.floor(AHORA / 1000) + 3600 });
const VENCIDO = jwtCon({ sub: '3', exp: Math.floor(AHORA / 1000) - 60 });

describe('tokenVencido', () => {
  it('distingue un token vigente de uno caducado', () => {
    expect(tokenVencido(VIGENTE, AHORA)).toBe(false);
    expect(tokenVencido(VENCIDO, AHORA)).toBe(true);
  });

  it('considera vencido el que expira en menos de 30 s', () => {
    const casi = jwtCon({ exp: Math.floor(AHORA / 1000) + 10 });
    expect(tokenVencido(casi, AHORA)).toBe(true);
  });

  it('trata como vencido un token mal formado o sin exp', () => {
    expect(tokenVencido('basura', AHORA)).toBe(true);
    expect(tokenVencido(jwtCon({ sub: '3' }), AHORA)).toBe(true);
  });
});

describe('apiFetch ante la sesión vencida', () => {
  const fetchMock = jest.fn();
  const manejador = jest.fn();
  let quitar: () => void;

  beforeEach(() => {
    jest.useFakeTimers({
      now: AHORA,
      doNotFake: ['setTimeout', 'clearTimeout'],
    });
    fetchMock.mockReset();
    manejador.mockReset();
    getItem.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    quitar = registrarManejadorSesionVencida(manejador);
  });

  afterEach(() => {
    quitar();
    jest.useRealTimers();
  });

  function respuesta(status: number, cuerpo: unknown = {}) {
    return { ok: status < 400, status, json: async () => cuerpo };
  }

  it('no envía un token caducado: avisa y lanza 401 sin llamar al backend', async () => {
    getItem.mockResolvedValue(VENCIDO);

    const error = await apiFetch('/favoritos').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).message).toBe(MENSAJE_SESION_VENCIDA);
    expect(manejador).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un 401 del backend con token cierra la sesión', async () => {
    getItem.mockResolvedValue(VIGENTE);
    fetchMock.mockResolvedValue(
      respuesta(401, { message: 'USUARIO_NO_VINCULADO: x' }),
    );

    await expect(apiFetch('/reportes/mios')).rejects.toThrow(
      MENSAJE_SESION_VENCIDA,
    );
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      `Bearer ${VIGENTE}`,
    );
    expect(manejador).toHaveBeenCalledTimes(1);
  });

  it('el 401 del login (contraseña mala) no se toma como sesión vencida', async () => {
    getItem.mockResolvedValue(VENCIDO);
    fetchMock.mockResolvedValue(
      respuesta(401, {
        message: 'CREDENCIALES_INVALIDAS: Correo o contraseña incorrectos.',
      }),
    );

    await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toThrow(
      'CREDENCIALES_INVALIDAS',
    );
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(manejador).not.toHaveBeenCalled();
  });

  it('sin token, un 401 no dispara el cierre de sesión', async () => {
    getItem.mockResolvedValue(null);
    fetchMock.mockResolvedValue(respuesta(401, { message: 'X: y' }));

    await expect(apiFetch('/favoritos')).rejects.toThrow('X: y');
    expect(manejador).not.toHaveBeenCalled();
  });
});
