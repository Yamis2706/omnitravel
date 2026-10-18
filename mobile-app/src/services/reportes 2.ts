import { supabase } from './supabase';
import type {
  AccionModeracion,
  ReporteComunitario,
  ReporteModeracion,
  ResultadoConfirmacion,
  ValorCaracteristicaReporte,
  ValorPropuestoReporte,
} from './types';

/**
 * Proceso 1 — Validación colaborativa (escritura).
 *
 * El front NO inserta filas directamente: ejecuta las funciones RPC
 * transaccionales definidas en
 * `docs/gestion/supabase-sara/peticiones-front-entrega2.sql`
 * (`crear_reporte`, `confirmar_reporte`, `decidir_reporte`,
 * `listar_reportes_moderacion`). Así el consenso de 3 confirmaciones es
 * atómico (RNF-18/23/28), la anti-autoconfirmación vive en la base y la
 * migración futura al backend NestJS no cambia el contrato del front.
 */

/** Códigos de error que la BD devuelve como `'CODIGO: mensaje'`. */
export type CodigoErrorReporte =
  | 'USUARIO_NO_VINCULADO'
  | 'AUTOCONFIRMACION'
  | 'CONFIRMACION_DUPLICADA'
  | 'REPORTE_RECHAZADO'
  | 'REPORTE_NO_ENCONTRADO'
  | 'POI_NO_ENCONTRADO'
  | 'ACCESO_DENEGADO'
  | 'MOTIVO_REQUERIDO'
  | 'ACCION_INVALIDA'
  | 'DATOS_INCOMPLETOS'
  | 'DESCONOCIDO';

/** Mensajes en español para cada código (los que no llegan de la BD). */
const MENSAJES_POR_CODIGO: Record<CodigoErrorReporte, string> = {
  USUARIO_NO_VINCULADO: 'Inicia sesión de nuevo para continuar.',
  AUTOCONFIRMACION: 'No puedes confirmar tu propio reporte.',
  CONFIRMACION_DUPLICADA: 'Ya confirmaste este reporte antes.',
  REPORTE_RECHAZADO: 'Este reporte fue rechazado por moderación.',
  REPORTE_NO_ENCONTRADO: 'El reporte ya no está disponible.',
  POI_NO_ENCONTRADO: 'El lugar seleccionado ya no existe.',
  ACCESO_DENEGADO: 'Solo las cuentas de moderación pueden hacer esto.',
  MOTIVO_REQUERIDO: 'Escribe el motivo del rechazo.',
  ACCION_INVALIDA: 'La acción de moderación no es válida.',
  DATOS_INCOMPLETOS: 'Completa el nombre y la ubicación del lugar.',
  DESCONOCIDO: 'No pudimos completar la operación. Inténtalo de nuevo.',
};

/** Error tipado de las operaciones del Proceso 1. */
export class ReporteError extends Error {
  readonly codigo: CodigoErrorReporte;

  constructor(codigo: CodigoErrorReporte, mensaje: string) {
    super(mensaje);
    this.name = 'ReporteError';
    this.codigo = codigo;
  }
}

/**
 * Traduce el mensaje crudo de PostgREST (`'CODIGO: mensaje'`) a un error
 * tipado. Cualquier mensaje ajeno a la convención se degrada a DESCONOCIDO
 * con un texto amable (p. ej. fallos de red o de permisos).
 */
export function mapearErrorReporte(mensajeCrudo: string): ReporteError {
  const texto = (mensajeCrudo ?? '').trim();
  const separador = texto.indexOf(':');
  const posibleCodigo = (separador > 0 ? texto.slice(0, separador) : texto)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  const conocido = posibleCodigo in MENSAJES_POR_CODIGO;

  if (!conocido) {
    return new ReporteError('DESCONOCIDO', MENSAJES_POR_CODIGO.DESCONOCIDO);
  }
  const codigo = posibleCodigo as CodigoErrorReporte;
  const mensajeDetalle = separador > 0 ? texto.slice(separador + 1).trim() : '';
  return new ReporteError(
    codigo,
    mensajeDetalle || MENSAJES_POR_CODIGO[codigo],
  );
}

