import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { errorDominio } from '../common/errores';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedUser } from './authenticated-user';
import type { UsuarioToken } from './jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
  usuario?: UsuarioToken;
};

/**
 * Autenticación de los módulos pois, reports, users y diagnóstico.
 *
 * Verifica el JWT que emite este backend (`POST /auth/login`) y además carga
 * la cuenta y su rol desde la base: así `RolesGuard` decide con el rol
 * vigente y una cuenta suspendida queda fuera aunque su token siga vivo.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      throw errorDominio(
        HttpStatus.UNAUTHORIZED,
        'USUARIO_NO_VINCULADO',
        'Inicia sesión para continuar.',
      );
    }

    let payload: { sub: string; email: string; rol: string };
    try {
      payload = await this.jwt.verifyAsync(match[1]);
    } catch {
      throw errorDominio(
        HttpStatus.UNAUTHORIZED,
        'USUARIO_NO_VINCULADO',
        'Tu sesión expiró. Inicia sesión de nuevo.',
      );
    }

    const { rows } = await this.database.query<AuthenticatedUser>(
      `SELECT u.id_usuario::text AS id_usuario,
              u.email,
              u.estado_cuenta,
              u.rol_id::text AS rol_id,
              r.nombre_rol
         FROM usuario u
         JOIN rol r ON r.id_rol = u.rol_id
        WHERE u.id_usuario = $1`,
      [payload.sub],
    );
    const usuario = rows[0];

    if (!usuario) {
      throw errorDominio(
        HttpStatus.UNAUTHORIZED,
        'USUARIO_NO_VINCULADO',
        'Tu cuenta ya no existe. Inicia sesión de nuevo.',
      );
    }
    if (usuario.estado_cuenta !== 'activo') {
      throw errorDominio(
        HttpStatus.FORBIDDEN,
        'USER_INACTIVE',
        'La cuenta no está activa.',
      );
    }

    request.user = usuario;
    request.usuario = {
      id: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.nombre_rol,
    };
    return true;
  }
}
