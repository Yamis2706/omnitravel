import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  // Las fotos de evidencia llegan en base64 (≤ 5 MB → ~6,7 MB en JSON).
  app.useBodyParser('json', { limit: '8mb' });
  // Permite llamadas desde la app en modo web (npx expo start --web).
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
