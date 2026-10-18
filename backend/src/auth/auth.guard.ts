
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
    AuthenticatedUser,
    SupabaseAuthService,
} from './supabase-auth.service';

type AuthenticatedRequest = Request & {
    user?: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly authService: SupabaseAuthService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        const authorization = request.headers.authorization;
        const match = authorization?.match(/^Bearer\s+(\S+)$/i);

        if (!match) {
            throw new UnauthorizedException(
                'Se requiere un token Bearer válido.',
            );
        }

        request.user = await this.authService.authenticate(match[1]);

        return true;
    }
}
