import { create } from 'zustand';
import { cargarDatosMapa, type FuenteDatos } from '../services/pois';
import { CATALOGO_CARACTERISTICAS } from '../services/mocks/catalog';
import { POIS_MOCK } from '../services/mocks/pois';
import type { CaracteristicaAccesibilidad, Poi } from '../services/types';

/**
 * Estado de POIs del mapa (U06/U08).
 *
 * Carga única por arranque desde la BD del equipo (Supabase OmniTravel) con
 * degradación a mocks tipados cuando la BD está inaccesible (p. ej. políticas
 * RLS pendientes). No se persiste: los datos de la BD se releen al abrir el
 * mapa para reflejar el crowdsourcing vigente.
 */
interface EstadoPois {
  /** true cuando la primera carga terminó (con BD o con fallback). */
  cargado: boolean;
  indicadorCarga: boolean;
  fuente: FuenteDatos;
  /** Información no bloqueante para el usuario (p. ej. RLS pendiente). */
  advertencia?: string;
  pois: Poi[];
  catalogo: CaracteristicaAccesibilidad[];
  cargar: () => Promise<void>;
  poiPorId: (id: string) => Poi | undefined;
}

export const usePoisStore = create<EstadoPois>((set, get) => ({
  cargado: false,
  indicadorCarga: false,
  fuente: 'mock',
  pois: POIS_MOCK,
  catalogo: CATALOGO_CARACTERISTICAS,

  cargar: async () => {
    if (get().indicadorCarga) {
      return;
    }
    set({ indicadorCarga: true });
    try {
      const datos = await cargarDatosMapa();
      set({
        cargado: true,
        indicadorCarga: false,
        fuente: datos.fuente,
        advertencia: datos.advertencia,
        pois: datos.pois,
        catalogo: datos.catalogo,
      });
    } finally {
      set({ indicadorCarga: false, cargado: true });
    }
  },

  poiPorId: (id) => get().pois.find((poi) => poi.id === id),
}));
