import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiServiceUnavailableResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RoutingService } from './routing.service';
import { AuthGuard } from '../auth/auth.guard';
import { CalculateRouteDto } from './dto/calculate-route.dto';

// @ApiTags: agrupa los endpoints de este controlador bajo la sección
// "Rutas" en la interfaz de Swagger.
@ApiTags('Rutas')
// @ApiBearerAuth: indica que el endpoint requiere el token de acceso.
// El nombre 'access-token' debe coincidir con el registrado en
// addBearerAuth() dentro de main.ts.
@ApiBearerAuth('access-token')
@Controller('routes')
// El AuthGuard valida el token antes de ejecutar cualquier método.
@UseGuards(AuthGuard)
export class RoutingController {
    constructor(private readonly routingService: RoutingService) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    // @ApiOperation: explica para qué sirve el endpoint (resumen corto
    // y descripción detallada que se muestran en Swagger).
    @ApiOperation({
        summary: 'Calcular una ruta',
        description:
            'Calcula una ruta entre un origen y un destino mediante el servicio de enrutamiento de OmniTravel.',
    })
    // @ApiBody: describe el JSON que recibe el endpoint. Ambas coordenadas
    // son arreglos de exactamente dos números en formato [longitud, latitud]
    // y las dos son obligatorias.
    @ApiBody({
        description:
            'Coordenadas del origen y del destino en formato [longitud, latitud].',
        schema: {
            type: 'object',
            properties: {
                origin: {
                    type: 'array',
                    description: 'Coordenadas del origen: [longitud, latitud].',
                    minItems: 2,
                    maxItems: 2,
                    items: {
                        type: 'number',
                    },
                    example: [-75.673, 4.535],
                },
                destination: {
                    type: 'array',
                    description: 'Coordenadas del destino: [longitud, latitud].',
                    minItems: 2,
                    maxItems: 2,
                    items: {
                        type: 'number',
                    },
                    example: [-75.6803, 4.5355],
                },
            },
            required: ['origin', 'destination'],
        },
    })
    // @ApiOkResponse: documenta la respuesta exitosa (200). Aún no describe
    // la estructura del resultado; se puede completar con un `schema`
    // según lo que devuelva RoutingService.
    @ApiOkResponse({
        description: 'Ruta calculada correctamente.',
    })
    // Los siguientes decoradores documentan los errores que podrían
    // producirse. Falta verificar los códigos concretos contra RoutingService.

    // 400: coordenadas o datos inválidos en el cuerpo de la solicitud.
    @ApiBadRequestResponse({
        description: 'La solicitud contiene datos o coordenadas inválidos.',
    })
    // 401: token ausente o inválido (lo rechaza el AuthGuard).
    @ApiUnauthorizedResponse({
        description: 'Token de acceso ausente o inválido.',
    })
    // 503: el servicio de enrutamiento externo no responde o no está disponible.
    @ApiServiceUnavailableResponse({
        description: 'El servicio de enrutamiento no está disponible.',
    })
    // 500: error inesperado durante el cálculo de la ruta.
    @ApiInternalServerErrorResponse({
        description: 'Se produjo un error interno al calcular la ruta.',
    })
    calculateRoute(@Body() body: CalculateRouteDto) {
        return this.routingService.calculateRoute(
            body.origin,
            body.destination,
        );
    }

}