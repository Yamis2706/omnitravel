import {
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class RoutingService {
    private readonly valhallaUrl =
        process.env.VALHALLA_URL ?? 'http://localhost:8002';

    async calculateRoute(
        origin: [number, number],
        destination: [number, number],
    ) {
        const requestBody = {
            locations: [
                {
                    lat: origin[1],
                    lon: origin[0],
                },
                {
                    lat: destination[1],
                    lon: destination[0],
                },
            ],
            costing: 'auto',
            units: 'kilometers',
        };

        try {
            const response = await fetch(`${this.valhallaUrl}/route`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const error = await response.text();

                throw new InternalServerErrorException(
                    `Valhalla respondió con ${response.status}: ${error}`,
                );
            }

            return response.json();
        } catch (error) {
            if (error instanceof InternalServerErrorException) {
                throw error;
            }

            throw new InternalServerErrorException(
                'No fue posible comunicarse con Valhalla',
            );
        }
    }
}