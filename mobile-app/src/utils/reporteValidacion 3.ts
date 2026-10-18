import type {
  CaracteristicaAccesibilidad,
  ValorPropuestoReporte,
} from '../services/types';

/**
 * Lógica pura del wizard de reporte (U09/U10): validaciones por paso y
 * construcción de los valores de características que viajan a la RPC
 * `crear_reporte`. Separada de la pantalla para poder probarla con Jest.
 */

export type ModoReporte = 'nuevo' | 'actualizacion';

/** Valor en edición de una característica (borrador del formulario). */
export interface ValorBorrador {
  booleano?: boolean;
  numerico?: string;
  texto?: string;
}

/** Estado completo del formulario en edición. */
export interface BorradorReporte {
  modo: ModoReporte;
  poiId: string | null;
  nombre: string;
  tipoPoi: string;
  direccion: string;
  lat: number | null;
  lon: number | null;
  descripcion: string;
  esCritico: boolean;
  valores: Record<string, ValorBorrador>;
}

export const BORRADOR_INICIAL: BorradorReporte = {
  modo: 'nuevo',
  poiId: null,
  nombre: '',
  tipoPoi: '',
  direccion: '',
  lat: null,
  lon: null,
  descripcion: '',
  esCritico: false,
  valores: {},
};

/** Opciones de tipo de lugar ofrecidas por el wizard (valores de la BD). */
export const TIPOS_POI: { valor: string; etiqueta: string }[] = [
  { valor: 'museo', etiqueta: 'Museo' },
  { valor: 'parque', etiqueta: 'Parque' },
  { valor: 'hotel', etiqueta: 'Hotel' },
  { valor: 'restaurante', etiqueta: 'Restaurante' },
  { valor: 'atraccion', etiqueta: 'Atracción' },
];

/** Paso 1 — tipo de reporte y datos de identificación del lugar. */
export function validarPaso1(borrador: BorradorReporte): string[] {
  const errores: string[] = [];

  if (borrador.modo === 'actualizacion') {
    if (!borrador.poiId) {
      errores.push('Selecciona el lugar que quieres actualizar.');
    }
    return errores;
  }

  if (!borrador.nombre.trim()) {
    errores.push('Escribe el nombre del lugar.');
  }
  if (!borrador.tipoPoi) {
    errores.push('Elige el tipo de lugar.');
  }
  return errores;
}

/** Paso 2 — ubicación, evidencia y descripción. */
export function validarPaso2(borrador: BorradorReporte): string[] {
  const errores: string[] = [];

  if (borrador.modo === 'nuevo') {
    if (borrador.lat === null || borrador.lon === null) {
      errores.push(
        'Captura la ubicación del lugar con el botón de GPS (o escríbela).',
      );
    }
  }
  if (!borrador.descripcion.trim()) {
    errores.push('Describe brevemente lo que encontraste.');
  }
  return errores;
}

/**
 * Convierte los valores en edición a la lista que espera la RPC. Solo viajan
 * las características respondidas y con id físico conocido (`idBd`); los
 * decimales aceptan coma o punto.
 */
export function construirCaracteristicas(
  catalogo: CaracteristicaAccesibilidad[],
  valores: Record<string, ValorBorrador>,
): ValorPropuestoReporte[] {
  const resultado: ValorPropuestoReporte[] = [];

  for (const caracteristica of catalogo) {
    if (caracteristica.idBd === undefined) {
      continue;
    }
    const borrador = valores[caracteristica.id];
    if (!borrador) {
      continue;
    }

    if (caracteristica.tipoValor === 'BOOLEANO') {
      if (borrador.booleano === undefined) {
        continue;
      }
      resultado.push({
        caracteristicaId: caracteristica.idBd,
        valorBooleano: borrador.booleano,
      });
      continue;
    }

    if (caracteristica.tipoValor === 'NUMERICO') {
      const numero = Number.parseFloat(
        (borrador.numerico ?? '').replace(',', '.'),
      );
      if (Number.isNaN(numero)) {
        continue;
      }
      resultado.push({
        caracteristicaId: caracteristica.idBd,
        valorNumerico: numero,
      });
      continue;
    }

    const texto = (borrador.texto ?? '').trim();
    if (!texto) {
      continue;
    }
    resultado.push({
      caracteristicaId: caracteristica.idBd,
      valorTexto: texto,
    });
  }

  return resultado;
}

/** Número de características respondidas (resumen del paso 3). */
export function contarValoresRespondidos(
  valores: Record<string, ValorBorrador>,
): number {
  return Object.values(valores).filter(
    (valor) =>
      valor.booleano !== undefined ||
      (valor.numerico ?? '').trim() !== '' ||
      (valor.texto ?? '').trim() !== '',
  ).length;
}
