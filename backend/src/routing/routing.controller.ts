import { Body, Controller, Post } from '@nestjs/common';
import { RoutingService } from './routing.service';

@Controller('routes')
export class RoutingController {
    constructor(private readonly routingService: RoutingService) { }

    @Post()
    calculateRoute(
        @Body()
        body: {
            origin: [number, number];
            destination: [number, number];
        },
    ) {
        return this.routingService.calculateRoute(
            body.origin,
            body.destination,
        );
    }
}