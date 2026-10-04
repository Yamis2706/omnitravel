import { Controller, Get } from '@nestjs/common';


// Define este archivo como un controlador de NestJS.
// El prefijo de las rutas será: /health
@Controller('health')
export class HealthController {

    // Define una petición HTTP GET para la ruta /health.
    // Es decir: GET http://localhost:3000/health
    @Get()
    check() {

        // Devuelve una respuesta JSON indicando que
        // el servicio está funcionando correctamente.
        return {
            status: 'ok',
        };
    }
}
