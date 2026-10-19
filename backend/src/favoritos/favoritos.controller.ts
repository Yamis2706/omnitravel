import { Controller, Delete, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, UsuarioActual, type UsuarioToken } from '../auth/jwt-auth.guard';
import { FavoritosService } from './favoritos.service';

/** Guardados del viajero (pestaña «Guardados»). Todas las rutas exigen sesión. */
@ApiTags('favoritos')
@ApiBearerAuth('access-token')
@Controller('favoritos')
@UseGuards(JwtAuthGuard)
export class FavoritosController {
  constructor(private readonly favoritos: FavoritosService) { }

  // GET /favoritos → ['12', '5', …]
  @Get()
  listar(@UsuarioActual() usuario: UsuarioToken) {
    return this.favoritos.listar(usuario.id);
  }

  // PUT /favoritos/:poiId — idempotente
  @Put(':poiId')
  guardar(@UsuarioActual() usuario: UsuarioToken, @Param('poiId', ParseIntPipe) poiId: number) {
    return this.favoritos.guardar(usuario.id, poiId);
  }

  // DELETE /favoritos/:poiId — idempotente
  @Delete(':poiId')
  quitar(@UsuarioActual() usuario: UsuarioToken, @Param('poiId', ParseIntPipe) poiId: number) {
    return this.favoritos.quitar(usuario.id, poiId);
  }
}
