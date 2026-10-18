import {
    Controller,
    Get,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/supabase-auth.service';

// Extiende el Request de Express para incluir `user`, que el AuthGuard
// adjunta después de validar el access token de Supabase.
type AuthenticatedRequest = Request & {
    user: AuthenticatedUser;
};

// @ApiTags: agrupa todos los endpoints de este controlador bajo la
// sección "Usuarios" en la interfaz de Swagger.
@ApiTags('Usuarios')
// @ApiBearerAuth: indica que los endpoints requieren autenticación Bearer.
// El nombre 'access-token' debe coincidir con el registrado en
// addBearerAuth() dentro de main.ts; así Swagger envía el token
// que se pega en el botón "Authorize".
@ApiBearerAuth('access-token')
@Controller('users')
// El AuthGuard valida el token antes de ejecutar cualquier método.
@UseGuards(AuthGuard)
export class UsersController {
    @Get('me')
    // @ApiOperation: explica para qué sirve el endpoint (resumen corto
    // y descripción detallada que se muestran en Swagger).
    @ApiOperation({
        summary: 'Consultar el usuario autenticado',
        description:
            'Devuelve los datos básicos del usuario autenticado mediante un access token de Supabase.',
    })
    // @ApiOkResponse: documenta la respuesta exitosa (200) con los cinco
    // campos que devuelve, sus tipos y valores de ejemplo.
    @ApiOkResponse({
        description: 'Información del usuario autenticado.',
        schema: {
            type: 'object',
            properties: {
                id_usuario: {
                    type: 'string',
                    example: '3',
                },
                email: {
                    type: 'string',
                    example: 'viajero1@omnitravel.test',
                },
                estado_cuenta: {
                    type: 'string',
                    example: 'activo',
                },
                rol_id: {
                    type: 'string',
                    example: '1',
                },
                nombre_rol: {
                    type: 'string',
                    example: 'viajero',
                },
            },
            // Campos que siempre estarán presentes en la respuesta.
            required: [
                'id_usuario',
                'email',
                'estado_cuenta',
                'rol_id',
                'nombre_rol',
            ],
        },
    })
    // @ApiUnauthorizedResponse: documenta los casos en que se rechaza la
    // solicitud (401): token ausente o inválido, identidad no vinculada
    // o cuenta no autorizada.
    @ApiUnauthorizedResponse({
        description:
            'Token de acceso ausente o inválido, identidad no vinculada o cuenta no autorizada.',
    })
    getCurrentUser(@Req() request: AuthenticatedRequest) {
        // `user` fue adjuntado al request por el AuthGuard.
        const user = request.user;

        // Se devuelven solo los campos básicos, sin exponer el resto
        // de la información interna del usuario.
        return {
            id_usuario: user.id_usuario,
            email: user.email,
            estado_cuenta: user.estado_cuenta,
            rol_id: user.rol_id,
            nombre_rol: user.nombre_rol,
        };
    }
}