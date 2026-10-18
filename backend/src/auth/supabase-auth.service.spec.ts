
import {
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { SupabaseAuthService } from './supabase-auth.service';

describe('SupabaseAuthService', () => {
    let service: SupabaseAuthService;

    const validAuthUserId = '123e4567-e89b-42d3-a456-426614174000';

    const authenticatedUser = {
        id_usuario: '1',
        auth_user_id: validAuthUserId,
        email: 'test@example.com',
        estado_cuenta: 'activo',
        rol_id: '1',
        nombre_rol: 'viajero',
    };

    const configMock = {
        getOrThrow: jest.fn((key: string) => {
            const values: Record<string, string> = {
                SUPABASE_URL: 'https://example.supabase.co',
                SUPABASE_ANON_KEY: 'test-anon-key',
            };

            if (!(key in values)) {
                throw new Error(`Missing config: ${key}`);
            }

            return values[key];
        }),
    };

    const databaseMock = {
        query: jest.fn(),
    };

    const originalFetch = global.fetch;

    beforeEach(async () => {
        jest.clearAllMocks();

        global.fetch = jest.fn() as jest.Mock;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SupabaseAuthService,
                {
                    provide: ConfigService,
                    useValue: configMock,
                },
                {
                    provide: DatabaseService,
                    useValue: databaseMock,
                },
            ],
        }).compile();

        service = module.get<SupabaseAuthService>(SupabaseAuthService);
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('debe autenticar un usuario con token válido y cuenta activa', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: validAuthUserId }),
        });

        databaseMock.query.mockResolvedValue({
            rows: [authenticatedUser],
        });

        await expect(service.authenticate('valid-token')).resolves.toEqual(
            authenticatedUser,
        );

        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.supabase.co/auth/v1/user',
            expect.objectContaining({
                method: 'GET',
                headers: {
                    apikey: 'test-anon-key',
                    Authorization: 'Bearer valid-token',
                },
            }),
        );

        expect(databaseMock.query).toHaveBeenCalledWith(
            expect.stringContaining(
                'WHERE u.auth_user_id = $1::uuid',
            ),
            [validAuthUserId],
        );
    });

    it.each([401, 403])(
        'debe rechazar un token inválido cuando Supabase responde %i',
        async (status) => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status,
            });

            await expect(
                service.authenticate('invalid-token'),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            expect(databaseMock.query).not.toHaveBeenCalled();
        },
    );

    it('debe responder 401 si la identidad no está vinculada a OmniTravel', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: validAuthUserId }),
        });

        databaseMock.query.mockResolvedValue({ rows: [] });

        await expect(
            service.authenticate('valid-token'),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('debe rechazar una cuenta inactiva', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: validAuthUserId }),
        });

        databaseMock.query.mockResolvedValue({
            rows: [
                {
                    ...authenticatedUser,
                    estado_cuenta: 'inactivo',
                },
            ],
        });

        await expect(
            service.authenticate('valid-token'),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('debe responder 503 si Supabase no está disponible', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
            new Error('Network error'),
        );

        await expect(
            service.authenticate('valid-token'),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);

        expect(databaseMock.query).not.toHaveBeenCalled();
    });

    it('debe responder 503 si Supabase devuelve un error inesperado', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 500,
        });

        await expect(
            service.authenticate('valid-token'),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('debe responder 503 si la respuesta de Supabase no contiene un UUID válido', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 'not-a-uuid' }),
        });

        await expect(
            service.authenticate('valid-token'),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);

        expect(databaseMock.query).not.toHaveBeenCalled();
    });


    it('debe responder 503 si PostgreSQL no está disponible', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                id: validAuthUserId,
            }),
        });

        databaseMock.query.mockRejectedValue(
            new ServiceUnavailableException(
                'No fue posible ejecutar la consulta en la base de datos.',
            ),
        );

        await expect(
            service.authenticate('valid-token'),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

});
