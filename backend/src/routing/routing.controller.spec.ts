import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoutingController } from './routing.controller';

describe('RoutingController', () => {
  it('exige sesión (JwtAuthGuard) en POST /routes', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, RoutingController) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
  });
});
