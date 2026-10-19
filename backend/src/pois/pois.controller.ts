

import {
    BadRequestException,
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PoisService } from './pois.service';

@ApiTags('Puntos de interés')
@ApiBearerAuth('access-token')
@Controller('pois')
@UseGuards(AuthGuard)
export class PoisController {
    constructor(private readonly poisService: PoisService) { }

    @Get('nearby')
    @ApiOperation({
        summary: 'Buscar puntos de interés cercanos',
        description:
            'Busca puntos de interés publicados dentro de un radio determinado, ordenados por distancia y con paginación.',
    })
    @ApiQuery({
        name: 'lat',
        required: true,
        type: Number,
        description: 'Latitud del punto de referencia, entre -90 y 90.',
        example: 4.535,
    })
    @ApiQuery({
        name: 'lon',
        required: true,
        type: Number,
        description: 'Longitud del punto de referencia, entre -180 y 180.',
        example: -75.673,
    })
    @ApiQuery({
        name: 'radio',
        required: false,
        type: Number,
        description: 'Radio de búsqueda en metros, entre 1 y 50000.',
        example: 5000,
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Número de página. Debe ser un entero positivo.',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Resultados por página. Debe estar entre 1 y 100.',
        example: 10,
    })
    @ApiOkResponse({
        description: 'Puntos de interés cercanos encontrados.',
    })
    @ApiBadRequestResponse({
        description: 'Los parámetros de ubicación, radio o paginación son inválidos.',
    })
    @ApiUnauthorizedResponse({
        description: 'Token de acceso ausente, inválido o usuario no autorizado.',
    })
    findNearby(
        @Query('lat') lat?: string,
        @Query('lon') lon?: string,
        @Query('radio') radio?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const latitude = lat === undefined ? NaN : Number(lat);
        const longitude = lon === undefined ? NaN : Number(lon);
        const radius = radio === undefined ? 5000 : Number(radio);
        const pagina = page === undefined ? 1 : Number(page);
        const limite = limit === undefined ? 10 : Number(limit);

        if (
            lat === undefined ||
            lon === undefined ||
            lat.trim() === '' ||
            lon.trim() === '' ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(radius) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180 ||
            radius < 1 ||
            radius > 50000 ||
            (page !== undefined && !/^[1-9]\d*$/.test(page)) ||
            (limit !== undefined && !/^[1-9]\d*$/.test(limit)) ||
            !Number.isSafeInteger(pagina) ||
            !Number.isSafeInteger(limite) ||
            pagina < 1 ||
            limite < 1 ||
            limite > 100
        ) {
            throw new BadRequestException(
                'Parámetros inválidos. lat debe estar entre -90 y 90, ' +
                'lon entre -180 y 180, radio entre 1 y 50000 metros, ' +
                'page debe ser un entero positivo y limit debe estar entre 1 y 100.',
            );
        }

        return this.poisService.findNearby(
            latitude,
            longitude,
            radius,
            pagina,
            limite,
        );
    }

    @Get()
    @ApiOperation({
        summary: 'Consultar puntos de interés',
        description:
            'Devuelve puntos de interés publicados, con filtros opcionales por tipo y texto, y paginación.',
    })
    @ApiQuery({
        name: 'tipo',
        required: false,
        type: String,
        description: 'Filtra por tipo de punto de interés.',
        example: 'museo',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Busca por nombre del punto de interés.',
        example: 'parque',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Número de página. Debe ser un entero positivo.',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Resultados por página. Debe estar entre 1 y 100.',
        example: 10,
    })
    @ApiOkResponse({
        description: 'Lista paginada de puntos de interés.',
    })
    @ApiBadRequestResponse({
        description: 'Los parámetros de paginación son inválidos.',
    })
    @ApiUnauthorizedResponse({
        description: 'Token de acceso ausente, inválido o usuario no autorizado.',
    })
    findAll(
        @Query('tipo') tipo?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pagina = page === undefined ? 1 : Number(page);
        const limite = limit === undefined ? 10 : Number(limit);

        if (
            (page !== undefined && !/^[1-9]\d*$/.test(page)) ||
            (limit !== undefined && !/^[1-9]\d*$/.test(limit)) ||
            !Number.isSafeInteger(pagina) ||
            !Number.isSafeInteger(limite) ||
            pagina < 1 ||
            limite < 1 ||
            limite > 100
        ) {
            throw new BadRequestException(
                'Los parámetros page y limit deben ser enteros positivos. ' +
                'limit no puede superar 100.',
            );
        }

        return this.poisService.findAll(tipo, search, pagina, limite);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Consultar un punto de interés por ID',
        description:
            'Devuelve los detalles de un punto de interés publicado.',
    })
    @ApiOkResponse({
        description: 'Punto de interés encontrado.',
    })
    @ApiBadRequestResponse({
        description: 'El ID proporcionado no tiene un formato válido.',
    })
    @ApiNotFoundResponse({
        description: 'El punto de interés no existe o no está publicado.',
    })
    @ApiUnauthorizedResponse({
        description: 'Token de acceso ausente, inválido o usuario no autorizado.',
    })
    findOne(@Param('id') id: string) {
        return this.poisService.findOne(id);
    }
}
