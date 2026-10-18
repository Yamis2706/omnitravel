import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertaPeligroRuta } from '../components/AlertaPeligroRuta';
import { AppButton } from '../components/AppButton';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import type { RootStackParamList } from '../navigation/types';
import { calcularRutaAccesible } from '../services/api/routes';
import type { ResultadoRuta } from '../services/types';
import { usePoisStore } from '../store/poisStore';
import { useProfileStore } from '../store/profileStore';
import { formatearDistancia } from '../utils/format';
import {
  datosDesactualizados,
  iconoDeManeuver,
  restriccionesDesdePerfil,
} from '../utils/ruta';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
  TOUCH_TARGET,
} from '../utils/theme';

const ETIQUETA_PERFIL: Record<string, string> = {
  silla_de_ruedas: 'Perfil silla de ruedas',
  visual: 'Perfil visual',
  peatonal: 'Perfil peatonal',
};

/**
 * U07 — Navegación paso a paso.
 *
 * Calcula la ruta accesible al destino con las restricciones del perfil
 * (motriz → sin escaleras + ascensores; visual → narración asistida), dibuja
 * el trayecto, lista los pasos (`maneuvers`) con íconos direccionales y
 * permite finalizar. Incluye:
 *
 * - Advertencia de datos con más de 60 días o no verificados (RNF-27).
 * - S02: alerta de barrera crítica con recálculo inmediato (RNF-26); el
 *   disparo de demostración está etiquetado como tal.
 * - Degradación clara si el motor de ruteo falla (RNF-17), sin bloquear la
 *   app: mensaje + reintento.
 */
