import { Body, Controller, Post } from '@nestjs/common';
import { RoutingService } from './routing.service';
import type { RestriccionesRuta } from './valhalla-payload';

interface SolicitudRuta {
    /** [latitud, longitud] del punto de partida. */
    origin: [number, number];
    /** [latitud, longitud] del destino. */
    destination: [number, number];
    /** Restricciones de accesibilidad derivadas del perfil de la persona. */
    restrictions?: RestriccionesRuta;
}

@Controller('routes')
export class RoutingController {
    constructor(private readonly routingService: RoutingService) { }

    @Post()
    calculateRoute(@Body() body: SolicitudRuta) {
        return this.routingService.calculateRoute(
            body?.origin,
            body?.destination,
            body?.restrictions ?? {},
        );
    }
}
