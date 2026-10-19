import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { Badge, type TonoBadge } from '../components/Badge';
import { CampoTexto } from '../components/CampoTexto';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import type { RootStackParamList } from '../navigation/types';
import { urlPublicaEvidencia } from '../services/evidencias';
import {
  decidirReporte,
  listarReportesModeracion,
  ReporteError,
} from '../services/reportes';
import type {
  EstadoReporte,
  ReporteModeracion,
  ValorCaracteristicaReporte,
} from '../services/types';
import { useProfileStore } from '../store/profileStore';
import { formatearFechaCorta } from '../utils/format';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
  TOUCH_TARGET,
} from '../utils/theme';

/** Texto legible de un valor propuesto por el reporte. */
function formatearValor(valor: ValorCaracteristicaReporte): string {
  if (valor.valorBooleano !== undefined) {
    return valor.valorBooleano ? 'Sí' : 'No';
  }
  if (valor.valorNumerico !== undefined) {
    return String(valor.valorNumerico);
  }
  return valor.valorTexto && valor.valorTexto.trim() !== ''
    ? valor.valorTexto
    : '—';
}

/** Chips de estado de la consola; pendientes es el que exige acción. */
const FILTROS_ESTADO: { id: EstadoReporte | 'todos'; etiqueta: string }[] = [
  { id: 'pendiente_validacion', etiqueta: 'Pendientes' },
  { id: 'en_revision', etiqueta: 'En revisión' },
  { id: 'publicado', etiqueta: 'Publicados' },
  { id: 'rechazado', etiqueta: 'Rechazados' },
  { id: 'todos', etiqueta: 'Todos' },
];

/** Badge del estado real del reporte en la lista (M03). */
function badgeDeEstado(estado: string): { texto: string; tono: TonoBadge } {
  switch (estado) {
    case 'publicado':
      return { texto: 'Publicado', tono: 'exito' };
    case 'en_revision':
      return { texto: 'En revisión', tono: 'neutro' };
    case 'rechazado':
      return { texto: 'Rechazado', tono: 'peligro' };
    default:
      return { texto: 'Pendiente', tono: 'alerta' };
  }
}

interface Props {
  /** Embebida como pestaña de la app: sin botón atrás, con recarga propia. */
  embebida?: boolean;
}

/**
 * M03/M04/M05 — Consola de moderación (Vía B del Proceso 1).
 *
 * Solo accesible para roles moderador/administrador (RNF-09): la propia BD
 * valida el rol en `listar_reportes_moderacion`; aquí se oculta la entrada
 * para el resto de perfiles. Lista los reportes por estado (pendientes,
 * en revisión, publicados, rechazados o todos), muestra el detalle con
 * evidencia y permite aprobar (publicación directa) o rechazar con motivo
 * obligatorio y auditado (RNF-22/30).
 */
