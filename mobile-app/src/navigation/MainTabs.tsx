import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ContributeScreen } from '../screens/ContributeScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { ModeracionScreen } from '../screens/ModeracionScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { useProfileStore } from '../store/profileStore';
import { colors, fontSize, fontWeight } from '../utils/theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Consola de moderación como pestaña (evita crear un componente por render). */
function ReportesTab() {
  return <ModeracionScreen embebida />;
}

/**
 * Shell de navegación del módulo Viajero/Comunidad.
 *
 * - Viajeros: Inicio · Mapa · Contribuir · Guardados · Perfil (mockups U04+).
 * - Moderadores/administradores: la pestaña de contribuir se reemplaza por
 *   «Reportes», la vista de reportes para revisar/verificar/modificar (M03–M05)
 *   y la app abre directamente en ella tras iniciar sesión.
 */
export function MainTabs() {
  const rol = useProfileStore((estado) => estado.perfil?.rol);
  const esModerador = rol === 'moderador' || rol === 'administrador';

  return (
    <Tab.Navigator
      initialRouteName={esModerador ? 'Reportes' : 'Inicio'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs - 1,
          fontWeight: fontWeight.semibold,
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Mapa"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      {esModerador ? (
        <Tab.Screen
          name="Reportes"
          component={ReportesTab}
          options={{
            tabBarLabel: 'Reportes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="shield-checkmark-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
      ) : (
        <Tab.Screen
          name="Contribuir"
          component={ContributeScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="add-circle" size={34} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Guardados"
        component={SavedScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
