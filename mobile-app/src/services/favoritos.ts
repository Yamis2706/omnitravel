import { apiFetch } from './api/client';
import { mensajeLegible } from './api/auth';

/**
 * Guardados (favoritos) contra el backend (`/favoritos`, exige sesión).
 *
 * El backend toma el dueño del JWT: cada viajero solo ve y modifica SU
 * lista. Guardar y quitar son idempotentes.
 */

async function llamar<T>(ruta: string, init?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(ruta, init);
  } catch (error) {
    throw new Error(
      mensajeLegible(error instanceof Error ? error.message : '') ||
        'No fue posible actualizar tus guardados.',
    );
  }
}

/** Ids de POI guardados por la sesión activa (más recientes primero). */
export async function cargarFavoritos(): Promise<string[]> {
  const ids = await llamar<string[]>('/favoritos');
  return (ids ?? []).map(String);
}

/** Marca un POI como favorito del viajero. */
export async function guardarFavorito(idPoi: string): Promise<void> {
  await llamar(`/favoritos/${encodeURIComponent(idPoi)}`, { method: 'PUT' });
}

/** Retira un POI de los guardados de la sesión activa. */
export async function quitarFavorito(idPoi: string): Promise<void> {
  await llamar(`/favoritos/${encodeURIComponent(idPoi)}`, { method: 'DELETE' });
}
