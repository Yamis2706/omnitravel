import type { CaracteristicaAccesibilidad } from '../services/types';
import {
  BORRADOR_INICIAL,
  construirCaracteristicas,
  contarValoresRespondidos,
  validarPaso1,
  validarPaso2,
  type BorradorReporte,
} from '../utils/reporteValidacion';

const CATALOGO: CaracteristicaAccesibilidad[] = [
  {
    id: 'ancho_puerta',
    nombre: 'Ancho de puerta',
    tipoValor: 'NUMERICO',
    unidad: 'cm',
    icono: 'resize-outline',
    idBd: 1,
  },
  {
    id: 'tiene_rampa',
    nombre: 'Rampa',
    tipoValor: 'BOOLEANO',
    icono: 'arrow-up-outline',
    idBd: 2,
  },
  {
    id: 'nota_extra',
    nombre: 'Nota',
    tipoValor: 'TEXTO',
    icono: 'text-outline',
    idBd: 3,
  },
  {
    id: 'sin_id_fisico',
    nombre: 'Sin id (mock)',
    tipoValor: 'BOOLEANO',
    icono: 'text-outline',
  },
];

function borrador(parcial: Partial<BorradorReporte>): BorradorReporte {
  return { ...BORRADOR_INICIAL, ...parcial };
}

describe('validarPaso1', () => {
  it('exige nombre y tipo para un lugar nuevo', () => {
    const errores = validarPaso1(borrador({ modo: 'nuevo' }));
    expect(errores).toHaveLength(2);
  });

  it('acepta un lugar nuevo completo', () => {
    const errores = validarPaso1(
      borrador({ modo: 'nuevo', nombre: 'Centro Cultural', tipoPoi: 'museo' }),
    );
    expect(errores).toEqual([]);
  });

  it('exige seleccionar un lugar al actualizar', () => {
    expect(validarPaso1(borrador({ modo: 'actualizacion' }))).toHaveLength(1);
    expect(
      validarPaso1(borrador({ modo: 'actualizacion', poiId: '5' })),
    ).toEqual([]);
  });
});

describe('validarPaso2', () => {
  it('exige GPS y descripción para un lugar nuevo', () => {
    const errores = validarPaso2(borrador({ modo: 'nuevo' }));
    expect(errores).toHaveLength(2);
  });

  it('acepta un lugar nuevo con coordenadas y descripción', () => {
    const errores = validarPaso2(
      borrador({
        modo: 'nuevo',
        lat: 4.53389,
        lon: -75.68111,
        descripcion: 'La entrada tiene rampa',
      }),
    );
    expect(errores).toEqual([]);
  });

  it('no exige coordenadas al actualizar un lugar existente', () => {
    const errores = validarPaso2(
      borrador({
        modo: 'actualizacion',
        poiId: '5',
        descripcion: 'Corrijo el ancho de puerta',
      }),
    );
    expect(errores).toEqual([]);
  });
});

describe('construirCaracteristicas', () => {
  it('convierte booleanos, numéricos (con coma o punto) y texto', () => {
    const valores = construirCaracteristicas(CATALOGO, {
      tiene_rampa: { booleano: false },
      ancho_puerta: { numerico: '90,5' },
      nota_extra: { texto: '  Entrada lateral  ' },
    });

    expect(valores).toEqual([
      { caracteristicaId: 1, valorNumerico: 90.5 },
      { caracteristicaId: 2, valorBooleano: false },
      { caracteristicaId: 3, valorTexto: 'Entrada lateral' },
    ]);
  });

  it('omite valores vacíos, inválidos y sin id físico', () => {
    const valores = construirCaracteristicas(CATALOGO, {
      ancho_puerta: { numerico: 'abc' },
      nota_extra: { texto: '   ' },
      sin_id_fisico: { booleano: true },
    });

    expect(valores).toEqual([]);
  });

  it('incluye el valor booleano false (negar también es información)', () => {
    const valores = construirCaracteristicas(CATALOGO, {
      tiene_rampa: { booleano: false },
    });
    expect(valores).toEqual([{ caracteristicaId: 2, valorBooleano: false }]);
  });
});

describe('contarValoresRespondidos', () => {
  it('cuenta solo los valores con contenido', () => {
    expect(
      contarValoresRespondidos({
        tiene_rampa: { booleano: true },
        ancho_puerta: { numerico: '' },
        nota_extra: { texto: 'ok' },
      }),
    ).toBe(2);
  });
});
