
import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PoisService {
    constructor(private readonly databaseService: DatabaseService) { }


    async findAll(
        tipo?: string,
        search?: string,
        page = 1,
        limit = 10,
    ) {
        const tipoFiltro = tipo?.trim() || null;
        const busqueda = search?.trim() || null;

        const offset = (page - 1) * limit;

        const filtros = `
    FROM public.poi
    WHERE estado = $1
      AND ($2::text IS NULL OR tipo ILIKE $2)
      AND ($3::text IS NULL OR nombre ILIKE $3)
  `;

        const parametros = [
            'publicado',
            tipoFiltro,
            busqueda === null ? null : `%${busqueda}%`,
        ];

        const [datos, conteo] = await Promise.all([
            this.databaseService.query(
                `
        SELECT
          id_poi,
          nombre,
          descripcion,
          tipo,
          direccion,
          ST_AsGeoJSON(ubicacion::geometry)::json AS ubicacion,
          estado,
          fecha_creacion,
          fecha_actualizacion
        ${filtros}
        ORDER BY id_poi ASC
        LIMIT $4 OFFSET $5
      `,
                [...parametros, limit, offset],
            ),
            this.databaseService.query(
                `
        SELECT COUNT(*) AS total
        ${filtros}
      `,
                parametros,
            ),
        ]);

        const total = Number(conteo.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        return {
            data: datos.rows,
            meta: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }


    async findOne(id: string) {
        if (!/^[1-9]\d*$/.test(id)) {
            throw new NotFoundException('Punto de interés no encontrado');
        }

        const result = await this.databaseService.query(
            `
        SELECT
          id_poi,
          nombre,
          descripcion,
          tipo,
          direccion,
          ST_AsGeoJSON(ubicacion::geometry)::json AS ubicacion,
          estado,
          fecha_creacion,
          fecha_actualizacion
        FROM public.poi
        WHERE id_poi = $1
          AND estado = $2
        LIMIT 1
      `,
            [id, 'publicado'],
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Punto de interés no encontrado');
        }

        return result.rows[0];
    }



    async findNearby(
        lat: number,
        lon: number,
        radio: number,
        page = 1,
        limit = 10,
    ) {
        const offset = (page - 1) * limit;

        const ubicacionUsuario = `
    ST_SetSRID(
      ST_MakePoint($1, $2),
      4326
    )::geography
  `;

        const condicion = `
    FROM public.poi
    WHERE estado = $3
      AND ST_DWithin(
        ubicacion,
        ${ubicacionUsuario},
        $4
      )
  `;

        const parametros = [lon, lat, 'publicado', radio];

        const [datos, conteo] = await Promise.all([
            this.databaseService.query(
                `
        SELECT
          id_poi,
          nombre,
          descripcion,
          tipo,
          direccion,
          ST_AsGeoJSON(ubicacion::geometry)::json AS ubicacion,
          estado,
          fecha_creacion,
          fecha_actualizacion,
          ROUND(
            ST_Distance(
              ubicacion,
              ${ubicacionUsuario}
            )::numeric,
            2
          ) AS distancia_metros
        ${condicion}
        ORDER BY distancia_metros ASC, id_poi ASC
        LIMIT $5 OFFSET $6
      `,
                [...parametros, limit, offset],
            ),
            this.databaseService.query(
                `
        SELECT COUNT(*) AS total
        ${condicion}
      `,
                parametros,
            ),
        ]);

        const total = Number(conteo.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        return {
            data: datos.rows,
            meta: {
                page,
                limit,
                total,
                totalPages,
                radio,
            },
        };
    }


}

