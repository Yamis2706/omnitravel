
import {
    BadRequestException,
    Controller,
    DefaultValuePipe,
    Get,
    Param,
    ParseIntPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ReportsService } from './reports.service';

/**
 * Consulta de reportes (solo lectura).
 *
 * Crear reportes y confirmarlos se hace únicamente en `POST /reportes` y
 * `POST /reportes/:id/confirmaciones` (módulo reportes), que aplican las
 * reglas del Proceso 1: consenso de 3 confirmaciones, no confirmar el propio
 * reporte y evidencias de la carpeta del autor. Tener una segunda vía de
 * escritura permitiría saltarse esas reglas.
 */
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
    ) { }

    @Get()
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe)
        page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
        limit: number,
    ) {
        if (!Number.isInteger(page) || page < 1) {
            throw new BadRequestException(
                'El parámetro page debe ser un entero positivo.',
            );
        }

        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            throw new BadRequestException(
                'El parámetro limit debe estar entre 1 y 100.',
            );
        }

        return this.reportsService.findAll(page, limit);
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ) {
        if (id < 1) {
            throw new BadRequestException(
                'El ID del reporte debe ser positivo.',
            );
        }

        return this.reportsService.findOne(id);
    }
}
