
import {
    BadRequestException,
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/supabase-auth.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';
import { CreateConfirmationDto } from './dto/create-confirmation.dto';

type AuthenticatedRequest = Request & {
    user: AuthenticatedUser;
};

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
    ) { }

    @Post()
    async create(
        @Body() dto: CreateReportDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.reportsService.create(
            dto,
            request.user.id_usuario,
        );
    }

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

    @Post(':id/confirmations')
    async createConfirmation(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateConfirmationDto,
        @Req() request: AuthenticatedRequest,
    ) {
        if (id < 1) {
            throw new BadRequestException(
                'El ID del reporte debe ser mayor que cero.',
            );
        }

        return this.reportsService.createConfirmation(
            id,
            request.user.id_usuario,
            dto.tipo_confirmacion,
        );
    }

}
