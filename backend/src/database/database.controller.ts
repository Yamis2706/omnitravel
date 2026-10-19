
import {
    Controller,
    Get,
    ServiceUnavailableException,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { DatabaseService } from './database.service';
import { RolesGuard } from '../authorization/roles.guard';
import { Roles } from '../authorization/roles.decorator';

@ApiTags('Base de datos')
@ApiBearerAuth('access-token')
@Controller('database')
@UseGuards(AuthGuard, RolesGuard)
export class DatabaseController {
    constructor(private readonly databaseService: DatabaseService) { }

    @Get('diagnostic')
    @Roles('administrador')
    @ApiUnauthorizedResponse({
        description: 'Token de acceso ausente o inválido.',
    })
    async diagnostic() {
        try {
            const result = await this.databaseService.query<{
                postgres_version: string;
                postgis_version: string | null;
            }>(`
                SELECT
                    version() AS postgres_version,
                    PostGIS_Full_Version() AS postgis_version
            `);

            return {
                status: 'ok',
                database: result.rows[0],
            };
        } catch {
            throw new ServiceUnavailableException(
                'No fue posible completar el diagnóstico de la base de datos.',
            );
        }
    }
}