/** Fila cruda de `reporte` usada por el detalle del POI (U08). */
interface FilaReporte {
  id_reporte: number;
  poi_id: number;
  estado: string;
  es_critico: boolean | null;
  fecha_creacion: string;
}

/**
 * Normaliza una fila de `reporte` + su conteo de confirmaciones al contrato
 * del front. El reporte ACTIVO es el más reciente no rechazado.
 */
export function mapearReporteComunitario(
  fila: FilaReporte,
  confirmaciones: number,
): ReporteComunitario {
  return {
    id: String(fila.id_reporte),
    poiId: String(fila.poi_id),
    estado: (fila.estado ?? '').trim().toLowerCase(),
    esCritico: fila.es_critico === true,
    confirmaciones,
  };
}

/** Fila cruda que devuelve la RPC `listar_reportes_moderacion`. */
interface FilaReporteModeracion {
  id_reporte: number;
  tipo: string | null;
  estado: string;
  descripcion: string | null;
  fecha_creacion: string;
  es_critico: boolean | null;
  autor: string | null;
  confirmaciones: number | null;
  poi: {
    id_poi: number;
    nombre: string;
    tipo: string;
    direccion: string | null;
    estado: string;
    lat: number | null;
    lon: number | null;
  };
  valores:
    | {
        caracteristica_id: number;
        nombre: string;
        valor_texto: string | null;
        valor_numerico: number | null;
        valor_booleano: boolean | null;
      }[]
    | null;
  evidencia:
    | {
        id_evidencia: number;
        tipo: string | null;
        storage_key: string | null;
      }[]
    | null;
}

/** Traduce la fila anidada de la RPC al contrato del front (M03–M05). */
export function mapearReporteModeracion(
  fila: FilaReporteModeracion,
): ReporteModeracion {
  const valores: ValorCaracteristicaReporte[] = (fila.valores ?? []).map(
    (valor) => ({
      caracteristicaId: valor.caracteristica_id,
      nombre: valor.nombre,
      valorBooleano: valor.valor_booleano ?? undefined,
      valorNumerico: valor.valor_numerico ?? undefined,
      valorTexto: valor.valor_texto ?? undefined,
    }),
  );

  return {
    id: String(fila.id_reporte),
    tipo: fila.tipo ?? 'nuevo',
    estado: (fila.estado ?? '').trim().toLowerCase(),
    descripcion: fila.descripcion ?? '',
    fechaCreacion: fila.fecha_creacion,
    esCritico: fila.es_critico === true,
    autor: fila.autor,
    confirmaciones: fila.confirmaciones ?? 0,
    poi: {
      id: String(fila.poi.id_poi),
      nombre: fila.poi.nombre,
      tipo: fila.poi.tipo,
      direccion: fila.poi.direccion ?? '',
      estado: (fila.poi.estado ?? '').trim().toLowerCase(),
      lat: fila.poi.lat ?? undefined,
      lon: fila.poi.lon ?? undefined,
    },
    valores,
    evidencia: (fila.evidencia ?? []).map((evidencia) => ({
      id: String(evidencia.id_evidencia),
      tipo: evidencia.tipo ?? 'foto',
      storageKey: evidencia.storage_key ?? '',
    })),
  };
}

/** Valores propuestos que el wizard (U09/U10) envía a la RPC. */

/** Datos capturados por el wizard de reporte. */
export interface DatosNuevoReporte {
  /** POI existente a actualizar; null cuando es un lugar nuevo. */
  poiId?: string | null;
  nombre?: string;
  tipoPoi?: string;
  direccion?: string;
  lat?: number;
  lon?: number;
  descripcion: string;
  esCritico: boolean;
  caracteristicas: ValorPropuestoReporte[];
  /** Ruta de la foto ya subida al bucket `evidencia` (opcional). */
  evidenciaStorageKey?: string | null;
}

