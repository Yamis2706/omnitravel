import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module';
import {
  origenesCors,
  revisarSecretoJwt,
  telemetriaActiva,
} from './config/seguridad';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Importar AppModule ya cargó backend/.env (ConfigModule.forRoot).
  const secreto = revisarSecretoJwt(
    process.env.JWT_SECRET,
    process.env.NODE_ENV,
  );
  if (secreto.error) {
    throw new Error(secreto.error);
  }
  if (secreto.advertencia) {
    logger.warn(secreto.advertencia);
  }

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    telemetriaActiva(process.env) ? { instrument: ObserveInstrument } : {},
  );
  // Las fotos de evidencia llegan en base64 (≤ 5 MB → ~6,7 MB en JSON).
  app.useBodyParser('json', { limit: '8mb' });
  // Solo afecta a clientes web (Expo web); la app nativa no usa CORS.
  app.enableCors({ origin: origenesCors(process.env.CORS_ORIGINS) });
  // Validación de DTOs (class-validator). Los cuerpos tipados con interfaces
  // (auth, reportes, evidencias, rutas) no se ven afectados: los validan sus servicios.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Documentación interactiva en /api/docs (aporte de main).
  const swagger = new DocumentBuilder()
    .setTitle('OmniTravel API')
    .setDescription(
      'Backend de OmniTravel. Los endpoints protegidos requieren el JWT de POST /auth/login en formato Bearer.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, swagger),
  );

  app.enableShutdownHooks();

  const puerto = process.env.PORT ?? 3000;
  await app.listen(puerto);
  logger.log(`OmniTravel API escuchando en el puerto ${puerto}`);
}
void bootstrap();