export function ModeracionScreen({ embebida = false }: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const perfil = useProfileStore((estado) => estado.perfil);
  const esModerador =
    perfil?.rol === 'moderador' || perfil?.rol === 'administrador';

  const [reportes, setReportes] = useState<ReporteModeracion[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<ReporteModeracion | null>(
    null,
  );
  const [motivoVisible, setMotivoVisible] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  /** Token de recarga: subirlo desde un manejador relanza la consulta. */
  const [recarga, setRecarga] = useState(0);
  /** Filtro de estado (M03): 'todos' pide a la RPC el historial completo. */
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoReporte | 'todos'>(
    'pendiente_validacion',
  );

  const refrescar = () => setRecarga((numero) => numero + 1);

  // Carga la lista al entrar, al refrescar (token) y al cambiar el filtro,
  // sin setState síncrono en el efecto: los estados se fijan en callbacks.
  useEffect(() => {
    let vigente = true;
    if (!esModerador) {
      return undefined;
    }
    listarReportesModeracion(estadoFiltro === 'todos' ? null : estadoFiltro)
      .then((lista) => {
        if (vigente) {
          setReportes(lista);
          setErrorCarga(null);
        }
      })
      .catch((error) => {
        if (vigente) {
          setErrorCarga(
            error instanceof ReporteError
              ? error.message
              : 'No pudimos cargar los reportes. Revisa tu conexión.',
          );
        }
      });
    return () => {
      vigente = false;
    };
  }, [esModerador, recarga, estadoFiltro]);

  const abrirDetalle = (reporte: ReporteModeracion) => {
    setAviso(null);
    setErrorAccion(null);
    setSeleccionado(reporte);
  };

  const cerrarDetalle = () => {
    setSeleccionado(null);
    setMotivoVisible(false);
    setMotivo('');
    setErrorMotivo(null);
  };

  /** Ejecuta la decisión ejecutiva (aprobar o rechazar) contra la RPC. */
  const decidir = async (
    reporte: ReporteModeracion,
    accion: 'aprobado' | 'rechazado',
    motivoTexto?: string,
  ) => {
    setProcesando(true);
    setErrorAccion(null);
    try {
      await decidirReporte(reporte.id, accion, motivoTexto);
      setAviso(
        accion === 'aprobado'
          ? `«${reporte.poi.nombre}» se publicó con los valores del reporte.`
          : `El reporte de «${reporte.poi.nombre}» quedó rechazado con su motivo.`,
      );
      cerrarDetalle();
      refrescar();
    } catch (error) {
      setErrorAccion(
        error instanceof ReporteError
          ? error.message
          : 'No pudimos completar la decisión. Inténtalo de nuevo.',
      );
    } finally {
      setProcesando(false);
    }
  };

  const aprobar = (reporte: ReporteModeracion) => {
    Alert.alert(
      'Publicar reporte',
      `¿Publicar «${reporte.poi.nombre}» con los valores propuestos por la comunidad?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Publicar',
          onPress: () => {
            void decidir(reporte, 'aprobado');
          },
        },
      ],
    );
  };

  const confirmarRechazo = () => {
    if (!seleccionado) {
      return;
    }
    if (!motivo.trim()) {
      setErrorMotivo('Escribe el motivo del rechazo (obligatorio).');
      return;
    }
    void decidir(seleccionado, 'rechazado', motivo);
  };

  // ---------------------------------------------------------------------------
  // Acceso restringido (RNF-09)
  // ---------------------------------------------------------------------------
  if (!esModerador) {
    return (
      <SafeAreaView style={estilos.pantalla} edges={['top']}>
        <EmptyState
          icono="lock-closed-outline"
          titulo="Acceso restringido"
          descripcion="Solo las cuentas de moderación pueden revisar los reportes de la comunidad."
          textoBoton="Volver"
          onPressBoton={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // M04/M05 — Detalle del reporte seleccionado
  // ---------------------------------------------------------------------------
  if (seleccionado) {
    const evidencia = seleccionado.evidencia.find(
      (item) => item.storageKey !== '',
    );
    return (
      <SafeAreaView style={estilos.pantalla} edges={['top']}>
        <View style={estilos.barraNavegacion}>
          <Pressable
            onPress={cerrarDetalle}
            style={estilos.botonAtras}
            accessibilityRole="button"
            accessibilityLabel="Volver a la lista de reportes"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
          <Text style={estilos.tituloBarra}>Revisar reporte</Text>
        </View>

        <ScrollView contentContainerStyle={estilos.contenido}>
          {evidencia ? (
            <Image
              source={{ uri: urlPublicaEvidencia(evidencia.storageKey) }}
              style={estilos.vistaEvidencia}
              accessibilityRole="image"
              accessibilityLabel={`Evidencia fotográfica del reporte de ${seleccionado.poi.nombre}`}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={estilos.sinEvidencia}>
              <Ionicons
                name="image-outline"
                size={32}
                color={colors.textMuted}
              />
              <Text style={estilos.textoVacio}>
                Este reporte no incluye foto de evidencia.
              </Text>
            </View>
          )}

          <View style={estilos.filaBadges}>
            <Badge tono="alerta" texto="Pendiente" />
            {seleccionado.esCritico ? (
              <Badge tono="peligro" texto="Prioritario" />
            ) : null}
            <Badge
              tono="neutro"
              texto={
                seleccionado.tipo === 'nuevo' ? 'Lugar nuevo' : 'Actualización'
              }
            />
            <Badge
              tono="neutro"
              texto={`${seleccionado.confirmaciones} de 3 confirmaciones`}
            />
          </View>

          <Card>
            <Text style={estilos.nombrePoi}>{seleccionado.poi.nombre}</Text>
            <Text style={estilos.detallePoi}>
              {seleccionado.poi.tipo} ·{' '}
              {seleccionado.poi.direccion || 'Sin dirección'}
            </Text>
            {seleccionado.poi.lat !== undefined &&
            seleccionado.poi.lon !== undefined ? (
              <Text style={estilos.detallePoi}>
                GPS: {seleccionado.poi.lat.toFixed(5)},{' '}
                {seleccionado.poi.lon.toFixed(5)}
              </Text>
            ) : null}
            <Text style={estilos.detallePoi}>
              Reportado por: {seleccionado.autor ?? 'cuenta eliminada'} ·{' '}
              {formatearFechaCorta(seleccionado.fechaCreacion)}
            </Text>
          </Card>

          <Card>
            <Text style={estilos.tituloSeccion}>Descripción del reporte</Text>
            <Text style={estilos.textoDescripcion}>
              {seleccionado.descripcion || 'Sin descripción adicional.'}
            </Text>
          </Card>

          <Card>
            <Text style={estilos.tituloSeccion}>
              Valores propuestos ({seleccionado.valores.length})
            </Text>
            {seleccionado.valores.length === 0 ? (
              <Text style={estilos.textoVacio}>
                El reporte no propone valores de características.
              </Text>
            ) : (
              seleccionado.valores.map((valor) => (
                <View key={valor.caracteristicaId} style={estilos.filaValor}>
                  <Text style={estilos.nombreValor}>{valor.nombre}</Text>
                  <Text style={estilos.valorValor}>
                    {formatearValor(valor)}
                  </Text>
                </View>
              ))
            )}
          </Card>

          {errorAccion ? (
            <View style={estilos.bloqueError} accessibilityLiveRegion="polite">
              <Ionicons name="close-circle" size={16} color={colors.danger} />
              <Text style={estilos.textoError}>{errorAccion}</Text>
            </View>
          ) : null}

          <View style={estilos.botonesDecision}>
            <AppButton
              titulo="Aprobar y publicar"
              icono="checkmark-circle-outline"
              cargando={procesando}
              deshabilitado={procesando}
              onPress={() => aprobar(seleccionado)}
              pistaAccesibilidad="Publica el lugar en el mapa con los valores propuestos"
            />
            <AppButton
              titulo="Rechazar con motivo"
              variante="peligro"
              icono="close-circle-outline"
              deshabilitado={procesando}
              onPress={() => setMotivoVisible(true)}
            />
          </View>
        </ScrollView>

        {/* M05 — motivo del rechazo (obligatorio y auditado) */}
        <Modal
          visible={motivoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMotivoVisible(false)}
          accessibilityViewIsModal
        >
          <View style={estilos.fondoModal}>
            <View style={estilos.tarjetaModal}>
              <Text style={estilos.tituloModal}>Rechazar reporte</Text>
              <Text style={estilos.textoModal}>
                El motivo queda auditado y el reporte no se publicará (RNF-30).
              </Text>
              <CampoTexto
                etiqueta="Motivo del rechazo"
                icono="chatbox-outline"
                placeholder="Ej.: la foto no corresponde al lugar reportado"
                value={motivo}
                onChangeText={setMotivo}
                multilinea
                error={errorMotivo ?? undefined}
              />
              <View style={estilos.filaBotones}>
                <View style={estilos.botonMitad}>
                  <AppButton
                    titulo="Cancelar"
                    variante="contorno"
                    onPress={() => setMotivoVisible(false)}
                    deshabilitado={procesando}
                  />
                </View>
                <View style={estilos.botonMitad}>
                  <AppButton
                    titulo="Rechazar"
                    variante="peligro"
                    cargando={procesando}
                    deshabilitado={procesando}
                    onPress={confirmarRechazo}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // M03 — Lista de reportes en validación
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <View style={estilos.barraNavegacion}>
        {embebida ? null : (
          <Pressable
            onPress={() => navigation.goBack()}
            style={estilos.botonAtras}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
        )}
        <Text style={[estilos.tituloBarra, estilos.tituloBarraFlexible]}>
          {embebida ? 'Reportes de la comunidad' : 'Consola de moderación'}
        </Text>
        <Pressable
          onPress={refrescar}
          style={estilos.botonRefrescar}
          accessibilityRole="button"
          accessibilityLabel="Actualizar la lista de reportes"
        >
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.subtitulo}>
          Revisa, verifica o publica los reportes de la comunidad. Los marcados
          como prioritarios detectaron una barrera crítica.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.chipsEstado}
          accessibilityLabel="Filtrar reportes por estado"
        >
          {FILTROS_ESTADO.map(({ id, etiqueta }) => {
            const activoFiltro = estadoFiltro === id;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  setEstadoFiltro(id);
                  setReportes(null);
                  setErrorCarga(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Ver reportes ${etiqueta.toLowerCase()}`}
                accessibilityState={{ selected: activoFiltro }}
                style={[
                  estilos.chipEstado,
                  activoFiltro ? estilos.chipEstadoActivo : null,
                ]}
              >
                <Text
                  style={[
                    estilos.chipEstadoTexto,
                    activoFiltro ? estilos.chipEstadoTextoActivo : null,
                  ]}
                >
                  {etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {aviso ? (
          <View style={estilos.bloqueExito} accessibilityLiveRegion="polite">
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.success}
            />
            <Text style={estilos.textoExito}>{aviso}</Text>
          </View>
        ) : null}

        {reportes === null && !errorCarga ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            accessibilityLabel="Cargando reportes"
            style={estilos.cargando}
          />
        ) : null}

        {errorCarga ? (
          <View style={estilos.bloqueError} accessibilityLiveRegion="polite">
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={colors.danger}
            />
            <Text style={estilos.textoError}>{errorCarga}</Text>
          </View>
        ) : null}

        {reportes && reportes.length === 0 && !errorCarga ? (
          <EmptyState
            icono="file-tray-outline"
            titulo={
              estadoFiltro === 'pendiente_validacion'
                ? 'Sin reportes pendientes'
                : 'Sin reportes con este estado'
            }
            descripcion="No hay reportes de la comunidad con el estado seleccionado por ahora."
            textoBoton="Actualizar"
            onPressBoton={refrescar}
          />
        ) : null}

        {reportes
          ? reportes.map((reporte) => {
              const estado = badgeDeEstado(reporte.estado);
              return (
                <Card key={reporte.id} estilo={estilos.tarjetaReporte}>
                  <View style={estilos.filaEncabezado}>
                    <View style={estilos.textosReporte}>
                      <Text style={estilos.nombrePoi}>
                        {reporte.poi.nombre}
                      </Text>
                      <Text style={estilos.detallePoi}>
                        {reporte.tipo === 'nuevo'
                          ? 'Lugar nuevo'
                          : 'Actualización'}{' '}
                        · {reporte.poi.tipo} ·{' '}
                        {formatearFechaCorta(reporte.fechaCreacion)}
                      </Text>
                    </View>
                    <View style={estilos.badgesEstado}>
                      <Badge tono={estado.tono} texto={estado.texto} />
                      {reporte.esCritico ? (
                        <Badge tono="peligro" texto="Prioritario" />
                      ) : null}
                    </View>
                  </View>
                  <Text style={estilos.detallePoi} numberOfLines={2}>
                    {reporte.descripcion || 'Sin descripción.'}
                  </Text>
                  <View style={estilos.filaEncabezado}>
                    <Badge
                      tono="neutro"
                      texto={`${reporte.confirmaciones} de 3 confirmaciones`}
                    />
                    <Badge
                      tono={reporte.evidencia.length > 0 ? 'exito' : 'neutro'}
                      texto={
                        reporte.evidencia.length > 0 ? 'Con foto' : 'Sin foto'
                      }
                    />
                  </View>
                  <AppButton
                    titulo="Revisar reporte"
                    variante="contorno"
                    icono="eye-outline"
                    onPress={() => abrirDetalle(reporte)}
                  />
                </Card>
              );
            })
          : null}
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
  botonRefrescar: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloBarraFlexible: {
    flex: 1,
  },
  chipsEstado: {
    gap: spacing.sm,
    paddingVertical: 2,
    paddingRight: spacing.md,
  },
  chipEstado: {
    minHeight: 36,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipEstadoActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipEstadoTexto: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  chipEstadoTextoActivo: {
    color: colors.white,
  },
  badgesEstado: {
    alignItems: 'flex-end',
    gap: spacing.xs,
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
  tarjetaReporte: {
    gap: spacing.sm,
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  textosReporte: {
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
    lineHeight: 18,
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
  vistaEvidencia: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  sinEvidencia: {
    height: 120,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  textoVacio: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  filaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tituloSeccion: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  textoDescripcion: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  filaValor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nombreValor: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  valorValor: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  botonesDecision: {
    gap: spacing.sm,
  },
  fondoModal: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  tarjetaModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  tituloModal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  textoModal: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonMitad: {
    flex: 1,
  },
});
