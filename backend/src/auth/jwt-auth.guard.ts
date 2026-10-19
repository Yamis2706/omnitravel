import {
  ExecutionContext,
  Injectable,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from './auth.guard';

/** Identidad extraída del JWT validado (nunca del cuerpo de la petición). */
export interface UsuarioToken {
  id: string;
  email: string;
  rol: string;
}

type RequestConUsuario = Request & { usuario?: UsuarioToken };

/**
 * Guard de los módulos de la app (reportes, moderación, evidencias).
 *
 * Igual que `AuthGuard`: verifica el JWT de este backend y relee la cuenta en
 * la BD, de modo que una cuenta suspendida o eliminada queda fuera aunque su
 * token (24 h) siga vigente. Expone `request.usuario` para `@UsuarioActual()`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard {}

/** Inyecta en el controlador el usuario autenticado por JwtAuthGuard. */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioToken => {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    return request.usuario as UsuarioToken;
  },
);
