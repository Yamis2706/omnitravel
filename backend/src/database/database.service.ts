import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Pool, QueryResult, QueryResultRow } from 'pg';
import { DataSource } from 'typeorm';

/**
 * Consultas SQL parametrizadas para los módulos que no usan entidades
 * (pois, reports, diagnóstico).
 *
 * Reutiliza el pool de PostgreSQL que ya abrió TypeORM con DATABASE_URL, así
 * que hay una sola conexión y una sola configuración de TLS para todo el
 * backend. Devuelve el `QueryResult` de `pg` (`rows`, `rowCount`), igual que
 * la versión anterior basada en DB_HOST/DB_PORT.
 */
@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  private get pool(): Pool {
    return (this.dataSource.driver as unknown as { master: Pool }).master;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(sql, values);
    } catch (error: unknown) {
      // SQLSTATE de PostgreSQL ('23505') o código de red de Node ('ECONNREFUSED').
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : 'UNKNOWN';

      // Solo se registra el código, nunca el SQL ni los valores.
      this.logger.error(`Falló una consulta (código ${code})`);

      // La clase '08' de SQLSTATE agrupa los errores de conexión.
      if (
        code.startsWith('08') ||
        code === 'ECONNREFUSED' ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT'
      ) {
        throw new ServiceUnavailableException(
          'No fue posible ejecutar la consulta en la base de datos.',
        );
      }

      // Los errores SQL se propagan para que cada servicio interprete los
      // casos que conoce (p. ej. 23505, restricción única).
      if (code !== 'UNKNOWN') {
        throw error;
      }

      throw new InternalServerErrorException(
        'Ocurrió un error interno al ejecutar la consulta.',
      );
    }
  }
}
