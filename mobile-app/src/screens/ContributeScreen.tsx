import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { CampoTexto } from '../components/CampoTexto';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { ToggleRow } from '../components/ToggleRow';
import type { MainTabParamList } from '../navigation/types';
import {
  capturarFoto,
  subirEvidencia,
  type FotoCapturada,
  type OrigenFoto,
} from '../services/evidencias';
import { crearReporte, ReporteError } from '../services/reportes';
import { usePoisStore } from '../store/poisStore';
import {
  BORRADOR_INICIAL,
  construirCaracteristicas,
  contarValoresRespondidos,
  TIPOS_POI,
  validarPaso1,
  validarPaso2,
  type BorradorReporte,
  type ValorBorrador,
} from '../utils/reporteValidacion';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
  TOUCH_TARGET,
} from '../utils/theme';

type Paso = 1 | 2 | 3;

interface ResultadoEnvio {
  idPoi: string;
  nombre: string;
  avisoFoto?: string;
}

/** Lista de errores del paso (región viva del lector de pantalla). */
function ListaErrores({ errores }: { errores: string[] }) {
  if (errores.length === 0) {
    return null;
  }
  return (
    <View style={estilos.errores} accessibilityLiveRegion="polite">
      {errores.map((error) => (
        <View key={error} style={estilos.filaError}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={estilos.textoError}>{error}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * U09/U10 — Crear reporte colaborativo en 3 pasos:
 *   1. Tipo de reporte y lugar (nuevo con nombre/tipo, o existente a actualizar).
 *   2. Ubicación GPS, evidencia fotográfica (opcional) y descripción.
 *   3. Características de accesibilidad del catálogo + envío.
 *
 * Al enviar, la RPC `crear_reporte` crea el reporte en estado pendiente: con
 * 3 confirmaciones independientes la comunidad publica el punto (Proceso 1).
 */
export function ContributeScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList, 'Contribuir'>>();
  const pois = usePoisStore((estado) => estado.pois);
  const catalogo = usePoisStore((estado) => estado.catalogo);
  const fuente = usePoisStore((estado) => estado.fuente);
  const cargarPois = usePoisStore((estado) => estado.cargar);

  const [paso, setPaso] = useState<Paso>(1);
  const [borrador, setBorrador] = useState<BorradorReporte>(BORRADOR_INICIAL);
  const [busquedaPoi, setBusquedaPoi] = useState('');
  const [foto, setFoto] = useState<FotoCapturada | null>(null);
  const [erroresPaso, setErroresPaso] = useState<string[]>([]);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [ubicacionCargando, setUbicacionCargando] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);

  const actualizarBorrador = (parcial: Partial<BorradorReporte>) => {
    setBorrador((anterior) => ({ ...anterior, ...parcial }));
  };

  const actualizarValor = (id: string, valor: ValorBorrador) => {
    setBorrador((anterior) => ({
      ...anterior,
      valores: { ...anterior.valores, [id]: valor },
    }));
  };

  const poiSeleccionado = borrador.poiId
    ? pois.find((poi) => poi.id === borrador.poiId)
    : undefined;

  const poisFiltrados = busquedaPoi.trim()
    ? pois.filter((poi) =>
        poi.nombre.toLowerCase().includes(busquedaPoi.trim().toLowerCase()),
      )
    : pois;

  const anunciar = (mensaje: string) => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(mensaje);
    }
  };

  const continuar = () => {
    const errores =
      paso === 1 ? validarPaso1(borrador) : validarPaso2(borrador);
    setErroresPaso(errores);
    if (errores.length > 0) {
      anunciar('Hay errores en el formulario. Revisa los campos marcados.');
      return;
    }
    setPaso((anterior) => (anterior === 1 ? 2 : 3));
  };

  const retroceder = () => {
    setErroresPaso([]);
    setErrorEnvio(null);
    setPaso((anterior) => (anterior === 3 ? 2 : 1));
  };

  const capturarUbicacion = async () => {
    setUbicacionCargando(true);
    setErrorUbicacion(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorUbicacion(
          'Sin permiso de ubicación. Actívalo en los ajustes del teléfono o escríbela abajo.',
        );
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({});
      actualizarBorrador({
        lat: posicion.coords.latitude,
        lon: posicion.coords.longitude,
      });
      anunciar('Ubicación capturada.');
    } catch {
      setErrorUbicacion(
        'No pudimos obtener tu ubicación. Inténtalo de nuevo o escríbela abajo.',
      );
    } finally {
      setUbicacionCargando(false);
    }
  };

  const manejarFoto = async (origen: OrigenFoto) => {
    setErrorFoto(null);
    try {
      const capturada = await capturarFoto(origen);
      if (capturada) {
        setFoto(capturada);
        anunciar('Foto lista para adjuntar.');
      }
    } catch (error) {
      setErrorFoto((error as Error).message);
    }
  };

  const enviar = async () => {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      // La evidencia se sube primero; si falla, el reporte viaja sin foto
      // (degradación con gracia, RNF-19).
      let storageKey: string | null = null;
      let avisoFoto: string | undefined;
      if (foto) {
        try {
          const subida = await subirEvidencia(foto);
          storageKey = subida.storageKey;
        } catch (error) {
          avisoFoto = `${(error as Error).message} El reporte se envió sin foto.`;
        }
      }

      const creado = await crearReporte({
        poiId: borrador.modo === 'actualizacion' ? borrador.poiId : null,
        nombre: borrador.modo === 'nuevo' ? borrador.nombre.trim() : undefined,
        tipoPoi: borrador.modo === 'nuevo' ? borrador.tipoPoi : undefined,
        direccion: borrador.direccion.trim() || undefined,
        lat: borrador.lat ?? undefined,
        lon: borrador.lon ?? undefined,
        descripcion: borrador.descripcion.trim(),
        esCritico: borrador.esCritico,
        caracteristicas: construirCaracteristicas(catalogo, borrador.valores),
        evidenciaStorageKey: storageKey,
      });

      // Refresca el mapa/ficha para que el nuevo punto pendiente ya figure.
      void cargarPois();

      setResultado({
        idPoi: creado.idPoi,
        nombre:
          borrador.modo === 'nuevo'
            ? borrador.nombre.trim()
            : (poiSeleccionado?.nombre ?? 'el lugar'),
        avisoFoto,
      });
      anunciar('Reporte enviado. Queda pendiente de validación comunitaria.');
    } catch (error) {
      const mensaje =
        error instanceof ReporteError
          ? error.message
          : 'No pudimos enviar el reporte. Revisa tu conexión e inténtalo de nuevo.';
      setErrorEnvio(mensaje);
      anunciar(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const reiniciar = () => {
    setPaso(1);
    setBorrador(BORRADOR_INICIAL);
    setBusquedaPoi('');
    setFoto(null);
    setErroresPaso([]);
    setErrorUbicacion(null);
    setErrorFoto(null);
    setErrorEnvio(null);
    setResultado(null);
  };

  // ---------------------------------------------------------------------------
  // Éxito: el reporte entró a validación comunitaria
  // ---------------------------------------------------------------------------
  if (resultado) {
    return (
      <SafeAreaView style={estilos.pantalla} edges={['top']}>
        <ScrollView contentContainerStyle={estilos.contenido}>
          <Card estilo={estilos.tarjetaExito}>
            <View style={estilos.iconoExito}>
              <Ionicons
                name="checkmark-circle"
                size={36}
                color={colors.success}
              />
            </View>
            <Text style={estilos.tituloExito} accessibilityRole="header">
              ¡Reporte enviado!
            </Text>
            <Text style={estilos.textoExito}>
              «{resultado.nombre}» quedó en validación comunitaria. Cuando 3
              viajeros lo confirmen, se publicará automáticamente en el mapa.
            </Text>
            {resultado.avisoFoto ? (
              <View style={estilos.aviso} accessibilityLiveRegion="polite">
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color={colors.warning}
                />
                <Text style={estilos.textoAviso}>{resultado.avisoFoto}</Text>
              </View>
            ) : null}
          </Card>

          <View style={estilos.botones}>
            <AppButton
              titulo="Ver en el mapa"
              icono="map-outline"
              onPress={() => {
                const idPoi = resultado.idPoi;
                setResultado(null);
                reiniciar();
                navigation.navigate('Mapa', { destinoPoiId: idPoi });
              }}
            />
            <AppButton
              titulo="Crear otro reporte"
              variante="contorno"
              icono="add-circle-outline"
              onPress={reiniciar}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Wizard de 3 pasos
  // ---------------------------------------------------------------------------
  const titulosPaso: Record<Paso, string> = {
    1: 'Tipo de reporte y lugar',
    2: 'Evidencia y ubicación',
    3: 'Accesibilidad del lugar',
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.encabezado}>
          <Text style={estilos.titulo} accessibilityRole="header">
            Crear reporte
          </Text>
          <Text style={estilos.subtitulo}>
            Ayuda a la comunidad a conocer la accesibilidad real de los lugares.
          </Text>
        </View>

        <View
          style={estilos.indicador}
          accessible
          accessibilityLabel={`Paso ${paso} de 3: ${titulosPaso[paso]}`}
        >
          {([1, 2, 3] as Paso[]).map((numero) => (
            <View
              key={numero}
              style={[
                estilos.puntoIndicador,
                numero <= paso ? estilos.puntoActivo : null,
              ]}
            />
          ))}
          <Text style={estilos.textoIndicador}>
            Paso {paso} de 3 · {titulosPaso[paso]}
          </Text>
        </View>

        {fuente === 'mock' ? (
          <Card estilo={estilos.tarjetaAviso}>
            <View style={estilos.filaAviso}>
              <Ionicons
                name="cloud-offline-outline"
                size={18}
                color={colors.warning}
              />
              <Text style={estilos.textoAviso}>
                Estás viendo datos de demostración: para enviar reportes se
                necesita la conexión con la base de datos del equipo.
              </Text>
            </View>
          </Card>
        ) : null}

        {/* ------------------------------ PASO 1 ------------------------------ */}
        {paso === 1 ? (
          <>
            <View style={estilos.seccion}>
              <Text style={estilos.tituloSeccion}>¿Qué quieres reportar?</Text>
              <View style={estilos.filaOpciones}>
                <Pressable
                  onPress={() =>
                    actualizarBorrador({ modo: 'nuevo', poiId: null })
                  }
                  accessibilityRole="radio"
                  accessibilityState={{ selected: borrador.modo === 'nuevo' }}
                  accessibilityLabel="Un lugar nuevo Aún no aparece en el mapa"
                  accessibilityHint="Un lugar que todavía no aparece en el mapa"
                  style={[
                    estilos.opcion,
                    borrador.modo === 'nuevo' ? estilos.opcionActiva : null,
                  ]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={
                      borrador.modo === 'nuevo'
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text style={estilos.opcionTitulo}>Un lugar nuevo</Text>
                  <Text style={estilos.opcionDescripcion}>
                    Aún no aparece en el mapa
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => actualizarBorrador({ modo: 'actualizacion' })}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: borrador.modo === 'actualizacion',
                  }}
                  accessibilityLabel="Actualizar un lugar Ya está en el mapa"
                  accessibilityHint="Corrige o amplía los datos de un lugar del mapa"
                  style={[
                    estilos.opcion,
                    borrador.modo === 'actualizacion'
                      ? estilos.opcionActiva
                      : null,
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={22}
                    color={
                      borrador.modo === 'actualizacion'
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text style={estilos.opcionTitulo}>Actualizar un lugar</Text>
                  <Text style={estilos.opcionDescripcion}>
                    Ya está en el mapa
                  </Text>
                </Pressable>
              </View>
            </View>

            {borrador.modo === 'nuevo' ? (
              <View style={estilos.seccion}>
                <CampoTexto
                  etiqueta="Nombre del lugar"
                  icono="business-outline"
                  placeholder="Ej.: Centro Cultural del Café"
                  value={borrador.nombre}
                  onChangeText={(nombre) => actualizarBorrador({ nombre })}
                  autoCapitalize="words"
                />
                <View>
                  <Text style={estilos.etiquetaGrupo}>Tipo de lugar</Text>
                  <View style={estilos.chips}>
                    {TIPOS_POI.map((tipo) => (
                      <Chip
                        key={tipo.valor}
                        etiqueta={tipo.etiqueta}
                        seleccionado={borrador.tipoPoi === tipo.valor}
                        onPress={() =>
                          actualizarBorrador({ tipoPoi: tipo.valor })
                        }
                      />
                    ))}
                  </View>
                </View>
                <CampoTexto
                  etiqueta="Dirección (opcional)"
                  icono="location-outline"
                  placeholder="Calle 12 # 4-56"
                  value={borrador.direccion}
                  onChangeText={(direccion) =>
                    actualizarBorrador({ direccion })
                  }
                  autoCapitalize="sentences"
                />
              </View>
            ) : (
              <View style={estilos.seccion}>
                <CampoTexto
                  etiqueta="Buscar el lugar"
                  icono="search-outline"
                  placeholder="Escribe el nombre del lugar"
                  value={busquedaPoi}
                  onChangeText={setBusquedaPoi}
                  autoCapitalize="none"
                />
                {poisFiltrados.length === 0 ? (
                  <Text style={estilos.textoSecundario}>
                    No encontramos lugares con ese nombre.
                  </Text>
                ) : (
                  poisFiltrados.slice(0, 6).map((poi) => {
                    const activo = borrador.poiId === poi.id;
                    return (
                      <Pressable
                        key={poi.id}
                        onPress={() => actualizarBorrador({ poiId: poi.id })}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: activo }}
                        accessibilityLabel={`${poi.nombre}, ${poi.categoria}`}
                        style={[
                          estilos.filaLugar,
                          activo ? estilos.filaLugarActiva : null,
                        ]}
                      >
                        <View style={estilos.textosLugar}>
                          <Text style={estilos.nombreLugar}>{poi.nombre}</Text>
                          <Text style={estilos.detalleLugar}>
                            {poi.categoria} · {poi.direccion}
                          </Text>
                        </View>
                        <Ionicons
                          name={activo ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={activo ? colors.primary : colors.textMuted}
                        />
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}

            <ListaErrores errores={erroresPaso} />
            <AppButton
              titulo="Continuar"
              icono="arrow-forward-outline"
              onPress={continuar}
            />
          </>
        ) : null}

        {/* ------------------------------ PASO 2 ------------------------------ */}
        {paso === 2 ? (
          <>
            <View style={estilos.seccion}>
              <Text style={estilos.tituloSeccion}>Ubicación</Text>
              <Text style={estilos.subtitulo}>
                Tu ubicación se usa solo para ubicar el aporte en el mapa (Ley
                1581); no se comparte con terceros.
              </Text>
              {borrador.modo === 'actualizacion' && poiSeleccionado ? (
                <Card estilo={estilos.tarjetaSuave}>
                  <View style={estilos.filaAviso}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={estilos.textoAviso}>
                      Usaremos la ubicación registrada de «
                      {poiSeleccionado.nombre}».
                    </Text>
                  </View>
                </Card>
              ) : (
                <>
                  <AppButton
                    titulo={
                      borrador.lat !== null
                        ? 'Actualizar mi ubicación'
                        : 'Usar mi ubicación actual'
                    }
                    variante="contorno"
                    icono="navigate-outline"
                    cargando={ubicacionCargando}
                    onPress={() => void capturarUbicacion()}
                  />
                  {borrador.lat !== null && borrador.lon !== null ? (
                    <Text style={estilos.textoExitoPequeno}>
                      Ubicación capturada: {borrador.lat.toFixed(5)},{' '}
                      {borrador.lon.toFixed(5)}
                    </Text>
                  ) : null}
                  {errorUbicacion ? (
                    <Text
                      style={estilos.textoError}
                      accessibilityLiveRegion="polite"
                    >
                      {errorUbicacion}
                    </Text>
                  ) : null}
                  <View style={estilos.filaCoordenadas}>
                    <View style={estilos.campoMitad}>
                      <CampoTexto
                        etiqueta="Latitud"
                        icono="pin-outline"
                        placeholder="4.53389"
                        value={
                          borrador.lat !== null ? String(borrador.lat) : ''
                        }
                        onChangeText={(texto) =>
                          actualizarBorrador({
                            lat:
                              texto.trim() === ''
                                ? null
                                : Number(texto.replace(',', '.')),
                          })
                        }
                        keyboardType="decimal-pad"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={estilos.campoMitad}>
                      <CampoTexto
                        etiqueta="Longitud"
                        icono="pin-outline"
                        placeholder="-75.68111"
                        value={
                          borrador.lon !== null ? String(borrador.lon) : ''
                        }
                        onChangeText={(texto) =>
                          actualizarBorrador({
                            lon:
                              texto.trim() === ''
                                ? null
                                : Number(texto.replace(',', '.')),
                          })
                        }
                        keyboardType="decimal-pad"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={estilos.seccion}>
              <Text style={estilos.tituloSeccion}>
                Foto de evidencia (opcional)
              </Text>
              {foto ? (
                <>
                  <Image
                    source={{ uri: foto.uri }}
                    style={estilos.vistaFoto}
                    accessibilityRole="image"
                    accessibilityLabel="Foto de evidencia capturada"
                    accessibilityIgnoresInvertColors
                  />
                  <AppButton
                    titulo="Quitar foto"
                    variante="fantasma"
                    icono="trash-outline"
                    onPress={() => setFoto(null)}
                  />
                </>
              ) : (
                <>
                  <AppButton
                    titulo="Tomar foto"
                    variante="contorno"
                    icono="camera-outline"
                    onPress={() => void manejarFoto('camara')}
                  />
                  <AppButton
                    titulo="Elegir de la galería"
                    variante="contorno"
                    icono="images-outline"
                    onPress={() => void manejarFoto('galeria')}
                  />
                </>
              )}
              <Text style={estilos.textoSecundario}>
                Máximo 5 MB (JPG, PNG o WebP). Si la subida falla, el reporte se
                envía igual sin foto.
              </Text>
              {errorFoto ? (
                <Text
                  style={estilos.textoError}
                  accessibilityLiveRegion="polite"
                >
                  {errorFoto}
                </Text>
              ) : null}
            </View>

            <View style={estilos.seccion}>
              <ToggleRow
                etiqueta="Barrera crítica o peligro"
                descripcion="Marca si detectaste un riesgo para la accesibilidad: la moderación lo revisará con prioridad."
                valor={borrador.esCritico}
                onCambio={(esCritico) => actualizarBorrador({ esCritico })}
              />
              <CampoTexto
                etiqueta="¿Qué encontraste?"
                icono="chatbox-outline"
                placeholder="Describe la entrada, el estado de la rampa, si el acceso es amplio…"
                value={borrador.descripcion}
                onChangeText={(descripcion) =>
                  actualizarBorrador({ descripcion })
                }
                autoCapitalize="sentences"
                multilinea
              />
            </View>

            <ListaErrores errores={erroresPaso} />
            <View style={estilos.filaBotones}>
              <View style={estilos.botonMitad}>
                <AppButton
                  titulo="Atrás"
                  variante="contorno"
                  icono="arrow-back-outline"
                  onPress={retroceder}
                />
              </View>
              <View style={estilos.botonMitad}>
                <AppButton
                  titulo="Continuar"
                  icono="arrow-forward-outline"
                  onPress={continuar}
                />
              </View>
            </View>
          </>
        ) : null}

        {/* ------------------------------ PASO 3 ------------------------------ */}
        {paso === 3 ? (
          <>
            <View style={estilos.seccion}>
              <Text style={estilos.tituloSeccion}>
                Características de accesibilidad
              </Text>
              <Text style={estilos.textoSecundario}>
                Responde solo lo que pudiste comprobar (
                {contarValoresRespondidos(borrador.valores)} de{' '}
                {catalogo.length} respondidas).
              </Text>
              <Card estilo={estilos.tarjetaSuave}>
                {catalogo.map((caracteristica) => {
                  const valor = borrador.valores[caracteristica.id] ?? {};
                  if (caracteristica.tipoValor === 'BOOLEANO') {
                    return (
                      <ToggleRow
                        key={caracteristica.id}
                        etiqueta={caracteristica.nombre}
                        descripcion={caracteristica.descripcion}
                        valor={valor.booleano ?? false}
                        onCambio={(booleano) =>
                          actualizarValor(caracteristica.id, {
                            ...valor,
                            booleano,
                          })
                        }
                      />
                    );
                  }
                  if (caracteristica.tipoValor === 'NUMERICO') {
                    return (
                      <CampoTexto
                        key={caracteristica.id}
                        etiqueta={caracteristica.nombre}
                        icono={caracteristica.icono}
                        placeholder={
                          caracteristica.unidad
                            ? `Valor en ${caracteristica.unidad}`
                            : 'Valor numérico'
                        }
                        value={valor.numerico ?? ''}
                        onChangeText={(numerico) =>
                          actualizarValor(caracteristica.id, {
                            ...valor,
                            numerico,
                          })
                        }
                        keyboardType="decimal-pad"
                        autoCapitalize="none"
                      />
                    );
                  }
                  return (
                    <CampoTexto
                      key={caracteristica.id}
                      etiqueta={caracteristica.nombre}
                      icono={caracteristica.icono}
                      placeholder="Escribe el detalle"
                      value={valor.texto ?? ''}
                      onChangeText={(texto) =>
                        actualizarValor(caracteristica.id, { ...valor, texto })
                      }
                      autoCapitalize="sentences"
                    />
                  );
                })}
              </Card>
            </View>

            <View style={estilos.seccion}>
              <Text style={estilos.tituloSeccion}>Resumen</Text>
              <Card estilo={estilos.tarjetaSuave}>
                <Text style={estilos.lineaResumen}>
                  <Text style={estilos.etiquetaResumen}>Lugar: </Text>
                  {borrador.modo === 'nuevo'
                    ? borrador.nombre.trim()
                    : (poiSeleccionado?.nombre ?? 'Sin seleccionar')}
                </Text>
                <Text style={estilos.lineaResumen}>
                  <Text style={estilos.etiquetaResumen}>Tipo de reporte: </Text>
                  {borrador.modo === 'nuevo'
                    ? 'Lugar nuevo'
                    : 'Actualización de un lugar existente'}
                </Text>
                <Text style={estilos.lineaResumen}>
                  <Text style={estilos.etiquetaResumen}>Evidencia: </Text>
                  {foto ? 'Foto adjunta' : 'Sin foto'}
                </Text>
                {borrador.esCritico ? (
                  <Text style={estilos.lineaResumen}>
                    <Text style={estilos.etiquetaResumen}>Prioridad: </Text>
                    Barrera crítica (revisión prioritaria)
                  </Text>
                ) : null}
              </Card>
              <Text style={estilos.textoSecundario}>
                Tu reporte entrará en validación comunitaria: con 3
                confirmaciones de otros viajeros se publicará en el mapa.
              </Text>
            </View>

            {errorEnvio ? (
              <View style={estilos.avisoError} accessibilityLiveRegion="polite">
                <Ionicons name="close-circle" size={16} color={colors.danger} />
                <Text style={estilos.textoError}>{errorEnvio}</Text>
              </View>
            ) : null}

            <View style={estilos.filaBotones}>
              <View style={estilos.botonMitad}>
                <AppButton
                  titulo="Atrás"
                  variante="contorno"
                  icono="arrow-back-outline"
                  onPress={retroceder}
                  deshabilitado={enviando}
                />
              </View>
              <View style={estilos.botonMitad}>
                <AppButton
                  titulo="Enviar reporte"
                  icono="send-outline"
                  cargando={enviando}
                  deshabilitado={enviando}
                  onPress={() => void enviar()}
                />
              </View>
            </View>
          </>
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
  contenido: {
    padding: spacing.lg,
    gap: spacing.lg,
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
  indicador: {
    gap: spacing.xs,
  },
  puntoIndicador: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    flex: 1,
  },
  puntoActivo: {
    backgroundColor: colors.primary,
  },
  textoIndicador: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  seccion: {
    gap: spacing.sm,
  },
  tituloSeccion: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  etiquetaGrupo: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filaOpciones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  opcion: {
    flex: 1,
    minHeight: TOUCH_TARGET * 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.white,
  },
  opcionActiva: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  opcionTitulo: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  opcionDescripcion: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  filaLugar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  filaLugarActiva: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  textosLugar: {
    flex: 1,
    gap: 2,
  },
  nombreLugar: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  detalleLugar: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  textoExitoPequeno: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  filaCoordenadas: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  campoMitad: {
    flex: 1,
  },
  vistaFoto: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  tarjetaSuave: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
    gap: spacing.sm,
  },
  tarjetaAviso: {
    backgroundColor: colors.warningSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  filaAviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textoAviso: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errores: {
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  filaError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  textoError: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.danger,
    lineHeight: 18,
  },
  avisoError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonMitad: {
    flex: 1,
  },
  tarjetaExito: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconoExito: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloExito: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  textoExito: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  textoSecundario: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    alignSelf: 'stretch',
  },
  botones: {
    gap: spacing.sm,
  },
  textoResumen: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  lineaResumen: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  etiquetaResumen: {
    fontWeight: fontWeight.semibold,
  },
});
