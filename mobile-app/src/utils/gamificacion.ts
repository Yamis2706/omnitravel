/**
 * Gamificación comunitaria del perfil (U12): puntos y nivel a partir de la
 * actividad real del viajero (reportes y confirmaciones de la BD).
 *
 * Lógica pura y testeable: la pantalla solo pinta el resultado.
 */

export interface ResumenActividad {
  /** Total de reportes creados por la persona. */
  reportesCreados: number;
  /** Reportes ya publicados tras la validación comunitaria. */
  publicados: number;
  /** Reportes de barreras críticas (es_critico) creados. */
  barreras: number;
  /** Confirmaciones que otros viajeros hicieron a sus reportes. */
  confirmacionesRecibidas: number;
}

export interface NivelComunitario {
  nombre: string;
  /** Puntos necesarios para el siguiente nivel; null en el nivel máximo. */
  siguiente: number | null;
  frase: string;
}

const NIVELES: { hasta: number; nombre: string; frase: string }[] = [
  {
    hasta: 100,
    nombre: 'Explorador Novato',
    frase: 'Tus primeros aportes ya ayudan',
  },
  {
    hasta: 250,
    nombre: 'Colaborador Activo',
    frase: 'Reportas y confirmas con constancia',
  },
  {
    hasta: 500,
    nombre: 'Pionero Sin Barreras',
    frase: 'Exploras, reportas y haces la diferencia',
  },
  {
    hasta: Number.POSITIVE_INFINITY,
    nombre: 'Guardián de la Accesibilidad',
    frase: 'Referente de la comunidad OmniTravel',
  },
];

/** Puntos comunitarios: publicar vale más que reportar; lo confirmado se premia. */
export function calcularPuntos(resumen: ResumenActividad): number {
  const enValidacion = Math.max(
    resumen.reportesCreados - resumen.publicados,
    0,
  );
  return (
    resumen.publicados * 100 +
    enValidacion * 40 +
    resumen.confirmacionesRecibidas * 10
  );
}

/** Nivel vigente y umbral del siguiente, con el texto motivacional. */
export function nivelComunitario(puntos: number): NivelComunitario {
  const indice = NIVELES.findIndex((nivel) => puntos < nivel.hasta);
  const posicion = indice === -1 ? NIVELES.length - 1 : indice;
  const nivel = NIVELES[posicion];
  const siguiente = posicion === NIVELES.length - 1 ? null : nivel.hasta;

  return {
    nombre: nivel.nombre,
    siguiente,
    frase: nivel.frase,
  };
}

/** Fracción 0–1 de avance hacia el siguiente nivel (para la barra). */
export function progresoNivel(puntos: number): number {
  const { siguiente } = nivelComunitario(puntos);
  if (siguiente === null) {
    return 1;
  }
  const base = siguiente >= 500 ? 250 : siguiente >= 250 ? 100 : 0;
  const rango = Math.max(siguiente - base, 1);
  return Math.min(Math.max((puntos - base) / rango, 0), 1);
}

/** Texto accesible del progreso ("320 de 500 puntos"). */
export function textoSiguienteNivel(puntos: number): string {
  const { siguiente } = nivelComunitario(puntos);
  return siguiente === null
    ? 'Nivel máximo alcanzado'
    : `Siguiente nivel: ${siguiente} puntos`;
}
