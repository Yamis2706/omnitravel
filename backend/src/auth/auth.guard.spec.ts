
import {
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { SupabaseAuthService } from './supabase-auth.service';

describe('AuthGuard', () => {
    let guard: AuthGuard;
    let authService: {
        authenticate: jest.Mock;
    };

    const createContext = (
        authorization?: string,
    ): ExecutionContext => {
        const request = {
            headers: authorization
                ? { authorization }
                : {},
        };

        return {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        } as unknown as ExecutionContext;
    };

    beforeEach(() => {
        authService = {
            authenticate: jest.fn(),
        };

        guard = new AuthGuard(
            authService as unknown as SupabaseAuthService,
        );
    });

    it('rechaza una petición sin token con 401', async () => {
        await expect(
            guard.canActivate(createContext()),
        ).rejects.toThrow(UnauthorizedException);

        expect(authService.authenticate).not.toHaveBeenCalled();
    });

    it('rechaza un encabezado que no usa Bearer', async () => {
        await expect(
            guard.canActivate(
                createContext('Basic credenciales'),
            ),
        ).rejects.toThrow(UnauthorizedException);

        expect(authService.authenticate).not.toHaveBeenCalled();
    });

    it('valida el token y asigna el usuario a la petición', async () => {
        const user = {
            id: 'usuario-prueba',
            nombre_rol: 'administrador',
        };

        authService.authenticate.mockResolvedValue(user);

        const context = createContext('Bearer token-de-prueba');

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(authService.authenticate).toHaveBeenCalledWith(
            'token-de-prueba',
        );

        expect(
            context.switchToHttp().getRequest().user,
        ).toEqual(user);
    });

    it('propaga el error cuando la autenticación falla', async () => {
        authService.authenticate.mockRejectedValue(
            new UnauthorizedException(),
        );

        await expect(
            guard.canActivate(createContext('Bearer token-invalido')),
        ).rejects.toThrow(UnauthorizedException);
    });
});
