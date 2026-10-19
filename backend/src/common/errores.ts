import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error de dominio con la convención que la app ya interpreta:
 * `message = 'CODIGO: mensaje en español'` (ver mobile-app/src/services/reportes.ts).
 */
export function errorDominio(
  status: HttpStatus,
  codigo: string,
  mensaje: string,
): HttpException {
  return new HttpException(
    { statusCode: status, error: codigo, message: `${codigo}: ${mensaje}` },
    status,
  );
}
