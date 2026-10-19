import {
  advertenciasDeEscaleras,
  normalizarRespuestaRuta,
} from '../../utils/ruta';
import type { Coordenada, ResultadoRuta, RestriccionesRuta } from '../types';
import { apiFetch } from './client';

/**
 * Servicio de rutas accesibles (Proceso 2).
 *
 * Vía primaria: `POST /routes` del backend del equipo (NestJS → Valhalla;
 * documento `backend/src/routing/valhalla-payload.ts`).
 *
 * Respaldo para demotras/demos sin backend desplegado: la MISMA solicitud
 * peatonal se envía al servidor público Valhalla de OpenStreetMap con las
 * opciones del perfil (types `wheelchair`/`blind`, penalización de escaleras
 * de 3600 s y ascensores no penalizados). El payload es idéntico al del
 * backend a propósito: al desplegar el backend el contrato no cambia.
 */
const VALHALLA_PUBLICO = 'https://valhalla1.openstreetmap.de/route';
const TIMEOUT_BACKEND_MS = 4000;
const TIMEOUT_VALHALLA_MS = 20000;

interface SolicitudValhalla {
  locations: { lat: number; lon: number }[];
  costing: 'pedestrian';
  costing_options: { pedestrian: Record<string, string | number> };
  units: 'kilometers';
  language: 'es-ES';
  /**
   * `alternates: 1` → hasta 2 rutas (principal + alternativa): la app las
   * alterna con «Recalcular ruta» para no repetir el mismo trayecto. Espejo
   * exacto de la decisión documentada en el backend.
   */
  alternates: 1;
}

/** Espejo fiel de `construirSolicitudValhalla` del backend. */
function construirSolicitudValhalla(
  origen: Coordenada,
  destino: Coordenada,
  restricciones: RestriccionesRuta,
): { solicitud: SolicitudValhalla; advertenciasMotor: string[] } {
  const opciones: Record<string, string | number> = {};
  const advertenciasMotor: string[] = [];

  if (restricciones.perfil === 'silla_de_ruedas') {
    opciones.type = 'wheelchair';
  } else if (restricciones.perfil === 'visual') {
    opciones.type = 'blind';
  }

  if (restricciones.avoidStairs) {
    opciones.step_penalty = 3600;
  }

  if (restricciones.requireElevator) {
    opciones.elevator_penalty = 0;
  }

  if (
    restricciones.preferSoundTrafficLights &&
    restricciones.perfil !== 'visual'
  ) {
    advertenciasMotor.push(
      'La preferencia por semáforos sonoros se aplica con el perfil visual (narración asistida de cruces).',
    );
  }

  return {
    solicitud: {
      locations: [
        { lat: origen.latitude, lon: origen.longitude },
        { lat: destino.latitude, lon: destino.longitude },
      ],
      costing: 'pedestrian',
      costing_options: { pedestrian: opciones },
      units: 'kilometers',
      language: 'es-ES',
      alternates: 1,
    },
    advertenciasMotor,
  };
}

/**
 * Cierra el contrato del front sobre TODAS las rutas (principal y
 * alternativa): advertencias del motor, del backend y las derivadas de
 * escaleras detectadas en la narración (RNF-14).
 */
function cerrarAdvertencias(
  ruta: ResultadoRuta,
  restricciones: RestriccionesRuta,
  advertenciasMotor: string[] = [],
): ResultadoRuta {
  const cerrada: ResultadoRuta = {
    ...ruta,
    advertencias: [
      ...advertenciasMotor,
      ...(ruta.advertencias ?? []),
      ...advertenciasDeEscaleras(ruta.pasos ?? [], restricciones),
    ],
  };
  if (cerrada.alternativa) {
    // La alternativa no repite los avisos de semáforos de la principal.
    cerrada.alternativa = {
      ...cerrada.alternativa,
      advertencias: [
        ...(cerrada.alternativa.advertencias ?? []),
        ...advertenciasDeEscaleras(
          cerrada.alternativa.pasos ?? [],
          restricciones,
        ),
      ],
    };
  }
  return cerrada;
}

async function rutaConValhallaPublico(
  origen: Coordenada,
  destino: Coordenada,
  restricciones: RestriccionesRuta,
): Promise<ResultadoRuta> {
  const { solicitud, advertenciasMotor } = construirSolicitudValhalla(
    origen,
    destino,
    restricciones,
  );

  const controlador = new AbortController();
  const temporizador = setTimeout(
    () => controlador.abort(),
    TIMEOUT_VALHALLA_MS,
  );
  try {
    const respuesta = await fetch(VALHALLA_PUBLICO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solicitud),
      signal: controlador.signal,
    });
    if (!respuesta.ok) {
      let detalle = '';
      try {
        const cuerpo = (await respuesta.json()) as { error?: unknown };
        if (
          typeof cuerpo?.error === 'string' &&
          /no suitable|no path|no edge/i.exec(cuerpo.error)
        ) {
          detalle =
            'No encontramos una ruta peatonal para esos puntos (el destino podría no estar conectado a veredas).';
        }
      } catch {
        // Cuerpo no legible: se conserva el mensaje genérico.
      }
      throw new Error(
        detalle ||
          `El motor de ruteo respondió con estado ${respuesta.status}.`,
      );
    }

    const crudo = (await respuesta.json()) as unknown;
    return cerrarAdvertencias(
      normalizarRespuestaRuta(crudo),
      restricciones,
      advertenciasMotor,
    );
  } finally {
    clearTimeout(temporizador);
  }
}

export async function calcularRutaAccesible(
  origen: Coordenada,
  destino: Coordenada,
  restricciones?: RestriccionesRuta,
): Promise<ResultadoRuta> {
  const restriccionesEfectivas: RestriccionesRuta = restricciones ?? {};

  // (1) Backend del equipo con timeout corto: si no está desplegado falla
  // rápido para no arrastrar la espera hasta la reserva.
  try {
    const datos = await apiFetch<unknown>(
      '/routes',
      {
        method: 'POST',
        body: JSON.stringify({
          origin: [origen.latitude, origen.longitude],
          destination: [destino.latitude, destino.longitude],
          restrictions: restriccionesEfectivas,
        }),
      },
      TIMEOUT_BACKEND_MS,
    );
    return cerrarAdvertencias(
      normalizarRespuestaRuta(datos),
      restriccionesEfectivas,
    );
  } catch {
    // Backend ausente (típico en demo local): continúa con la reserva.
  }

  // (2) Respaldo: Valhalla público con el mismo contrato de accesibilidad.
  try {
    return await rutaConValhallaPublico(
      origen,
      destino,
      restriccionesEfectivas,
    );
  } catch (error) {
    const mensaje = (error as Error)?.message;
    if (mensaje && !/abort/i.exec(mensaje)) {
      // Errores ya accionables de la reserva (sin ruta, sin red del motor).
      throw new Error(mensaje);
    }
    throw new Error(
      'No se pudo calcular la ruta. Verifica tu conexión a internet e inténtalo de nuevo.',
    );
  }
}
