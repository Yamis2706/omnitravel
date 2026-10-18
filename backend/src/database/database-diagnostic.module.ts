
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from './database.module';
import { DatabaseController } from './database.controller';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [DatabaseController],
})
export class DatabaseDiagnosticModule { }
