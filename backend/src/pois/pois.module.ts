
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PoisController } from './pois.controller';
import { PoisService } from './pois.service';

@Module({
    imports: [AuthModule],
    controllers: [PoisController],
    providers: [PoisService],
})
export class PoisModule { }

