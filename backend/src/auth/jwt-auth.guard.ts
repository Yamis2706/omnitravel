import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { errorDominio } from '../common/errores';

/** Identidad extraída del JWT validado (nunca del cuerpo de la petición). */
export interface UsuarioToken {
  id: string;
  email: string;
  rol: string;
}

type RequestConUsuario = Request & { usuario?: UsuarioToken };

/** Exige `Authorization: Bearer <JWT>` vigente y firmado por este backend. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];

    if (tipo !== 'Bearer' || !token) {
      throw errorDominio(
        HttpStatus.UNAUTHORIZED,
        'USUARIO_NO_VINCULADO',
        'Inicia sesión para continuar.',
      );
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        rol: string;
      }>(token);
      request.usuario = { id: payload.sub, email: payload.email, rol: payload.rol };
      return true;
    } catch {
      throw errorDominio(
        HttpStatus.UNAUTHORIZED,
        'USUARIO_NO_VINCULADO',
        'Tu sesión expiró. Inicia sesión de nuevo.',
      );
    }
  }
}

/** Inyecta en el controlador el usuario autenticado por JwtAuthGuard. */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioToken => {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    return request.usuario as UsuarioToken;
  },
);
