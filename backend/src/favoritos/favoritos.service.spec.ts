import { HttpException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { FavoritosService } from './favoritos.service';

describe('FavoritosService', () => {
  let query: jest.Mock;
  let servicio: FavoritosService;

  beforeEach(() => {
    query = jest.fn();
    servicio = new FavoritosService({ query } as unknown as DataSource);
  });

  it('lista solo los guardados del usuario del token', async () => {
    query.mockResolvedValueOnce([{ poi_id: '5' }, { poi_id: '2' }]);

    await expect(servicio.listar('11')).resolves.toEqual(['5', '2']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('where usuario_id = $1'), ['11']);
  });

  it('guardar es idempotente (on conflict do nothing)', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]).mockResolvedValueOnce([]);

    await expect(servicio.guardar('11', 5)).resolves.toEqual({ guardado: true });
    expect(query.mock.calls[1][0]).toContain('on conflict (usuario_id, poi_id) do nothing');
    expect(query.mock.calls[1][1]).toEqual(['11', 5]);
  });

  it('guardar responde 404 POI_NO_ENCONTRADO si el lugar no existe', async () => {
    query.mockResolvedValueOnce([]);

    const error = await servicio.guardar('11', 999).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(404);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('quitar borra solo la fila del dueño', async () => {
    query.mockResolvedValueOnce([]);

    await expect(servicio.quitar('11', 5)).resolves.toEqual({ guardado: false });
    expect(query).toHaveBeenCalledWith(
      'delete from favorito where usuario_id = $1 and poi_id = $2',
      ['11', 5],
    );
  });
});
