
import {
    Injectable,
    OnModuleDestroy,
    OnModuleInit,
    ServiceUnavailableException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    Pool,
    type PoolConfig,
    type QueryResult,
    type QueryResultRow,
} from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly pool: Pool;

    constructor(private readonly configService: ConfigService) {
        // SSL se activa solo si DB_SSL=true en las variables de entorno.
        const sslEnabled =
            this.configService
                .get<string>('DB_SSL', 'false')
                .toLowerCase() === 'true';

        // Ruta opcional al certificado de la autoridad certificadora (CA).
        const caPath = this.configService.get<string>('DB_SSL_CA');

        const config: PoolConfig = {
            host: this.configService.get<string>('DB_HOST', 'localhost'),
            port: Number(this.configService.get<string>('DB_PORT') ?? 5432),
            user: this.configService.get<string>('DB_USERNAME'),
            password: this.configService.get<string>('DB_PASSWORD'),
            database: this.configService.get<string>('DB_DATABASE'),

            ...(sslEnabled
                ? {
                    ssl: {
                        rejectUnauthorized: true,
                        ...(caPath
                            ? {
                                ca: readFileSync(
                                    resolve(process.cwd(), caPath),
                                    'utf8',
                                ),
                            }
                            : {}),
                    },
                }
                : {}),

            max: 10,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
        };

        this.pool = new Pool(config);

        this.pool.on('error', (error: Error) => {
            // No registrar credenciales ni cadenas de conexión.
            console.error(
                '[DatabaseService] Error inesperado en el pool:',
                error.message,
            );
        });
    }

    // Al iniciar el módulo se comprueba que la base de datos responda.
    async onModuleInit(): Promise<void> {
        try {
            await this.pool.query('SELECT 1');

            console.log(
                '[DatabaseService] Conexión con la base de datos establecida.',
            );
        } catch (error: unknown) {
            const code =
                typeof error === 'object' &&
                    error !== null &&
                    'code' in error
                    ? String(error.code)
                    : 'UNKNOWN';

            const message =
                error instanceof Error
                    ? error.message
                    : 'Error desconocido';

            // Se registra el diagnóstico, nunca las credenciales.
            console.error('[DatabaseService] Falló la conexión:', {
                code,
                message,
            });

            throw new ServiceUnavailableException(
                'No fue posible conectar con la base de datos.',
            );
        }
    }

    // Ejecuta una consulta parametrizada y clasifica los errores:
    // conexión (503), errores SQL (se propagan) y desconocidos (500).
    async query<T extends QueryResultRow = QueryResultRow>(
        sql: string,
        values: unknown[] = [],
    ): Promise<QueryResult<T>> {
        try {
            return await this.pool.query<T>(sql, values);
        } catch (error: unknown) {
            // Se extrae el código del error (SQLSTATE de PostgreSQL, como
            // '23505', o código de red de Node, como 'ECONNREFUSED').
            const code =
                typeof error === 'object' &&
                    error !== null &&
                    'code' in error
                    ? String(error.code)
                    : 'UNKNOWN';

            // Solo se registra el código, nunca el SQL ni los valores.
            console.error('[DatabaseService] Falló una consulta:', {
                code,
            });

            // Los errores de conexión conservan el HTTP 503.
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

            // Los errores SQL (por ejemplo 23505, violación de restricción
            // única) se propagan para que cada servicio pueda interpretar
            // los casos que conoce y convertirlos en la respuesta adecuada.
            if (code !== 'UNKNOWN') {
                throw error;
            }

            // Errores sin código: se responde 500 sin exponer detalles
            // internos al cliente.
            throw new InternalServerErrorException(
                'Ocurrió un error interno al ejecutar la consulta.',
            );
        }
    }

    // Al cerrar el módulo se liberan todas las conexiones del pool.
    async onModuleDestroy(): Promise<void> {
        await this.pool.end();
    }
}


