import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateReportDto } from './dto/create-report.dto';

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

    // Crea un reporte nuevo asociado a un POI y al usuario autenticado.
    async create(dto: CreateReportDto, userId: string) {
        // Primero se verifica que el punto de interés exista.
        const poi = await this.database.query<{ id_poi: string }>(
            `SELECT id_poi::text
     FROM public.poi
     WHERE id_poi = $1`,
            [dto.poi_id],
        );

        if (poi.rows.length === 0) {
            throw new NotFoundException(
                `No existe el punto de interés con ID ${dto.poi_id}.`,
            );
        }

        // Se inserta el reporte con estado inicial 'pendiente_validacion'
        // y se devuelve la fila creada (incluido `tipo`).
        const result = await this.database.query<ReportRow>(
            `INSERT INTO public.reporte (
       poi_id,
       usuario_creador_id,
       tipo,
       descripcion,
       estado
     )
     VALUES ($1, $2, $3, $4, 'pendiente_validacion')
     RETURNING
     RETURNING
       id_reporte::text,
       poi_id::text,
       usuario_creador_id::text,
       tipo,
       descripcion,
       estado,
       via_resolucion,
       fecha_creacion,
       fecha_resolucion`,
            [
                dto.poi_id,
                userId,
                // trim() elimina espacios sobrantes del tipo.
                dto.tipo.trim(),
                // La descripción es opcional: si queda vacía se guarda NULL.
                dto.descripcion?.trim() || null,
            ],
        );

        return result.rows[0];
    }

    async createConfirmation(
        reportId: number,
        userId: string,
        tipoConfirmacion: 'confirma' | 'refuta',
    ) {
        const report = await this.database.query(
            `SELECT id_reporte
     FROM public.reporte
     WHERE id_reporte = $1`,
            [reportId],
        );

        if (report.rows.length === 0) {
            throw new NotFoundException(
                `No existe el reporte con ID ${reportId}.`,
            );
        }

        try {
            const result = await this.database.query(
                `INSERT INTO public.confirmacion (
         reporte_id,
         usuario_id,
         tipo_confirmacion
       )
       VALUES ($1, $2, $3)
       RETURNING
         id_confirmacion::text,
         reporte_id::text,
         usuario_id::text,
         tipo_confirmacion,
         fecha`,
                [reportId, userId, tipoConfirmacion],
            );

            return result.rows[0];
        } catch (error: unknown) {
            const pgError = error as { code?: string };

            if (pgError.code === '23505') {
                throw new ConflictException(
                    'Ya has confirmado o refutado este reporte. Tu primer voto es definitivo.',
                );
            }

            throw error;
        }
    }


}
