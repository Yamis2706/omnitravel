import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import {
  cerrarSesionPorVencimiento,
  verificarSesionGuardada,
} from '../services/sesion';
import { useFavoritosStore } from '../store/favoritosStore';
import { useProfileStore } from '../store/profileStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-file-system', () => ({}));

const getItem = SecureStore.getItemAsync as jest.Mock;

function iniciarPerfil() {
  useProfileStore.getState().guardarPerfil({
    nombre: 'Ana',
    necesidades: [],
    filtrosActivos: [],
  });
  useFavoritosStore.setState({ ids: ['5'], cargado: true });
}

afterEach(() => jest.restoreAllMocks());

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  getItem.mockReset();
  (SecureStore.deleteItemAsync as jest.Mock).mockClear();
  iniciarPerfil();
});

describe('cierre por sesión vencida', () => {
  it('borra token, guardados y perfil, y avisa una sola vez', async () => {
    await Promise.all([
      cerrarSesionPorVencimiento(),
      cerrarSesionPorVencimiento(),
    ]);

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(useProfileStore.getState().perfil).toBeNull();
    expect(useFavoritosStore.getState().ids).toEqual([]);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('al abrir la app, un perfil sin token vuelve al login', async () => {
    getItem.mockResolvedValue(null);
    await verificarSesionGuardada();
    expect(useProfileStore.getState().perfil).toBeNull();
  });

  it('un token vigente conserva la sesión', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64');
    getItem.mockResolvedValue(`x.${payload}.y`);

    await verificarSesionGuardada();

    expect(useProfileStore.getState().perfil).not.toBeNull();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
