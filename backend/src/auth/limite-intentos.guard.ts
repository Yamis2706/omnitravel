import { HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { errorDominio } from '../common/errores';

/** Ventana y máximo de intentos de login/registro por IP. */
export const LIMITE_AUTH = { ttl: 60_000, limit: 10 };

/**
 * Limita los intentos en /auth para frenar ataques de fuerza bruta a
 * contraseñas. Responde con la convención de errores que la app ya entiende.
 */
@Injectable()
export class LimiteIntentosGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw errorDominio(
      HttpStatus.TOO_MANY_REQUESTS,
      'DEMASIADOS_INTENTOS',
      'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    );
  }
}
