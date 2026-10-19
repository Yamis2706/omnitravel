import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FavoritosController } from './favoritos.controller';
import { FavoritosService } from './favoritos.service';

@Module({
  imports: [AuthModule],
  controllers: [FavoritosController],
  providers: [FavoritosService],
})
export class FavoritosModule { }
