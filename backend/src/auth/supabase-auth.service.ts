
import {
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

export interface AuthenticatedUser {
    id_usuario: string;
    auth_user_id: string;
    email: string;
    estado_cuenta: string;
    rol_id: string;
    nombre_rol: string;
}

interface SupabaseAuthUser {
    id: string;
}

@Injectable()
export class SupabaseAuthService {
    constructor(
        private readonly config: ConfigService,
        private readonly database: DatabaseService,
    ) { }

    async authenticate(accessToken: string): Promise<AuthenticatedUser> {
        const supabaseUrl = this.config
            .getOrThrow<string>('SUPABASE_URL')
            .replace(/\/+$/, '');

        const apiKey = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');

        let response: Response;

        try {
            response = await fetch(`${supabaseUrl}/auth/v1/user`, {
                method: 'GET',
                headers: {
                    apikey: apiKey,
                    Authorization: `Bearer ${accessToken}`,
                },
                signal: AbortSignal.timeout(5000),
            });
        } catch {
            // Si Auth no está disponible, no conceder acceso.
            throw new ServiceUnavailableException(
                'El servicio de autenticación no está disponible.',
            );
        }

        if (response.status === 401 || response.status === 403) {
            throw new UnauthorizedException('Token inválido o expirado.');
        }

        if (!response.ok) {
            throw new ServiceUnavailableException(
                'No fue posible validar la identidad.',
            );
        }

        let authUser: SupabaseAuthUser;

        try {
            const body: unknown = await response.json();

            if (
                typeof body !== 'object' ||
                body === null ||
                !('id' in body) ||
                typeof body.id !== 'string' ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    body.id,
                )
            ) {
                throw new Error('Respuesta de Auth inválida');
            }

            authUser = { id: body.id };
        } catch {
            throw new ServiceUnavailableException(
                'La respuesta de autenticación no es válida.',
            );
        }

        const result = await this.database.query<AuthenticatedUser>(
            `SELECT
         u.id_usuario::text AS id_usuario,
         u.auth_user_id::text AS auth_user_id,
         u.email,
         u.estado_cuenta,
         u.rol_id::text AS rol_id,
         r.nombre_rol
       FROM public.usuario u
       INNER JOIN public.rol r ON r.id_rol = u.rol_id
       WHERE u.auth_user_id = $1::uuid
       LIMIT 1`,
            [authUser.id],
        );

        const user = result.rows[0];

        if (!user) {
            throw new UnauthorizedException(
                'La identidad no está vinculada a una cuenta de OmniTravel.',
            );
        }

        if (user.estado_cuenta !== 'activo') {
            throw new UnauthorizedException('La cuenta no está activa.');
        }

        return user;
    }
}
