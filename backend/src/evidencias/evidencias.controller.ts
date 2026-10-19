import { Body, Controller, Get, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard, UsuarioActual, type UsuarioToken } from '../auth/jwt-auth.guard';
import { errorDominio } from '../common/errores';
import { EvidenciasService, PATRON_ARCHIVO, PATRON_USUARIO } from './evidencias.service';

@Controller('evidencias')
export class EvidenciasController {
  constructor(private readonly evidenciasService: EvidenciasService) { }

  // POST /evidencias  { base64, mimeType } → { storageKey }
  @Post()
  @UseGuards(JwtAuthGuard)
  subir(
    @UsuarioActual() usuario: UsuarioToken,
    @Body() body: { base64?: unknown; mimeType?: unknown },
  ) {
    return this.evidenciasService.guardar(usuario.id, body?.base64, body?.mimeType);
  }

  // GET /evidencias/archivo/:usuario/:archivo — lectura pública (evidencia comunitaria)
  @Get('archivo/:usuario/:archivo')
  archivo(
    @Param('usuario') usuario: string,
    @Param('archivo') archivo: string,
    @Res() res: Response,
  ) {
    // Los patrones impiden rutas como "../" fuera de la carpeta de evidencias.
    if (!PATRON_USUARIO.test(usuario) || !PATRON_ARCHIVO.test(archivo)) {
      throw errorDominio(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La foto no existe.');
    }
    res.sendFile(`${usuario}/${archivo}`, { root: this.evidenciasService.directorio }, (error) => {
      if (error && !res.headersSent) {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'NOT_FOUND',
          message: 'NOT_FOUND: La foto no existe.',
        });
      }
    });
  }
}