/** Crea un reporte comunitario (U09/U10) y devuelve sus identificadores. */
export async function crearReporte(
  datos: DatosNuevoReporte,
): Promise<{ idReporte: string; idPoi: string }> {
  const { data, error } = await supabase.rpc('crear_reporte', {
    p_poi_id: datos.poiId ? Number(datos.poiId) : null,
    p_nombre: datos.nombre ?? null,
    p_tipo_poi: datos.tipoPoi ?? null,
    p_direccion: datos.direccion ?? null,
    p_lat: datos.lat ?? null,
    p_lon: datos.lon ?? null,
    p_descripcion: datos.descripcion,
    p_tipo_reporte: datos.poiId ? 'actualizacion' : 'nuevo',
    p_es_critico: datos.esCritico,
    p_caracteristicas: datos.caracteristicas.map((valor) => ({
      caracteristicaId: valor.caracteristicaId,
      valorBooleano:
        valor.valorBooleano === undefined ? undefined : valor.valorBooleano,
      valorNumerico: valor.valorNumerico,
      valorTexto: valor.valorTexto,
    })),
    p_evidencia_storage_key: datos.evidenciaStorageKey ?? null,
  });

  if (error) {
    throw mapearErrorReporte(error.message);
  }

  const resultado = data as { id_reporte: number; id_poi: number } | null;
  if (!resultado) {
    throw new ReporteError('DESCONOCIDO', MENSAJES_POR_CODIGO.DESCONOCIDO);
  }

  return {
    idReporte: String(resultado.id_reporte),
    idPoi: String(resultado.id_poi),
  };
}

/**
 * Registra una confirmación comunitaria (C3). A la tercera confirmación de
 * usuarios independientes la BD publica el punto y `publicado` llega en true.
 */
export async function confirmarReporte(
  reporteId: string,
): Promise<ResultadoConfirmacion> {
  const { data, error } = await supabase.rpc('confirmar_reporte', {
    p_reporte_id: Number(reporteId),
  });

  if (error) {
    throw mapearErrorReporte(error.message);
  }

  const resultado = data as {
    confirmaciones: number;
    publicado: boolean;
  } | null;

  return {
    confirmaciones: resultado?.confirmaciones ?? 0,
    publicado: resultado?.publicado === true,
  };
}

/**
 * Reporte vigente de un POI (el más reciente no rechazado) con su conteo de
 * confirmaciones. `null` cuando el punto aún no tiene reportes comunitarios.
 */
export async function obtenerReporteDePoi(
  poiId: string,
): Promise<ReporteComunitario | null> {
  const { data, error } = await supabase
    .from('reporte')
    .select('id_reporte, poi_id, estado, es_critico, fecha_creacion')
    .eq('poi_id', Number(poiId))
    .order('fecha_creacion', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`No se pudo leer el reporte: ${error.message}`);
  }

  const filas = (data ?? []) as FilaReporte[];
  const activo = filas.find(
    (fila) => (fila.estado ?? '').trim().toLowerCase() !== 'rechazado',
  );
  if (!activo) {
    return null;
  }

  const { count, error: errorConteo } = await supabase
    .from('confirmacion')
    .select('id_confirmacion', { count: 'exact', head: true })
    .eq('reporte_id', activo.id_reporte);

  if (errorConteo) {
    throw new Error(
      `No se pudieron leer las confirmaciones: ${errorConteo.message}`,
    );
  }

  return mapearReporteComunitario(activo, count ?? 0);
}

/**
 * Lista de reportes para la consola de moderación (M03/M04). La BD valida el
 * rol (moderador/administrador); sin permiso responde ACCESO_DENEGADO.
 */
export async function listarReportesModeracion(
  estado: string = 'pendiente',
): Promise<ReporteModeracion[]> {
  const { data, error } = await supabase.rpc('listar_reportes_moderacion', {
    p_estado: estado,
  });

  if (error) {
    throw mapearErrorReporte(error.message);
  }

  return ((data ?? []) as FilaReporteModeracion[]).map(mapearReporteModeracion);
}

/**
 * Decisión ejecutiva del moderador (Vía B): aprobar publica el punto;
 * rechazar exige motivo y queda auditado (RNF-22/30).
 */
export async function decidirReporte(
  reporteId: string,
  accion: AccionModeracion,
  motivo?: string,
): Promise<{ estado: string }> {
  const { data, error } = await supabase.rpc('decidir_reporte', {
    p_reporte_id: Number(reporteId),
    p_accion: accion,
    p_motivo: motivo?.trim() || null,
  });

  if (error) {
    throw mapearErrorReporte(error.message);
  }

  const resultado = data as { estado: string } | null;
  return { estado: resultado?.estado ?? accion };
}
