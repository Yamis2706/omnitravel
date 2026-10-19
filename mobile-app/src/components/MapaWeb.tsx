import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

/**
 * Mapa U06/U07 sobre Leaflet dentro de WebView (alternativa nativa de
 * `react-native-maps` para Expo Go).
 *
 * Por qué: el mapa nativo con tiles OSM (`mapType="none"` + `UrlTile`)
 * dejó el lienzo vacío en un Android real y siguió intermitente en Expo Go.
 * Leaflet en WebView pinta tiles OpenStreetMap con UA de navegador
 * (aceptados por OSM) y no depende de API keys ni de binarios nativos de
 * Expo Go (decisión documentada en `mobile-app/README.md`).
 *
 * Protocolo de mensajes:
 *   WebView → nativo `{ tipo: 'listo' }` · `{ tipo: 'poi', id }`
 *   nativo → WebView `window.renderizar(pois, ruta, yo, ajustar)`,
 *             `window.centrar(lat, lng)`
 */

export interface PoiEnMapa {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  /** POI resaltado (por ejemplo, el destino seleccionado). */
  activo: boolean;
  /** Aún en validación comunitaria (marcador azul). */
  pendiente: boolean;
  /**
   * Barrera reportada por la comunidad (marcador naranja con aviso):
   * escaleras, aceras rotas, ascensores dañados…
   */
  barrera?: boolean;
  /** Texto del globo cuando es una barrera (qué se reportó). */
  descripcion?: string;
}

export interface RutaEnMapa {
  /** Secuencia de puntos (lat/long) del resultado del backend de rutas. */
  coordenadas: { latitude: number; longitude: number }[];
}

interface Props {
  pois: PoiEnMapa[];
  vistaInicial: { latitude: number; longitude: number };
  ruta?: RutaEnMapa | null;
  ubicacionUsuario?: { latitude: number; longitude: number } | null;
  /** Cambia la cámara (búsqueda / mi ubicación); `clave` fuerza el re-centrado. */
  centrar?: { latitude: number; longitude: number; clave: number } | null;
  /** Ajusta el encuadre a los puntos cada vez que cambia el conjunto. */
  ajustarAlCambiar?: boolean;
  onPoiPulsado: (idPoi: string) => void;
  /** Avisa una sola vez cuando Leaflet quedó listo dentro del WebView. */
  onListo?: () => void;
}

const HTML_MAPA = `<!DOCTYPE html><html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<title>Mapa OmniTravel</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css"/>
<style>
html,body,#mapa{height:100%;margin:0;padding:0;}
#mapa{background:#E8EEF4;}
.leaflet-container{font-family:-apple-system,Roboto,'Helvetica Neue',sans-serif;}
.barrera-icono{font-size:13px;line-height:22px;text-align:center;color:#FFFFFF;font-weight:bold;}
</style>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js"></script>
</head><body><div id="mapa"></div>
<script>
var mapa = L.map('mapa', { zoomControl: false });
mapa.setView([__LAT__, __LON__], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright" style="color:#4B5563">OpenStreetMap</a>'
}).addTo(mapa);
var capas = { pois: null, ruta: null, yo: null };
window.centrar = function(lat, lng) {
  mapa.flyTo([lat, lng], 16, { duration: 0.7 });
};
function enviar(json) {
  if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(json); }
}
enviar(JSON.stringify({ tipo: 'listo' }));
window.renderizar = function(pois, ruta, yo, ajustar) {
  var grupo = L.featureGroup();
  pois.forEach(function(p) {
    var marca;
    if (p.barrera) {
      marca = L.marker([p.latitud, p.longitud], {
        icon: L.divIcon({
          className: '',
          html: '<div class="barrera-icono" style="width:24px;height:24px;border-radius:50%;background:#F57B15;border:2px solid #FFFFFF;box-shadow:0 1px 4px rgba(16,24,40,.4)">!</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });
      marca.bindTooltip('Barrera: ' + (p.descripcion || p.nombre), { direction: 'top', offset: [0, -12] });
    } else {
      var color = p.activo ? '#0E7F43' : (p.pendiente ? '#F57B15' : '#0455BE');
      marca = L.circleMarker([p.latitud, p.longitud], {
        radius: p.activo ? 12 : 9,
        color: '#FFFFFF',
        weight: 2,
        fillColor: color,
        fillOpacity: 1
      });
      marca.bindTooltip(p.nombre, { direction: 'top', offset: [0, -10] });
    }
    marca.on('click', function() {
      enviar(JSON.stringify({ tipo: 'poi', id: String(p.id) }));
    });
    grupo.addLayer(marca);
  });
  if (capas.pois) { mapa.removeLayer(capas.pois); }
  capas.pois = grupo;
  grupo.addTo(mapa);
  var hayRuta = ruta && ruta.length > 1;
  if (hayRuta) {
    if (capas.ruta) { mapa.removeLayer(capas.ruta); }
    capas.ruta = L.polyline(ruta.map(function(c) { return [c.latitude, c.longitude]; }),
      { color: '#0455BE', weight: 4, opacity: 0.9 }).addTo(mapa);
  } else if (capas.ruta) {
    mapa.removeLayer(capas.ruta);
    capas.ruta = null;
  }
  if (yo) {
    if (capas.yo) { mapa.removeLayer(capas.yo); }
    capas.yo = L.circleMarker([yo.latitude, yo.longitude],
      { radius: 7, color: '#FFFFFF', weight: 2, fillColor: '#0288D1', fillOpacity: 1 }).addTo(mapa);
  } else if (capas.yo) {
    mapa.removeLayer(capas.yo);
    capas.yo = null;
  }
  if (ajustar === true) {
    var caja = hayRuta ? capas.ruta.getBounds() : grupo.getBounds();
    if (caja && caja.isValid && caja.isValid()) {
      mapa.fitBounds(caja, { padding: [40, 40] });
    }
  }
};
</script></body></html>`;

