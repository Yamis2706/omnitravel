import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

// Estructura de una fila de la tabla public.reporte tal como la devuelven
// las consultas. Los IDs se castean a texto (::text) en el SQL, por eso
// llegan como string.
export interface ReportRow {
    id_reporte: string;
    poi_id: string;
    usuario_creador_id: string | null;
    tipo: string;
    descripcion: string | null;
    estado: string;
    via_resolucion: string | null;
    fecha_creacion: Date;
    fecha_resolucion: Date | null;
}

@Injectable()
export class ReportsService {
    constructor(private readonly database: DatabaseService) { }

    // Lista los reportes con paginación, del más reciente al más antiguo.
    async findAll(page = 1, limit = 10) {
        // Cantidad de registros que se saltan según la página solicitada.
        const offset = (page - 1) * limit;

        // Se ejecutan en paralelo la consulta de datos y la de conteo total.
        const [reports, count] = await Promise.all([
            this.database.query<ReportRow>(
                // Se incluye `tipo` en el SELECT para que cada reporte
                // devuelva su categoría, en línea con ReportRow.
                `SELECT
           id_reporte::text,
           poi_id::text,
           usuario_creador_id::text,
           tipo,
           descripcion,
           estado,
           via_resolucion,
           fecha_creacion,
           fecha_resolucion
         FROM public.reporte
         ORDER BY fecha_creacion DESC
         LIMIT $1 OFFSET $2`,
                [limit, offset],
            ),
            // Total de reportes, necesario para calcular las páginas.
            this.database.query<{ total: string }>(
                `SELECT COUNT(*)::text AS total
         FROM public.reporte`,
            ),
        ]);

        // COUNT llega como texto; se convierte a número (0 si no hay filas).
        const total = Number(count.rows[0]?.total ?? 0);

        return {
            data: reports.rows,
            // Metadatos de paginación para el cliente.
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Obtiene un reporte por su ID o lanza 404 si no existe.
    async findOne(id: number) {
        const result = await this.database.query<ReportRow>(
            // Se incluye `tipo` también aquí, para que findOne() y
            // findAll() devuelvan los mismos campos.
            `SELECT
         id_reporte::text,
         poi_id::text,
         usuario_creador_id::text,
         tipo,
         descripcion,
         estado,
         via_resolucion,
         fecha_creacion,
         fecha_resolucion
       FROM public.reporte
       WHERE id_reporte = $1`,
            [id],
        );

        const report = result.rows[0];

        // Si no hay fila, el reporte no existe.
        if (!report) {
            throw new NotFoundException(
                `No se encontró el reporte con ID ${id}.`,
            );
        }

        return report;
    }
}
