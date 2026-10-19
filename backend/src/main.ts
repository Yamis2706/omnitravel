import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
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
  app.enableShutdownHooks();

  const puerto = process.env.PORT ?? 3000;
  await app.listen(puerto);
  logger.log(`OmniTravel API escuchando en el puerto ${puerto}`);
}
void bootstrap();
