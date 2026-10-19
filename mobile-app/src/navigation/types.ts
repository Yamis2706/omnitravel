import type { NavigatorScreenParams } from '@react-navigation/native';

/** Pestañas del módulo Viajero/Comunidad (shell del MVP). */
export type MainTabParamList = {
  Inicio: undefined;
  Mapa: { destinoPoiId?: string } | undefined;
  Contribuir: undefined;
  /** Consola de moderación embebida (solo moderador/administrador). */
  Reportes: undefined;
  Guardados: undefined;
  Perfil: undefined;
};

/** Stack raíz: flujo de registro/login y detalle de POI sobre las pestañas. */
export type RootStackParamList = {
  /** Pantalla inicial: selección de rol + credenciales. */
  Login: undefined;
  Registro: undefined;
  Principal: NavigatorScreenParams<MainTabParamList> | undefined;
  DetallePoi: { poiId: string };
  /** Consola de moderación del Proceso 1 (solo roles moderador/admin). */
  Moderacion: undefined;
  /** Mis reportes (U12): historial propio con estado de validación. */
  MisReportes: undefined;
  /** Navegación paso a paso (U07) con el origen ya resuelto. */
  Navegacion: { poiId: string; origenLat: number; origenLon: number };
};
