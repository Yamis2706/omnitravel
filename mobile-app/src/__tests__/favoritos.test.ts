import {
  cargarFavoritos,
  guardarFavorito,
  quitarFavorito,
} from '../services/favoritos';
import {
  listarBarrerasComunitarias,
  listarMisReportes,
  listarReportesModeracion,
} from '../services/reportes';
import { ApiError } from '../services/api/client';

const mockApiFetch = jest.fn();
jest.mock('../services/api/client', () => {
  const real = jest.requireActual('../services/api/client');
  return {
    ...real,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  };
});
jest.mock('expo-secure-store', () => ({}));

beforeEach(() => mockApiFetch.mockReset());

describe('Guardados vía backend', () => {
  it('lee la lista de GET /favoritos como strings', async () => {
    mockApiFetch.mockResolvedValue(['5', 2]);
    await expect(cargarFavoritos()).resolves.toEqual(['5', '2']);
    expect(mockApiFetch.mock.calls[0][0]).toBe('/favoritos');
  });

  it('guarda con PUT y quita con DELETE sobre /favoritos/:id', async () => {
    mockApiFetch.mockResolvedValue({});
    await guardarFavorito('7');
    await quitarFavorito('7');
    expect(mockApiFetch.mock.calls[0]).toEqual([
      '/favoritos/7',
      { method: 'PUT' },
    ]);
    expect(mockApiFetch.mock.calls[1]).toEqual([
      '/favoritos/7',
      { method: 'DELETE' },
    ]);
  });

  it('muestra el mensaje sin el código técnico del backend', async () => {
    mockApiFetch.mockRejectedValue(
      new ApiError('POI_NO_ENCONTRADO: El lugar no existe.', 404),
    );
    await expect(guardarFavorito('999')).rejects.toThrow('El lugar no existe.');
  });
});

describe('Listados del viajero y moderación', () => {
  const FILA = {
    id_reporte: 3,
    poi_id: 4,
    tipo: 'reporte_barrera',
    estado: 'pendiente_validacion',
    descripcion: null,
    es_critico: true,
    fecha_creacion: '2026-10-18T00:00:00Z',
    confirmaciones: 2,
  };

  it('Mis reportes usa GET /reportes/mios y mapea el resumen', async () => {
    mockApiFetch.mockResolvedValue([FILA]);
    await expect(listarMisReportes()).resolves.toEqual([
      {
        id: '3',
        poiId: '4',
        tipo: 'reporte_barrera',
        estado: 'pendiente_validacion',
        descripcion: '',
        esCritico: true,
        fechaCreacion: '2026-10-18T00:00:00Z',
        confirmaciones: 2,
      },
    ]);
    expect(mockApiFetch.mock.calls[0][0]).toBe('/reportes/mios');
  });

  it('las barreras del mapa vienen de GET /reportes/barreras', async () => {
    mockApiFetch.mockResolvedValue([]);
    await listarBarrerasComunitarias();
    expect(mockApiFetch.mock.calls[0][0]).toBe('/reportes/barreras');
  });

  it('el filtro «Todos» de moderación no envía estado', async () => {
    mockApiFetch.mockResolvedValue([]);
    await listarReportesModeracion(null);
    await listarReportesModeracion('pendiente_validacion');
    expect(mockApiFetch.mock.calls[0][0]).toBe('/moderacion/reportes');
    expect(mockApiFetch.mock.calls[1][0]).toBe(
      '/moderacion/reportes?estado=pendiente_validacion',
    );
  });
});
