import { useEffect } from 'react';
import { AppState } from 'react-native';
import { registrarManejadorSesionVencida } from '../services/api/client';
import {
  cerrarSesionPorVencimiento,
  verificarSesionGuardada,
} from '../services/sesion';

/**
 * Vigila la sesión mientras la app está abierta:
 * - al terminar de hidratar el perfil, y cada vez que la app vuelve al
 *   primer plano, revisa si el JWT guardado sigue vigente;
 * - cualquier 401 del backend a una petición autenticada cierra la sesión.
 */
export function useVigilanciaSesion(hidratado: boolean): void {
  useEffect(
    () =>
      registrarManejadorSesionVencida(() => {
        void cerrarSesionPorVencimiento();
      }),
    [],
  );

  useEffect(() => {
    if (!hidratado) {
      return undefined;
    }
    void verificarSesionGuardada();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        void verificarSesionGuardada();
      }
    });
    return () => suscripcion.remove();
  }, [hidratado]);
}
