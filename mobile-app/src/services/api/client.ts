import * as SecureStore from 'expo-secure-store';

/**
 * Cliente HTTP base para el backend OmniTravel (NestJS), única vía de la
 * app hacia la base de datos (PostgreSQL en AWS RDS).
 *
 * - Usa EXPO_PUBLIC_API_URL (ver .env.example).
 * - Adjunta el JWT de sesión (guardado cifrado con expo-secure-store).
 * - Timeout de 10 s y errores normalizados para que la UI pueda mostrar
 *   mensajes claros (RNF-17: nunca fallar en silencio).
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const TIMEOUT_MS = 10000;

/** Clave del token de sesión en el almacenamiento seguro del dispositivo. */
export const CLAVE_TOKEN = 'omnitravel-token';

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = TIMEOUT_MS,
): Promise<T> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    const token = await SecureStore.getItemAsync(CLAVE_TOKEN).catch(() => null);
    const respuesta = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controlador.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!respuesta.ok) {
      // NestJS responde con `message` legible (p. ej. validaciones del
      // ruteo); si el cuerpo no es JSON se conserva el mensaje genérico.
      let mensaje = `El servidor respondió con estado ${respuesta.status}.`;
      try {
        const cuerpo = (await respuesta.json()) as { message?: unknown };
        if (typeof cuerpo?.message === 'string' && cuerpo.message.trim()) {
          mensaje = cuerpo.message;
        }
      } catch {
        // Cuerpo no JSON: se mantiene el mensaje genérico.
      }
      throw new ApiError(mensaje, respuesta.status);
    }

    return (await respuesta.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'No fue posible comunicarse con el servidor. Verifica tu conexión e inténtalo de nuevo.',
    );
  } finally {
    clearTimeout(temporizador);
  }
}

export { API_URL };
