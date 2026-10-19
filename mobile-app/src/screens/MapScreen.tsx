import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { Badge } from '../components/Badge';
import { FilterSheet } from '../components/FilterSheet';
import { PoiCard } from '../components/PoiCard';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { calcularRutaAccesible } from '../services/api/routes';
import type { Coordenada, Poi, ResultadoRuta } from '../services/types';
import { usePoisStore } from '../store/poisStore';
import { useProfileStore } from '../store/profileStore';
import { aplicarFiltros } from '../utils/filters';
import { formatearDistancia } from '../utils/format';
import { datosDesactualizados, restriccionesDesdePerfil } from '../utils/ruta';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  shadow,
  spacing,
  TOUCH_TARGET,
} from '../utils/theme';

const CENTRO_ARMENIA: Coordenada = { latitude: 4.537, longitude: -75.675 };

const REGION_INICIAL = {
  ...CENTRO_ARMENIA,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

type EstadoPermiso = 'pendiente' | 'concedido' | 'denegado';

/**
 * U06 — Vista de Mapa y Ruteo.
 *
 * - Mapa base de Google (en Expo Go pinta sin API key; en producción se
 *   configura con la API key del plugin `react-native-maps`, ver README).
 *   La alternativa solo-OSM con `mapType="none"` + `UrlTile` dejó el lienzo
 *   vacío en un Android real (issue react-native-maps #5413, cerrado sin
 *   fix), por lo que se abandonó para la demo.
 * - POIs desde el backend (`GET /mapa`) con degradación a datos de
 *   demostración si el backend no responde.
 * - Filtros U05 generados desde el catálogo de características.
 * - Ruteo real contra `POST /routes` del backend, con errores visibles
 *   y anunciados (RNF-14, RNF-17).
 */
export function MapScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<MainTabParamList, 'Mapa'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const pois = usePoisStore((estado) => estado.pois);
  const poiPorId = usePoisStore((estado) => estado.poiPorId);
  const cargadoPois = usePoisStore((estado) => estado.cargado);
  const cargarPois = usePoisStore((estado) => estado.cargar);
  const fuentePois = usePoisStore((estado) => estado.fuente);
  const advertenciaPois = usePoisStore((estado) => estado.advertencia);

  const filtrosActivos = useProfileStore(
    (estado) => estado.perfil?.filtrosActivos ?? [],
  );
  const necesidadesPerfil = useProfileStore(
    (estado) => estado.perfil?.necesidades ?? [],
  );
  const establecerFiltros = useProfileStore(
    (estado) => estado.establecerFiltros,
  );

  const [permiso, setPermiso] = useState<EstadoPermiso>('pendiente');
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenada | null>(
    null,
  );
  const [seleccionado, setSeleccionado] = useState<Poi | null>(null);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoRuta | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // Carga única de POIs del equipo (BD con fallback a demo) al abrir el mapa.
  useEffect(() => {
    if (!cargadoPois) {
      void cargarPois();
    }
  }, [cargadoPois, cargarPois]);

  // Permiso de ubicación con degradación elegante (sin bloquear el mapa).
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (activo) {
            setPermiso('denegado');
          }
          return;
        }
        const posicion = await Location.getCurrentPositionAsync({});
        if (activo) {
          setPermiso('concedido');
          setUbicacionUsuario({
            latitude: posicion.coords.latitude,
            longitude: posicion.coords.longitude,
          });
        }
      } catch {
        if (activo) {
          setPermiso('denegado');
        }
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  // Destino preseleccionado al llegar desde "Cómo llegar" (U08):
  // sincroniza un evento externo de navegación una sola vez por navegación.
  const destinoParam = route.params?.destinoPoiId;
  useEffect(() => {
    if (destinoParam) {
      const poi = poiPorId(destinoParam);
      if (poi) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSeleccionado(poi);
        setDestinoId(poi.id);
      }
    }
  }, [destinoParam, poiPorId]);

  const poisVisibles = useMemo(
    () => aplicarFiltros(pois, filtrosActivos),
    [pois, filtrosActivos],
  );

  // Restricciones del Proceso 2 derivadas del perfil local de accesibilidad.
  const restricciones = useMemo(
    () => restriccionesDesdePerfil(necesidadesPerfil, filtrosActivos),
    [necesidadesPerfil, filtrosActivos],
  );

  const origen = useMemo(
    () => ubicacionUsuario ?? CENTRO_ARMENIA,
    [ubicacionUsuario],
  );

  const destino = destinoId ? poiPorId(destinoId) : undefined;

  const seleccionarPoi = (poi: Poi) => {
    setSeleccionado(poi);
    setDestinoId(poi.id);
    setResultado(null);
    setErrorRuta(null);
  };

  const verRuta = useCallback(async () => {
    if (!destino) {
      return;
    }
    setCargandoRuta(true);
    setErrorRuta(null);
    setResultado(null);

    try {
      const ruta = await calcularRutaAccesible(
        origen,
        {
          latitude: destino.latitud,
          longitude: destino.longitud,
        },
        restricciones,
      );
      setResultado(ruta);
      // En Android el anuncio lo hace la región viva del resultado (evita doble lectura).
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(
          `Ruta calculada: ${ruta.duracionMin} minutos, ${formatearDistancia(ruta.distanciaKm)}.`,
        );
      }
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo calcular la ruta. Inténtalo de nuevo.';
      setErrorRuta(mensaje);
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(mensaje);
      }
    } finally {
      setCargandoRuta(false);
    }
  }, [destino, origen, restricciones]);

  return (
    <View style={estilos.pantalla}>
      <MapView
        style={estilos.mapa}
        initialRegion={REGION_INICIAL}
        showsUserLocation={permiso === 'concedido'}
        showsMyLocationButton={false}
        accessibilityLabel="Mapa de lugares accesibles en Armenia"
      >
        {poisVisibles.map((poi) => {
          const activo = seleccionado?.id === poi.id;
          return (
            <Marker
              key={poi.id}
              coordinate={{ latitude: poi.latitud, longitude: poi.longitud }}
              onPress={() => seleccionarPoi(poi)}
              accessibilityLabel={`${poi.nombre}. ${
                poi.estadoVerificacion === 'VERIFICADO'
                  ? 'Accesibilidad verificada'
                  : 'En revisión por la comunidad'
              }.`}
            >
              <View
                style={[
                  estilos.marcador,
                  activo ? estilos.marcadorActivo : null,
                ]}
              >
                <Ionicons name="accessibility" size={15} color={colors.white} />
              </View>
            </Marker>
          );
        })}
        {resultado?.coordenadas ? (
          <Polyline
            coordinates={resultado.coordenadas}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        ) : null}
      </MapView>

      <View style={[estilos.barraSuperior, { top: insets.top + spacing.sm }]}>
        <Text style={estilos.tituloPantalla}>Mapa</Text>
        <Pressable
          onPress={() => setFiltrosAbiertos(true)}
          style={estilos.botonFiltros}
          accessibilityRole="button"
          accessibilityLabel={`Filtros de accesibilidad${
            filtrosActivos.length > 0
              ? `, ${filtrosActivos.length} activos`
              : ', ninguno activo'
          }`}
          accessibilityHint="Abre el panel de filtros"
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          {filtrosActivos.length > 0 ? (
            <View style={estilos.contador}>
              <Text style={estilos.contadorTexto}>{filtrosActivos.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View
        style={[estilos.panel, { paddingBottom: insets.bottom + spacing.md }]}
      >
        {fuentePois === 'mock' ? (
          <View style={estilos.avisoDatos} accessibilityLiveRegion="polite">
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={colors.warning}
            />
            <Text style={estilos.avisoDatosTexto} numberOfLines={2}>
              {advertenciaPois ??
                'Mostrando lugares de demostración: sin conexión a la base de datos del equipo.'}
            </Text>
          </View>
        ) : null}

        {seleccionado ? (
          <View style={estilos.tarjetaSeleccion}>
            <PoiCard
              poi={seleccionado}
              onPress={() =>
                navigation.navigate('DetallePoi', { poiId: seleccionado.id })
              }
            />
          </View>
        ) : null}

        <Text style={estilos.tituloRuta}>Planificar Ruta Peatonal</Text>
        <Text style={estilos.subtituloRuta}>
          Encuentra la ruta más accesible para ti
        </Text>

        <View style={estilos.filaDato}>
          <Ionicons
            name="navigate-circle-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={estilos.textoDato} numberOfLines={1}>
            Origen:{' '}
            {permiso === 'concedido'
              ? 'Tu ubicación actual'
              : 'Centro de Armenia'}
          </Text>
        </View>
        <View style={estilos.filaDato}>
          <Ionicons name="flag-outline" size={18} color={colors.primary} />
          <Text style={estilos.textoDato} numberOfLines={1}>
            Destino: {destino ? destino.nombre : 'Toca un lugar en el mapa'}
          </Text>
        </View>

        {resultado ? (
          <View style={estilos.resultado}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text
              style={estilos.resultadoTexto}
              accessibilityLiveRegion="polite"
            >
              {resultado.duracionMin} min ·{' '}
              {formatearDistancia(resultado.distanciaKm)}
            </Text>
            <Badge tono="exito" texto="Ruta calculada" />
          </View>
        ) : null}

        {resultado &&
        destino &&
        datosDesactualizados(destino.ultimaVerificacion) ? (
          <View style={estilos.avisoDatos} accessibilityLiveRegion="polite">
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={estilos.avisoDatosTexto}>
              Los datos de accesibilidad de este lugar superan los 60 días o no
              están verificados (RNF-27).
            </Text>
          </View>
        ) : null}

        {resultado?.advertencias && resultado.advertencias.length > 0 ? (
          <View style={estilos.avisoDatos}>
            {resultado.advertencias.map((advertencia) => (
              <View key={advertencia} style={estilos.filaDato}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.warning}
                />
                <Text style={estilos.avisoDatosTexto}>{advertencia}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {errorRuta ? (
          <Text style={estilos.error} accessibilityLiveRegion="polite">
            {errorRuta}
          </Text>
        ) : null}

        <AppButton
          titulo="Ver ruta accesible"
          icono="navigate-outline"
          onPress={verRuta}
          deshabilitado={!destino}
          cargando={cargandoRuta}
          pistaAccesibilidad="Calcula la ruta peatonal hasta el lugar seleccionado"
        />

        {resultado && destino ? (
          <AppButton
            titulo="Iniciar navegación"
            variante="contorno"
            icono="navigate-circle-outline"
            onPress={() =>
              navigation.navigate('Navegacion', {
                poiId: destino.id,
                origenLat: origen.latitude,
                origenLon: origen.longitude,
              })
            }
            pistaAccesibilidad="Abre la navegación paso a paso con las indicaciones de la ruta"
          />
        ) : null}
      </View>

      <FilterSheet
        visible={filtrosAbiertos}
        filtrosActivos={filtrosActivos}
        onAplicar={establecerFiltros}
        onCerrar={() => setFiltrosAbiertos(false)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapa: {
    flex: 1,
  },
  marcador: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  marcadorActivo: {
    backgroundColor: colors.success,
  },
  barraSuperior: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tituloPantalla: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
    ...shadow.card,
  },
  botonFiltros: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  contador: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  contadorTexto: {
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  panel: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  tarjetaSeleccion: {
    marginBottom: spacing.xs,
  },
  tituloRuta: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtituloRuta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  filaDato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 32,
  },
  textoDato: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  resultadoTexto: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
  avisoDatos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  avisoDatosTexto: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
});
