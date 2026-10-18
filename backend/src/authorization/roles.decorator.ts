
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';  // identifica los metadatos donde NestJS almacena los roles autorizados

export type AppRole =    // restringe los roles válidados en TypeScript
    | 'viajero'
    | 'colaborador'
    | 'establecimiento'
    | 'moderador'
    | 'administrador';

export const Roles = (...roles: AppRole[]) =>   // permite declarar permisos directamnete en un controlador o método
    SetMetadata(ROLES_KEY, roles);
