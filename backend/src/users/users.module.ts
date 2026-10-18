
// este mmódulo importa AuthModule para poder utilizar el guard que ya implementamos

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';

@Module({
    imports: [AuthModule],
    controllers: [UsersController],
})
export class UsersModule { }
