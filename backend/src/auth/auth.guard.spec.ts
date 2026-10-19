import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { DatabaseService } from '../database/database.service';
import { AuthGuard } from './auth.guard';

const SECRETO = 'secreto-de-prueba-con-mas-de-32-caracteres!!';

function contexto(authorization?: string) {
  const request: Record<string, unknown> = {
    headers: authorization ? { authorization } : {},
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe('AuthGuard (módulos pois/reports/users/diagnóstico)', () => {
  const jwt = new JwtService({ secret: SECRETO });
  const query = jest.fn();
  const guard = new AuthGuard(jwt, { query } as unknown as DatabaseService);

  const fila = {
    id_usuario: '3',
    email: 'viajero1@omnitravel.test',
    estado_cuenta: 'activo',
    rol_id: '4',
    nombre_rol: 'moderador',
  };

  beforeEach(() => query.mockReset());

  it('acepta un JWT de /auth/login y carga el rol vigente desde la BD', async () => {
    // El token dice "viajero", pero en la BD ya es moderador: manda la BD.
    const token = await jwt.signAsync({
      sub: '3',
      email: fila.email,
      rol: 'viajero',
    });
    query.mockResolvedValue({ rows: [fila] });
    const { ctx, request } = contexto(`Bearer ${token}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual(fila);
    expect(request.usuario).toEqual({
      id: '3',
      email: fila.email,
      rol: 'moderador',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM usuario'),
      ['3'],
    );
  });

  it('rechaza peticiones sin token', async () => {
    await expect(guard.canActivate(contexto().ctx)).rejects.toMatchObject({
      status: 401,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const falso = await new JwtService({ secret: 'otro-secreto' }).signAsync({
      sub: '1',
      email: 'admin@x.co',
      rol: 'administrador',
    });
    await expect(
      guard.canActivate(contexto(`Bearer ${falso}`).ctx),
    ).rejects.toMatchObject({ status: 401 });
    expect(query).not.toHaveBeenCalled();
  });

  it('rechaza un token vencido', async () => {
    const vencido = await jwt.signAsync(
      { sub: '3', email: fila.email, rol: 'viajero' },
      { expiresIn: -10 },
    );
    await expect(
      guard.canActivate(contexto(`Bearer ${vencido}`).ctx),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('una cuenta suspendida queda fuera aunque su token siga vigente', async () => {
    const token = await jwt.signAsync({
      sub: '3',
      email: fila.email,
      rol: 'viajero',
    });
    query.mockResolvedValue({
      rows: [{ ...fila, estado_cuenta: 'suspendido' }],
    });
    await expect(
      guard.canActivate(contexto(`Bearer ${token}`).ctx),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('una cuenta eliminada de la BD queda fuera', async () => {
    const token = await jwt.signAsync({
      sub: '99',
      email: 'x@y.co',
      rol: 'viajero',
    });
    query.mockResolvedValue({ rows: [] });
    await expect(
      guard.canActivate(contexto(`Bearer ${token}`).ctx),
    ).rejects.toMatchObject({ status: 401 });
  });
});
