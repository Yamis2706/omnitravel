import { supabase } from './supabase';

/**
 * Guardados (favoritos) contra la tabla `favorito` de la BD del equipo.
 *
 * Las políticas RLS `guardados_*` (docs/gestion/supabase-sara/
 * peticiones-front-guardados.sql) restringen cada fila al dueño
 * (`usuario_id = usuario_actual_id()`): un viajero solo ve y move
 * SU lista. `usuario_actual_id()` es la RPC security-definer de la
 * Entrega 2 que resuelve la fila de `usuario` enlazada a la sesión
 * de Supabase Auth (`auth_user_id = auth.uid()`).
 */

/** Id de `usuario` de la sesión activa (null si está sin perfil vinculado). */
async function idUsuarioActual(): Promise<number | null> {
  const { data, error } = await supabase.rpc('usuario_actual_id');
  if (error || data == null) {
    return null;
  }
  return Number(data);
}

/** Ids de POI guardados por la sesión activa (más recientes primero). */
export async function cargarFavoritos(): Promise<string[]> {
  const idUsuario = await idUsuarioActual();
  if (idUsuario == null) {
    return [];
  }

  const { data, error } = await supabase
    .from('favorito')
    .select('poi_id')
    .eq('usuario_id', idUsuario)
    .order('fecha', { ascending: false });

  if (error) {
    throw new Error(`No se pudieron leer tus guardados: ${error.message}`);
  }
  return ((data ?? []) as { poi_id: number | string }[]).map((fila) =>
    String(fila.poi_id),
  );
}

/** Marca un POI como favorito del viajero (idempotente ante duplicados). */
export async function guardarFavorito(idPoi: string): Promise<void> {
  const idUsuario = await idUsuarioActual();
  if (idUsuario == null) {
    throw new Error('Inicia sesión para guardar lugares.');
  }

  const { error } = await supabase.from('favorito').insert({
    usuario_id: idUsuario,
    poi_id: Number(idPoi),
  });
  // 23505 = duplicada: el POI ya estaba guardado; la operación es idempotente.
  if (error && error.code !== '23505') {
    throw new Error(`No se pudo guardar el lugar: ${error.message}`);
  }
}

/** Retira un POI de los guardados de la sesión activa. */
export async function quitarFavorito(idPoi: string): Promise<void> {
  const idUsuario = await idUsuarioActual();
  if (idUsuario == null) {
    throw new Error('Inicia sesión para actualizar tus guardados.');
  }

  const { error } = await supabase
    .from('favorito')
    .delete()
    .match({ usuario_id: idUsuario, poi_id: Number(idPoi) });
  if (error) {
    throw new Error(`No se pudo quitar del listado: ${error.message}`);
  }
}
