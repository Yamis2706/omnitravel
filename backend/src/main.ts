import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  // Se crea la aplicación Nest. `ObserveInstrument` se conserva para no
  // eliminar la instrumentación (observabilidad) que ya existía en el proyecto.
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // Validación global: se aplica a todos los endpoints que reciben datos
  // mediante DTOs con decoradores de class-validator.
  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: identifica las propiedades que no tienen decoradores de
      // validación en el DTO y las elimina del objeto recibido.
      whitelist: true,
      // forbidNonWhitelisted: rechaza la solicitud (400) cuando llegan
      // propiedades adicionales, en lugar de aceptarlas silenciosamente.
      forbidNonWhitelisted: true,
      // transform: transforma los datos recibidos a instancias de la clase
      // DTO (y convierte tipos primitivos cuando corresponde).
      transform: true,
    }),
  );

  // DocumentBuilder: define los metadatos de la API (título, descripción
  // y versión) que se muestran en la cabecera de la documentación Swagger.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OmniTravel API')
    .setDescription(
      'API del backend de OmniTravel. Los endpoints protegidos requieren un access token de Supabase en formato Bearer.',
    )
    .setVersion('1.0.0')
    // addBearerAuth(): registra el mecanismo de autenticación mediante token
    // Bearer (JWT). Habilita el botón "Authorize" en Swagger para pegar el
    // access token de Supabase. El nombre 'access-token' es el identificador
    // que los controladores deben referenciar con @ApiBearerAuth('access-token').
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  // SwaggerModule.createDocument(): genera el documento OpenAPI a partir de
  // los controladores y decoradores de la aplicación. Se define como función
  // (factory) para que se genere de forma diferida, cuando se necesite.
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  // SwaggerModule.setup(): publica la interfaz interactiva de Swagger en
  // la ruta /api/docs (por ejemplo, http://localhost:3000/api/docs).
  SwaggerModule.setup('api/docs', app, documentFactory);

  // Se levanta el servidor en el puerto definido en PORT, o en el 3000
  // por defecto si la variable de entorno no existe.
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();