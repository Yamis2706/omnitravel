import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { errorDominio } from '../common/errores';

/**
 * Guardados (tabla `favorito`, PK compuesta usuario_id + poi_id).
 *
 * El dueño SIEMPRE sale del JWT verificado: un viajero solo lee y modifica su
 * propia lista (equivalente a las políticas RLS `guardados_*` de Supabase).
 */
@Injectable()
export class FavoritosService {
  constructor(@InjectDataSource() private readonly db: DataSource) { }

  /** Ids de POI guardados, del más reciente al más antiguo. */
  async listar(usuarioId: string): Promise<string[]> {
    const filas: { poi_id: string }[] = await this.db.query(
      `select poi_id::text from favorito where usuario_id = $1 order by fecha desc`,
      [usuarioId],
    );
    return filas.map((fila) => fila.poi_id);
  }

  /** Guarda un POI; idempotente si ya estaba guardado. */
  async guardar(usuarioId: string, poiId: number): Promise<{ guardado: true }> {
    const [poi] = await this.db.query('select 1 from poi where id_poi = $1', [poiId]);
    if (!poi) {
      throw errorDominio(HttpStatus.NOT_FOUND, 'POI_NO_ENCONTRADO', 'El lugar no existe.');
    }
    await this.db.query(
      `insert into favorito (usuario_id, poi_id) values ($1, $2)
       on conflict (usuario_id, poi_id) do nothing`,
      [usuarioId, poiId],
    );
    return { guardado: true };
  }

  /** Quita un POI de los guardados; idempotente si no estaba. */
  async quitar(usuarioId: string, poiId: number): Promise<{ guardado: false }> {
    await this.db.query('delete from favorito where usuario_id = $1 and poi_id = $2', [
      usuarioId,
      poiId,
    ]);
    return { guardado: false };
  }
}
