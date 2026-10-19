import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EvidenciasModule } from './evidencias/evidencias.module';
import { HealthModule } from './health/health.module';
import { MapaModule } from './mapa/mapa.module';
import { ReportesModule } from './reportes/reportes.module';
import { RoutingModule } from './routing/routing.module';
import { opcionesSsl, telemetriaActiva } from './config/seguridad';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // PostgreSQL en AWS RDS (base omnitravel_db); la URL viene de DATABASE_URL.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        ssl: opcionesSsl(
          config.get<string>('DB_SSL'),
          config.get<string>('DB_SSL_CA'),
        ),
        autoLoadEntities: true,
        synchronize: false, // las tablas ya existen en AWS; no dejar que TypeORM las modifique
      }),
    }),
    // Telemetría externa: solo con credenciales propias del equipo.
    ...(telemetriaActiva(process.env)
      ? [
          ObserveModule.forRoot({
            appKey: process.env.OBSERVE_APP_KEY as string,
            appSecret: process.env.OBSERVE_APP_SECRET as string,
            serviceId: 'backend',
          }),
        ]
      : []),
    AuthModule,
    EvidenciasModule,
    HealthModule,
    MapaModule,
    ReportesModule,
    RoutingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
