import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, type Credenciales } from './auth.service';
import { LIMITE_AUTH, LimiteIntentosGuard } from './limite-intentos.guard';

// Máximo de intentos por IP para frenar ataques de fuerza bruta.
@UseGuards(LimiteIntentosGuard)
@Throttle({ default: LIMITE_AUTH })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register  { email, password }
  @Post('register')
  register(@Body() body: Credenciales) {
    return this.authService.registrar(body);
  }

  // POST /auth/login  { email, password }
  @Post('login')
  @HttpCode(200)
  login(@Body() body: Credenciales) {
    return this.authService.iniciarSesion(body);
  }
}
