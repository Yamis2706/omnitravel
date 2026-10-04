import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';


// Define un módulo de NestJS.
// Los módulos permiten organizar y agrupar funcionalidades
// relacionadas dentro de la aplicación.
@Module({

  // Registra el HealthController dentro de este módulo.
  // Esto permite que NestJS conozca y pueda utilizar
  // las rutas definidas en HealthController.
  controllers: [HealthController]
})

// Define el módulo encargado de la funcionalidad de salud.
// En este caso, contiene el HealthController.
export class HealthModule { }
