import {
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';

/**
 * Contrato de ruteo accesible del Proceso 2 (backend ↔ Valhalla).
 *
 * Decisiones de diseño (verificadas contra la documentación oficial de
 * Valhalla, sección "Pedestrian costing options"):
 *
 * - Valhalla no tiene un costing `wheelchair` propio: el perfil de silla de
 *   ruedas es `costing: 'pedestrian'` + `costing_options.pedestrian.type:
 *   'wheelchair'`, que ajusta `max_distance`, `walking_speed` y
 *   `step_penalty` a las necesidades de una persona usuaria de silla.
 * - El perfil visual usa `type: 'blind'`, que amplía la narración (cruces,
 *   escaleras, puentes, semáforos en pasos peatonales). Ambos tipos son
 *   mutuamente exclusivos; la prioridad es motriz.
 * - `avoidStairs` se expresa con una penalización alta (1 h) por cada tramo
 *   de escaleras: la ruta las evita salvo que no exista alternativa, en
 *   cuyo caso sigue siendo navegable (no se bloquea al usuario).
 * - `requireElevator` baja la penalización de ascensores a 0 s (dejan de
 *   evitarse). `preferSoundTrafficLights` no tiene opción de costo propia en
 *   Valhalla: se cubre con la narración del perfil visual y, si llega sin ese
 *   perfil, se devuelve una advertencia para no prometer algo que el motor
 *   no aplica.
 */

export type PerfilRuta = 'peatonal' | 'silla_de_ruedas' | 'visual';

export interface RestriccionesRuta {
    /** Perfil de accesibilidad derivado de las necesidades de la persona. */
    perfil?: PerfilRuta;
    /** Evitar escaleras (perfil motriz). */
    avoidStairs?: boolean;
    /** Favorecer trayectos con ascensor (perfil motriz). */
    requireElevator?: boolean;
    /** Preferir semáforos sonoros (perfil visual). */
    preferSoundTrafficLights?: boolean;
}

export type Coordenada = [number, number];

export interface PasoRutaNormalizado {
    /** Tipo de maniobra Valhalla (kStart = 1 … kBuildingExit = 43). */
    tipo: number;
    /** Instrucción de navegación ya localizada (es-ES). */
    instruccion: string;
    /** Longitud del tramo en kilómetros. */
    distanciaKm: number;
}

/** Respuesta normalizada que consume la app (aislada del formato Valhalla). */
export interface RutaNormalizada {
    distanciaKm: number;
    duracionMin: number;
    perfil: PerfilRuta;
    /** Geometría codificada polyline6 (la decodifica el cliente). */
    shape?: string;
    pasos: PasoRutaNormalizado[];
    advertencias: string[];
}

interface SolicitudValhalla {
    locations: { lat: number; lon: number }[];
    costing: 'pedestrian';
    costing_options: { pedestrian: Record<string, string | number> };
    units: 'kilometers';
    language: 'es-ES';
}

/** Valida que una coordenada del body sea [latitud, longitud] finita y en rango. */
export function validarCoordenada(valor: unknown, campo: string): Coordenada {
    if (
        !Array.isArray(valor) ||
        valor.length !== 2 ||
        valor.some((numero) => typeof numero !== 'number' || !Number.isFinite(numero))
    ) {
        throw new BadRequestException(`${campo} debe ser [latitud, longitud].`);
    }

    const [lat, lon] = valor as Coordenada;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new BadRequestException(`${campo} está fuera de rango geográfico.`);
    }

    return [lat, lon];
}

/** Construye la solicitud de ruteo peatonal para Valhalla. */
export function construirSolicitudValhalla(
    origen: Coordenada,
    destino: Coordenada,
    restricciones: RestriccionesRuta = {},
): { solicitud: SolicitudValhalla; advertencias: string[] } {
    const opcionesPedestrian: Record<string, string | number> = {};
    const advertencias: string[] = [];

    if (restricciones.perfil === 'silla_de_ruedas') {
        opcionesPedestrian.type = 'wheelchair';
    } else if (restricciones.perfil === 'visual') {
        opcionesPedestrian.type = 'blind';
    }

    if (restricciones.avoidStairs) {
        opcionesPedestrian.step_penalty = 3600;
    }

    if (restricciones.requireElevator) {
        opcionesPedestrian.elevator_penalty = 0;
    }

    if (
        restricciones.preferSoundTrafficLights &&
        restricciones.perfil !== 'visual'
    ) {
        advertencias.push(
            'La preferencia por semáforos sonoros se aplica con el perfil visual (narración asistida de cruces).',
        );
    }

    return {
        solicitud: {
            locations: [
                { lat: origen[0], lon: origen[1] },
                { lat: destino[0], lon: destino[1] },
            ],
            costing: 'pedestrian',
            costing_options: { pedestrian: opcionesPedestrian },
            units: 'kilometers',
            language: 'es-ES',
        },
        advertencias,
    };
}

/**
 * Normaliza la respuesta cruda de Valhalla al contrato del front:
 * resumen, pasos (maneuvers) y advertencias del motor.
 */
export function normalizarRespuestaValhalla(
    crudo: unknown,
    perfil: PerfilRuta,
    advertenciasExtra: string[] = [],
): RutaNormalizada {
    const datos = crudo as {
        trip?: {
            summary?: { length?: unknown; time?: unknown };
            legs?: {
                shape?: string;
                maneuvers?: { type?: number; instruction?: string; length?: number }[];
            }[];
        };
        warnings?: unknown;
    };

    const longitud = datos?.trip?.summary?.length;
    const tiempo = datos?.trip?.summary?.time;
    if (typeof longitud !== 'number' || typeof tiempo !== 'number') {
        throw new InternalServerErrorException(
            'El motor de ruteo devolvió una respuesta inesperada.',
        );
    }

    const pasos: PasoRutaNormalizado[] = (datos.trip?.legs ?? []).flatMap(
        (tramo) =>
            (tramo.maneuvers ?? []).map((maniobra) => ({
                tipo: maniobra.type ?? 0,
                instruccion: maniobra.instruction ?? '',
                distanciaKm: maniobra.length ?? 0,
            })),
    );

    const avisosMotor = Array.isArray(datos.warnings)
        ? datos.warnings.filter(
            (aviso): aviso is string => typeof aviso === 'string',
        )
        : [];

    return {
        distanciaKm: longitud,
        duracionMin: Math.round((tiempo / 60) * 10) / 10,
        perfil,
        shape: datos.trip?.legs?.[0]?.shape,
        pasos,
        advertencias: [...avisosMotor, ...advertenciasExtra],
    };
}
