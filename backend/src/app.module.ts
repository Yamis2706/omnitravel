import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { RoutingModule } from './routing/routing.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PoisModule } from './pois/pois.module';
import { DatabaseDiagnosticModule } from './database/database-diagnostic.module';
import { ReportsModule } from './reports/reports.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({  // carga las variables del archivo .env predeterminado
      isGlobal: true,        // permite que los módulos de NestJS accedan a la configuración sin importar ConfigModule individualmente en cada módulo
    }),
    DatabaseModule,
    DatabaseDiagnosticModule,
    AuthModule,
    ReportsModule,
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    HealthModule,
    RoutingModule,
    UsersModule,
    PoisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
