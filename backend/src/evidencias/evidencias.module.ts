import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EvidenciasController } from './evidencias.controller';
import { EvidenciasService } from './evidencias.service';

@Module({
  imports: [AuthModule],
  controllers: [EvidenciasController],
  providers: [EvidenciasService],
})
export class EvidenciasModule { }