export function NavegacionScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Navegacion'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { poiId, origenLat, origenLon } = route.params;

  const poiPorId = usePoisStore((estado) => estado.poiPorId);
  const poi = poiPorId(poiId);

  const necesidades = useProfileStore(
    (estado) => estado.perfil?.necesidades ?? [],
  );
  const filtrosActivos = useProfileStore(
    (estado) => estado.perfil?.filtrosActivos ?? [],
  );
  const restricciones = useMemo(
    () => restriccionesDesdePerfil(necesidades, filtrosActivos),
    [necesidades, filtrosActivos],
  );

  const [resultado, setResultado] = useState<ResultadoRuta | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [recalculo, setRecalculo] = useState(0);
  const [s02Visible, setS02Visible] = useState(false);
  const [avisoRecalculo, setAvisoRecalculo] = useState<string | null>(null);

  const cargando = resultado === undefined && !error;

  // Calcula (y recalcula) la ruta: los estados se fijan en los callbacks
  // de la promesa, nunca de forma síncrona dentro del efecto.
  useEffect(() => {
    let vigente = true;
    if (!poi) {
      return undefined;
    }

    calcularRutaAccesible(
      { latitude: origenLat, longitude: origenLon },
      { latitude: poi.latitud, longitude: poi.longitud },
      restricciones,
    )
      .then((ruta) => {
        if (!vigente) {
          return;
        }
        setResultado(ruta);
        setError(null);
        if (Platform.OS === 'ios') {
          AccessibilityInfo.announceForAccessibility(
            `Ruta calculada: ${ruta.duracionMin} minutos, ${formatearDistancia(
              ruta.distanciaKm,
            )}, ${ruta.pasos?.length ?? 0} pasos.`,
          );
        }
      })
      .catch((fallo) => {
        if (!vigente) {
          return;
        }
        setResultado(null);
        setError(
          fallo instanceof Error
            ? fallo.message
            : 'No fue posible calcular la ruta. Inténtalo de nuevo.',
        );
      });

    return () => {
      vigente = false;
    };
  }, [poi, origenLat, origenLon, restricciones, recalculo]);

  if (!poi) {
    return (
      <SafeAreaView style={estilos.pantalla}>
        <EmptyState
          icono="alert-circle-outline"
          titulo="Destino no encontrado"
          descripcion="No pudimos cargar la información de este lugar."
          textoBoton="Volver"
          onPressBoton={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const region = {
    latitude: (origenLat + poi.latitud) / 2,
    longitude: (origenLon + poi.longitud) / 2,
    latitudeDelta: Math.max(Math.abs(poi.latitud - origenLat) * 2.4, 0.012),
    longitudeDelta: Math.max(Math.abs(poi.longitud - origenLon) * 2.4, 0.012),
  };

  const desactualizado = datosDesactualizados(poi.ultimaVerificacion);
  const etiquetaPerfil =
    ETIQUETA_PERFIL[resultado?.perfil ?? 'peatonal'] ?? 'Ruta accesible';

  const recalcular = (aviso?: string) => {
    setS02Visible(false);
    setAvisoRecalculo(aviso ?? null);
    setError(null);
    setResultado(undefined);
    setRecalculo((numero) => numero + 1);
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <View style={estilos.barraNavegacion}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={estilos.botonAtras}
          accessibilityRole="button"
          accessibilityLabel="Volver al mapa"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={estilos.tituloBarra}>Navegación</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.encabezado}>
          <Text style={estilos.titulo} accessibilityRole="header">
            {poi.nombre}
          </Text>
          <Text style={estilos.subtitulo}>Ruta accesible paso a paso</Text>
        </View>

        {desactualizado ? (
          <Card estilo={estilos.tarjetaAviso}>
            <View style={estilos.filaAviso}>
              <Ionicons name="time-outline" size={18} color={colors.warning} />
              <Text style={estilos.textoAviso}>
                Los datos de accesibilidad de este lugar superan los 60 días o
                no están verificados: verifica el entorno al llegar (RNF-27).
              </Text>
            </View>
          </Card>
        ) : null}

        {resultado?.advertencias && resultado.advertencias.length > 0 ? (
          <Card estilo={estilos.tarjetaAviso}>
            {resultado.advertencias.map((advertencia) => (
              <View key={advertencia} style={estilos.filaAviso}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.warning}
                />
                <Text style={estilos.textoAviso}>{advertencia}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {avisoRecalculo ? (
          <View style={estilos.bloqueExito} accessibilityLiveRegion="polite">
            <Ionicons name="refresh-outline" size={16} color={colors.success} />
            <Text style={estilos.textoExito}>{avisoRecalculo}</Text>
          </View>
        ) : null}

        {cargando ? (
          <View style={estilos.cargando}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={estilos.textoCargando}
              accessibilityLiveRegion="polite"
            >
              Calculando la ruta accesible con tu perfil…
            </Text>
          </View>
        ) : null}

        {error ? (
          <Card>
            <View style={estilos.filaAviso}>
              <Ionicons
                name="cloud-offline-outline"
                size={18}
                color={colors.danger}
              />
              <Text style={estilos.textoError} accessibilityLiveRegion="polite">
                {error}
              </Text>
            </View>
            <AppButton
              titulo="Reintentar"
              variante="contorno"
              icono="refresh-outline"
              onPress={() => recalcular()}
              pistaAccesibilidad="Vuelve a calcular la ruta accesible"
            />
          </Card>
        ) : null}

        {resultado ? (
          <>
            <View style={estilos.tarjetaResumen}>
              <View style={estilos.filaResumen}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={estilos.textoResumen}
                  accessibilityLiveRegion="polite"
                >
                  {resultado.duracionMin} min ·{' '}
                  {formatearDistancia(resultado.distanciaKm)}
                </Text>
                <Badge tono="exito" texto={etiquetaPerfil} />
              </View>
            </View>

            <MapView
              style={estilos.mapa}
              initialRegion={region}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              accessibilityLabel={`Trazado de la ruta hacia ${poi.nombre}`}
            >
              <Marker
                coordinate={{
                  latitude: poi.latitud,
                  longitude: poi.longitud,
                }}
                accessibilityLabel={`Destino: ${poi.nombre}`}
              />
              {resultado.coordenadas ? (
                <Polyline
                  coordinates={resultado.coordenadas}
                  strokeColor={colors.primary}
                  strokeWidth={5}
                />
              ) : null}
            </MapView>

            <Text style={estilos.tituloSeccion}>
              Paso a paso ({resultado.pasos?.length ?? 0} pasos)
            </Text>

            {resultado.pasos && resultado.pasos.length > 0 ? (
              <View style={estilos.listaPasos}>
                {resultado.pasos.map((paso, indice) => (
                  <View
                    // La clave combina posición y tipo: los pasos no tienen id.
                    key={`${indice}-${paso.tipo}`}
                    style={estilos.tarjetaPaso}
                    accessible
                    accessibilityLabel={`Paso ${indice + 1}: ${
                      paso.instruccion
                    }. ${formatearDistancia(Math.max(paso.distanciaKm, 0))}.`}
                  >
                    <View style={estilos.iconoPaso}>
                      <Ionicons
                        name={iconoDeManeuver(paso.tipo)}
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <View style={estilos.textosPaso}>
                      <Text style={estilos.instruccion}>
                        {paso.instruccion}
                      </Text>
                      <Text style={estilos.distanciaPaso}>
                        {formatearDistancia(Math.max(paso.distanciaKm, 0))}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={estilos.textoVacio}>
                El motor no devolvió pasos detallados para esta ruta; guíate por
                el trayecto dibujado en el mapa.
              </Text>
            )}
          </>
        ) : null}

        {!cargando ? (
          <View style={estilos.botones}>
            <AppButton
              titulo="Finalizar navegación"
              icono="exit-outline"
              onPress={() => navigation.goBack()}
              pistaAccesibilidad="Cierra la navegación paso a paso y vuelve al mapa"
            />
            {resultado ? (
              <AppButton
                titulo="Simular barrera crítica (demo)"
                variante="contorno"
                icono="warning-outline"
                onPress={() => setS02Visible(true)}
                pistaAccesibilidad="Demostración de la alerta S02 con recálculo de ruta"
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <AlertaPeligroRuta
        visible={s02Visible}
        descripcion={`La comunidad reportó una barrera crítica muy cerca de «${poi.nombre}». Recalcula para evitar el trayecto afectado.`}
        onRecalcular={() =>
          recalcular('Ruta recalculada para evitar la barrera reportada.')
        }
        onContinuar={() => setS02Visible(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  barraNavegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  botonAtras: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloBarra: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  contenido: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  encabezado: {
    gap: spacing.xs,
  },
  titulo: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitulo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tarjetaAviso: {
    backgroundColor: colors.warningSoft,
    shadowOpacity: 0,
    elevation: 0,
    gap: spacing.xs,
  },
  filaAviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textoAviso: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  textoError: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.danger,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  bloqueExito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  textoExito: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.success,
    lineHeight: 18,
  },
  cargando: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  textoCargando: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tarjetaResumen: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textoResumen: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  mapa: {
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  tituloSeccion: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  listaPasos: {
    gap: spacing.sm,
  },
  tarjetaPaso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  iconoPaso: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textosPaso: {
    flex: 1,
    gap: 2,
  },
  instruccion: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  distanciaPaso: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  textoVacio: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  botones: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
