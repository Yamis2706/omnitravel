import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { Badge, type TonoBadge } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import type { RootStackParamList } from '../navigation/types';
import { listarMisReportes } from '../services/reportes';
import type { ReporteResumen } from '../services/types';
import { usePoisStore } from '../store/poisStore';
import { formatearFechaCorta } from '../utils/format';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
  TOUCH_TARGET,
} from '../utils/theme';

/** Presentación del estado físico de `reporte` para el viajero. */
const PRESENTACION_ESTADO: Record<
  string,
  { texto: string; tono: TonoBadge; icono: keyof typeof Ionicons.glyphMap }
> = {
  pendiente_validacion: {
    texto: 'Pendiente de validación',
    tono: 'alerta',
    icono: 'hourglass-outline',
  },
  en_revision: {
    texto: 'En revisión por moderación',
    tono: 'neutro',
    icono: 'eye-outline',
  },
  publicado: {
    texto: 'Publicado en el mapa',
    tono: 'exito',
    icono: 'checkmark-circle-outline',
  },
  rechazado: {
    texto: 'Rechazado',
    tono: 'peligro',
    icono: 'close-circle-outline',
  },
};

/**
 * Mis reportes (U12) — historial propio de aportes comunitarios.
 *
 * Lee la tabla `reporte` filtrando por `usuario_creador_id` de la sesión
 * (lectura pública + filtro explícito) y muestra el estado de validación de
 * cada aporte: con 3 confirmaciones independientes se publica automáticamente
 * (Proceso 1). Desde aquí se puede volver a ver el punto en el mapa.
 */
export function MisReportesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const poiPorId = usePoisStore((estado) => estado.poiPorId);
  const cargarPois = usePoisStore((estado) => estado.cargar);

  const [reportes, setReportes] = useState<ReporteResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Consulta que reacciona a enfoque y al botón «Actualizar lista». */
  const consultar = useCallback(() => {
    let vigente = true;
    void cargarPois();
    listarMisReportes()
      .then((lista) => {
        if (vigente) {
          setReportes(lista);
          setError(null);
        }
      })
      .catch((fallo) => {
        if (vigente) {
          setError(
            (fallo as Error)?.message ??
              'No pudimos cargar tus reportes. Revisa tu conexión.',
          );
        }
      });
    return () => {
      vigente = false;
    };
  }, [cargarPois]);

  useFocusEffect(
    useCallback(
      () => consultar(), // devuelve la limpieza de la consulta en curso
      [consultar],
    ),
  );

  const verEnMapa = (reporte: ReporteResumen) => {
    navigation.navigate('Principal', {
      screen: 'Mapa',
      params: { destinoPoiId: reporte.poiId },
    });
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <View style={estilos.barraNavegacion}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={estilos.botonAtras}
          accessibilityRole="button"
          accessibilityLabel="Volver al perfil"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={estilos.tituloBarra}>Mis reportes</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.subtitulo}>
          Tus aportes entran en validación comunitaria: con 3 confirmaciones de
          otros viajeros el punto se publica automáticamente en el mapa.
        </Text>

        {reportes === null && !error ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            accessibilityLabel="Cargando tus reportes"
            style={estilos.cargando}
          />
        ) : null}

        {error ? (
          <View style={estilos.bloqueError} accessibilityLiveRegion="polite">
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={colors.danger}
            />
            <Text style={estilos.textoError}>{error}</Text>
          </View>
        ) : null}

        {reportes && reportes.length === 0 && !error ? (
          <EmptyState
            icono="document-text-outline"
            titulo="Aún no tienes reportes"
            descripcion="Cuando reportes un lugar accesible o una barrera desde la pestaña Contribuir, aparecerá aquí con su estado de validación."
            textoBoton="Ir al mapa"
            onPressBoton={() =>
              navigation.navigate('Principal', { screen: 'Mapa' })
            }
          />
        ) : null}

        {reportes
          ? reportes.map((reporte) => {
              const poi = poiPorId(reporte.poiId);
              const presentacion = PRESENTACION_ESTADO[reporte.estado] ?? {
                texto: reporte.estado || 'Desconocido',
                tono: 'neutro' as TonoBadge,
                icono: 'information-circle-outline' as const,
              };
              return (
                <Card key={reporte.id} estilo={estilos.tarjeta}>
                  <View style={estilos.filaEncabezado}>
                    <View style={estilos.textosEncabezado}>
                      <Text style={estilos.nombrePoi}>
                        {poi?.nombre ?? `Lugar #${reporte.poiId}`}
                      </Text>
                      <Text style={estilos.detallePoi}>
                        {reporte.esCritico
                          ? 'Barrera / obstáculo'
                          : 'Lugar accesible'}{' '}
                        · {formatearFechaCorta(reporte.fechaCreacion)}
                      </Text>
                    </View>
                    <Badge
                      tono={presentacion.tono}
                      texto={presentacion.texto}
                      icono={presentacion.icono}
                    />
                  </View>

                  {reporte.descripcion ? (
                    <Text style={estilos.descripcion} numberOfLines={3}>
                      {reporte.descripcion}
                    </Text>
                  ) : null}

                  <View style={estilos.filaProgreso}>
                    <View style={estilos.puntos}>
                      {[0, 1, 2].map((indice) => (
                        <View
                          key={indice}
                          style={[
                            estilos.punto,
                            indice < reporte.confirmaciones
                              ? estilos.puntoActivo
                              : null,
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={estilos.textoConfirmaciones}>
                      {reporte.confirmaciones > 3
                        ? `3 de 3 confirmaciones`
                        : `${reporte.confirmaciones} de 3 confirmaciones`}
                    </Text>
                  </View>

                  {!error ? (
                    <AppButton
                      titulo="Ver en el mapa"
                      variante="contorno"
                      icono="map-outline"
                      onPress={() => verEnMapa(reporte)}
                      pistaAccesibilidad="Abre el mapa centrado en este reporte"
                    />
                  ) : null}
                </Card>
              );
            })
          : null}

        {reportes && reportes.length > 0 ? (
          <AppButton
            titulo="Actualizar lista"
            variante="fantasma"
            icono="refresh-outline"
            onPress={() => void consultar()}
          />
        ) : null}
      </ScrollView>
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
  subtitulo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cargando: {
    marginTop: spacing.xxl,
  },
  tarjeta: {
    gap: spacing.sm,
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  textosEncabezado: {
    flex: 1,
    gap: 2,
  },
  nombrePoi: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  detallePoi: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  descripcion: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  filaProgreso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  puntos: {
    flexDirection: 'row',
    gap: 4,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  puntoActivo: {
    backgroundColor: colors.success,
  },
  textoConfirmaciones: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  bloqueError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  textoError: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.danger,
    lineHeight: 18,
  },
});
