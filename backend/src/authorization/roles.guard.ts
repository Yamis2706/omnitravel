
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/supabase-auth.service';
import { AppRole, ROLES_KEY } from './roles.decorator';

type AuthenticatedRequest = Request & {
    user?: AuthenticatedUser;
};

const APP_ROLES: readonly AppRole[] = [
    'viajero',
    'colaborador',
    'establecimiento',
    'moderador',
    'administrador',
];

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Si no se declararon roles, este guard no restringe el acceso.
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request =
            context.switchToHttp().getRequest<AuthenticatedRequest>();

        const user = request.user;

        if (!user) {
            throw new UnauthorizedException(
                'Se requiere autenticación para acceder a este recurso.',
            );
        }

        // Validar que el rol recibido corresponda a uno conocido.
        if (!APP_ROLES.includes(user.nombre_rol as AppRole)) {
            throw new ForbiddenException(
                'El usuario no tiene un rol válido para esta operación.',
            );
        }

        if (!requiredRoles.includes(user.nombre_rol as AppRole)) {
            throw new ForbiddenException(
                'No tienes permisos para realizar esta operación.',
            );
        }

        return true;
    }
}
