
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RolesGuard } from '../authorization/roles.guard';
import { AuthGuard } from './auth.guard';
import { SupabaseAuthService } from './supabase-auth.service';

@Module({
    imports: [DatabaseModule],
    providers: [                // providers permite que NestJS cree y administre RolesGuard
        SupabaseAuthService,
        AuthGuard,
        RolesGuard],
    exports: [                  // exports: permite que otros modulos que importen AuthModule puedan utilizarlo
        SupabaseAuthService,
        AuthGuard,
        RolesGuard,
    ],

})
export class AuthModule { }