export function MapaWeb({
  pois,
  vistaInicial,
  ruta = null,
  ubicacionUsuario = null,
  centrar = null,
  ajustarAlCambiar = true,
  onPoiPulsado,
  onListo,
}: Props) {
  const referencia = useRef<WebView | null>(null);
  const listoRef = useRef(false);
  const [listo, setListo] = useState(false);
  // Lives en refs: evitan reconstruir el callback del mensaje (y el WebView).
  const manejarPoiRef = useRef(onPoiPulsado);
  const onListoRef = useRef(onListo);
  useEffect(() => {
    manejarPoiRef.current = onPoiPulsado;
    onListoRef.current = onListo;
  }, [onPoiPulsado, onListo]);

  const html = useMemo(
    () =>
      HTML_MAPA.replace('__LAT__', String(vistaInicial.latitude)).replace(
        '__LON__',
        String(vistaInicial.longitude),
      ),
    [vistaInicial.latitude, vistaInicial.longitude],
  );

  const manejarMensaje = useCallback((evento: WebViewMessageEvent) => {
    let datos: { tipo?: string; id?: string } = {};
    try {
      datos = JSON.parse(evento.nativeEvent.data) as {
        tipo?: string;
        id?: string;
      };
    } catch {
      return;
    }
    if (datos.tipo === 'listo' && !listoRef.current) {
      listoRef.current = true;
      setListo(true);
      onListoRef.current?.();
      return;
    }
    if (datos.tipo === 'poi' && typeof datos.id === 'string') {
      manejarPoiRef.current(datos.id);
    }
  }, []);

  // Empuja el estado visible completo al mapa: al quedar listo y en cada
  // cambio. El encuadre se reajusta cuando aparece o cambia una ruta.
  const rutaPreviaRef = useRef<RutaEnMapa | null>(null);
  useEffect(() => {
    if (!listo) {
      return;
    }
    const hayRuta = (ruta?.coordenadas.length ?? 0) > 1;
    const rutaCambio =
      ruta !== rutaPreviaRef.current && ruta?.coordenadas != null;
    rutaPreviaRef.current = ruta;
    const ajustar = ajustarAlCambiar && hayRuta && rutaCambio;
    const poisJson = JSON.stringify(pois);
    const rutaJson = JSON.stringify(ruta?.coordenadas ?? null);
    const yoJson = JSON.stringify(ubicacionUsuario);
    referencia.current?.injectJavaScript(
      `window.renderizar(${poisJson}, ${rutaJson}, ${yoJson}, ${ajustar}); true;`,
    );
  }, [listo, pois, ruta, ubicacionUsuario, ajustarAlCambiar]);

  // Cambio de cámara (búsqueda / mi ubicación) cuando la clave cambia.
  useEffect(() => {
    if (!listo || !centrar) {
      return;
    }
    referencia.current?.injectJavaScript(
      `window.centrar(${centrar.latitude}, ${centrar.longitude}); true;`,
    );
  }, [listo, centrar]);

  return (
    <View style={estilos.contenedor}>
      <WebView
        ref={referencia}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        onMessage={manejarMensaje}
        style={estilos.webview}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#E8EEF4',
  },
});
