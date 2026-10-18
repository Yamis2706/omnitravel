import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';

@Module({
    imports: [AuthModule],
    controllers: [RoutingController],
    providers: [RoutingService],
})
export class RoutingModule { }