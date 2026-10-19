
import {
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: { getAllAndOverride: jest.Mock };

    const createContext = (user?: {
        nombre_rol: string;
    }): ExecutionContext => {
        const request = { user };

        return {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        } as unknown as ExecutionContext;
    };

    beforeEach(() => {
        reflector = {
            getAllAndOverride: jest.fn(),
        };

        guard = new RolesGuard(
            reflector as unknown as Reflector,
        );
    });

    it('permite el acceso cuando el rol está autorizado', () => {
        reflector.getAllAndOverride.mockReturnValue(['moderador']);

        const context = createContext({
            nombre_rol: 'moderador',
        });

        expect(guard.canActivate(context)).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );
    });

    it('rechaza con 403 cuando el usuario tiene otro rol', () => {
        reflector.getAllAndOverride.mockReturnValue(['administrador']);

        const context = createContext({
            nombre_rol: 'viajero',
        });

        expect(() => guard.canActivate(context)).toThrow(
            ForbiddenException,
        );
    });

    it('rechaza con 401 cuando no hay usuario autenticado', () => {
        reflector.getAllAndOverride.mockReturnValue(['administrador']);

        const context = createContext();

        expect(() => guard.canActivate(context)).toThrow(
            UnauthorizedException,
        );
    });

    it('rechaza con 403 cuando el rol del usuario es desconocido', () => {
        reflector.getAllAndOverride.mockReturnValue(['administrador']);

        const context = createContext({
            nombre_rol: 'superusuario',
        });

        expect(() => guard.canActivate(context)).toThrow(
            ForbiddenException,
        );
    });

    it('permite el acceso a un administrador cuando se requiere ese rol', () => {
        reflector.getAllAndOverride.mockReturnValue(['administrador']);

        const context = createContext({
            nombre_rol: 'administrador',
        });

        expect(guard.canActivate(context)).toBe(true);
    });

    it('permite el acceso cuando no se declararon roles', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);

        const context = createContext({
            nombre_rol: 'viajero',
        });

        expect(guard.canActivate(context)).toBe(true);
    });

    it('permite el acceso cuando la lista de roles está vacía', () => {
        reflector.getAllAndOverride.mockReturnValue([]);

        const context = createContext({
            nombre_rol: 'viajero',
        });

        expect(guard.canActivate(context)).toBe(true);
    });
});

