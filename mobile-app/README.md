# OmniTravel — App Móvil (React Native + Expo)

Adelanto del **Módulo Viajero/Comunidad** de OmniTravel: plataforma colaborativa
de turismo accesible que centraliza, verifica (crowdsourcing) y personaliza la
información de accesibilidad de infraestructura turística.

> **Estado:** MVP navegable (rama `dev_yamis`) con login por roles (U01/U02),
> registro (U03), inicio con feed (U04), mapa con búsqueda/ruta accesible
> (U06), navegación con guía por voz (U07), detalle (U08), wizard de reporte
> en 4 pasos (U09/U10), guardados, perfil con "Mis reportes" (U12) y consola
> de moderación embebida (M03–M05): datos de la BD del equipo (Supabase
> OmniTravel) con degradación a demo tipada y ruteo real contra el backend
> (`POST /routes`).

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Expo SDK 57 + React Native 0.86 + TypeScript estricto |
| Navegación | React Navigation 7 (stack + bottom tabs) |
| Estado | Zustand 5 |
| Almacenamiento local | expo-secure-store (perfil, cifrado) + AsyncStorage (disponible) |
| Mapas | Leaflet 1.9 (CDN) en react-native-webview + tiles OpenStreetMap (ADR-06, sin API key) |
| Ubicación | expo-location |
| Pruebas | Jest + jest-expo + React Native Testing Library |
| Calidad | ESLint 9 (flat) + Prettier + `eslint-plugin-triple-rn-a11y` (WCAG) |

## Estructura

Alineada con el árbol del **C4 Nivel 4** (`docs/` del repositorio raíz):

```
mobile-app/
├── App.tsx                  # Punto de entrada (SafeAreaProvider + RootNavigator)
├── src/
│   ├── screens/             # U01/U02 Login (rol) · U03 Registro · U04 Inicio (feed) · U06 Mapa (WebView) · U07 Navegación (voz) · U08 Detalle · U09/U10 Contribuir (4 pasos) · Guardados · Moderación (M03/M04) · U12 Perfil + Mis reportes
│   ├── components/          # UI accesible: botones, chips, badges, FilterSheet, PoiCard, PoiCardFeed, BrandMark (logo)…
│   ├── navigation/          # Shell de pestañas (Reportes para admin/mod) + stack raíz por estado de sesión
│   ├── services/            # Contratos de datos, mocks (POIs del Quindío, fotos demo U04), cliente API y ruteo
│   ├── store/               # Perfil de accesibilidad + foto + último correo (cifrado, Privacy by Design) · favoritos
│   ├── utils/               # Tokens de diseño, filtros, formato, geo (haversine), gamificación, validación del wizard
│   └── assets/              # Logo pin/lockup, icono, splash y fotos demo recortadas de los mockups
└── __tests__                # (en src/__tests__) filtros, geo, fotos, formato, store, validación del wizard, componente
```

## Requisitos y ejecución

- Node.js ≥ 20 y la app **Expo Go** en tu teléfono (Android/iOS).

```bash
cd mobile-app
npm install
cp .env.example .env        # ajusta EXPO_PUBLIC_API_URL si usarás el backend
npx expo start              # escanea el QR con Expo Go
```

> En un dispositivo físico, `EXPO_PUBLIC_API_URL` debe apuntar a la **IP LAN**
> de tu equipo (ej. `http://192.168.1.100:3000`), no a `localhost`.

### Scripts

| Comando | Descripción |
| --- | --- |
| `npm start` | Servidor de desarrollo Expo |
| `npm run android` / `ios` | Abrir en emulador |
| `npm run lint` | ESLint (incluye reglas de accesibilidad) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest (79 pruebas unitarias en 11 suites) |
| `npm run build:apk` | APK de distribución vía EAS (perfil `preview`) — ver runbook |
| `npm run build:ios` | Build iOS vía EAS (perfil `preview`) |

> **Despliegue (Entrega 2):** pasos completos de EAS, variables de entorno y
> verificación en `docs/gestion/12-despliegue-entrega2.md`.

## Alcance implementado (mockups → código)

| Pantalla | Estado | Notas |
| --- | --- | --- |
| **U01/U02** Inicio de sesión | ✅ | Primero se elige el rol (viajero/admin. de campaña); luego credenciales con Supabase Auth y sesión cifrada con SecureStore. El rol **informativo**: los permisos reales se validan contra `usuario.rol_id`. Recordamos el último correo con "Entrar sin registrarme" |
| **U03** Registro y Privacidad | ✅ | Cuenta real en Supabase Auth + perfil de accesibilidad local + aviso Ley 1581 |
| **U04** Inicio (feed) | ✅ | BrandMark + campana (aviso honesto "sin notificaciones") + avatar con foto, buscador con filtros, chips de categorías reales, tarjetas con foto demo, distancia (haversine), etiquetas verdes del mockup, fila "validaciones / confiabilidad" y corazón de guardados |
| **U05** Filtros de accesibilidad | ✅ | Bottom sheet generado desde el catálogo (motriz/sensorial); comparte estado con el mapa y el feed; filtro estricto (sin dato ≠ pasa) |
| **U06** Mapa y Ruteo | ✅ | Leaflet en WebView con tiles OSM + POIs reales de la BD (fallback demo con aviso) + buscador, chips de categorías, FAB "mi ubicación", **barreras comunitarias** (reportes en validación como marcador naranja) y ruta real contra `POST /routes` con panel "Ruta peatonal" (distancia/duración/advertencias). El mapa mantiene **mínimo la mitad de la pantalla** cuando el panel crece (el contenido se desplaza dentro) |
| **U07** Navegación paso a paso | ✅ | `maneuvers` de Valhalla + tarjeta de maniobra + **guía por voz con `expo-speech` (es-ES)** activable, stats del avance y "Finalizar ruta"; fallo del motor con mensaje y reintento (RNF-17). «Recalcular ruta» **alterna a un camino distinto** (Valhalla `alternates`) en lugar de repetir el trayecto, con sello "Ruta alternativa" |
| **U08** Detalle del lugar | ✅ | Ficha dinámica por `tipo_valor` + verificación comunitaria |
| **U09–U10** Contribuir (reporte) | ✅ | Wizard de **4 pasos = mockup U09/U10**: Tipo (Lugar accesible vs Barrera) → Ubicación (nuevo/actualizar + GPS) → Detalles (descripción 0/500 + **etiquetas rápidas** + foto) → Confirmación. Las etiquetas fijan valores del catálogo y viajan en el mismo `crear_reporte`; pantalla de éxito estilo mockup ("3 confirmaciones") |
| **S01 / S02** Modales | ✅ | S01 Consenso alcanzado (P1) y S02 barrera crítica en ruta con recálculo (P2) |
| **M03–M05** Consola de moderación | ✅ | Lista priorizada, detalle con evidencia y decisión con motivo obligatorio; para admin/moderador la pestaña "Reportes" la embebe con chips por estado (pendientes · en revisión · publicados · rechazados · todos) y badges de estado |
| **Guardados** (favorito) | ✅ | Sincronizado con la tabla `favorito` de la BD (RLS del dueño): corazón en U08 y en el feed con rollback optimista + lista con tarjetas del feed (el corazón lleno quita) |
| **U12** Perfil | ✅ | Avatar con foto **local por cuenta** (picker + archivo `perfil-foto-<idCuenta>.jpg`; nunca al servidor — Ley 1581; al entrar con otro usuario no se hereda la foto anterior), nivel comunitario calculado de datos reales (puntos = publicados×100 + en validación×40 + confirmaciones×10), stats, "Mis reportes" con ver-en-mapa, ajustes de privacidad y cerrar sesión; admins ven además su consola |

## Decisiones clave

- **React Navigation + árbol C4** en lugar de Expo Router: mantiene la
  trazabilidad documento ↔ código del equipo (nota: `AGENTS.md` del template
  sugiere Expo Router; se priorizó la arquitectura del proyecto).
- **Mapa Leaflet en WebView** (`components/MapaWeb.tsx`, tiles OSM por
  browser UA — aceptados por OpenStreetMap, sin API keys, ADR-06): pinta de
  forma determinista en Expo Go Android/iOS. Reemplazó a `react-native-maps`
  después de que el nativo dejara lienzo vacío/intermitente en un Android
  real con Expo Go ( ambas alternativas OSM-propias fallaron: `UrlTile` con
  issue #5413 y base Google sin garantías en Expo Go). Para binario de
  producción el nativo sigue siendo una opción documentada (API key vía
  plugin en `app.json`).
- **Perfil de accesibilidad 100 % local** en `expo-secure-store` (AES-256 del
  sistema): nunca se envía al backend (ADR-09, Ley 1581, RNF-07/08). Igual la
  **foto de perfil** (`expo-image-picker` + copia local con `expo-file-system`)
  y el último correo recordado para "entrar sin registrarme".
- **Foto por cuenta:** la imagen vive en `perfil-foto-<idCuenta>.jpg`
  (id de fila `usuario`, respaldo UUID de Auth); al iniciar sesión se recupera
  el archivo de ESA cuenta y `guardarPerfil` solo arrastra la foto si la
  cuenta no cambió — el bug «todos los perfiles muestran la misma foto» quedó
  cerrado sin enviar la imagen al servidor.
- **Rutas alternativas en "Recalcular":** el payload a Valhalla pide
  `alternates: 1` (backend y reserva, espejo exacto); la respuesta adjunta
  `alternativa`. En U07 «Recalcular ruta» alterna entre ambas rutas con sello
  "Ruta alternativa"; si el motor no propuso ninguna, reintenta la búsqueda.
- **Mapa ≥ media pantalla (U06/U07):** `minHeight: '50%'` sobre el contenedor
  del mapa y las hojas inferiores con `flexShrink: 1` + ScrollView interno:
  el panel puede crecer pero ya no aplasta el lienzo del mapa.
- **Login por roles con honestidad de permisos:** la pantalla pide primero el
  rol (mockup U01), pero la elección solo orienta la UI; los permisos reales
  (pestaña "Reportes", consola) salen de `usuario.rol_id` de la BD.
- **Sesión persistente:** si la sesión de Supabase sigue vigente, la app abre
  directo en Inicio (U04) sin pasar por login.
- **Gamificación de datos reales:** puntos y niveles se calculan de los
  reportes propios en la BD (`utils/gamificacion.ts`), sin contadores
  inventados.
- **Guía por voz con `expo-speech`** (voz es-ES, preconfigurada en el
  perfil): lee cada maniobra en U07 mientras la tarjeta y el mapa avanzan.
- **Fotos demo del feed U04** recortadas de los mockups oficiales
  (`assets/photos/*.jpg`) y mapeadas por nombre normalizado (sin acentos,
  `services/mocks/fotosPoi.ts`): la BD **no almacena fotos de POI** (solo
  evidencias de reportes), así que los lugares sin foto muestran un bloque
  con el ícono de su categoría. Deviation documentada, no fake data.
- **Mocks tipados con la forma de los contratos reales** (POI, GeoJSON del
  `MapController`, catálogo de características) para conectar endpoints sin
  refactor.

## Accesibilidad (RNF-11/12/13/14)

- Etiquetas, roles y estados en todos los interactivos (TalkBack/VoiceOver).
- Áreas táctiles ≥ 44 px; contraste WCAG 2.1 AA validado en los tokens.
- Anuncios: región viva en Android + `announceForAccessibility` en iOS
  (sin doble lectura).
- Perfil configurable en una sola pantalla (≤ 3 pantallas / 5 interacciones).
- Lint con reglas de accesibilidad (`eslint-plugin-triple-rn-a11y`).

## Conexión a Supabase (front)

- Proyecto del equipo: **"sarafaustino's Project"** (org OmniTravel, ref
  `scpwrozsjpittiypvwxj`) — esquema OmniTravel con PostGIS. Informe y
  coordinación con la BD: `docs/gestion/supabase-sara/README.md`.
- Cliente compartido en `src/services/supabase/` (URL + publishable key por
  `.env` NO versionado; copia `.env.example` para crearlo).
- Registro/login reales vía **Supabase Auth**; la fila de `usuario` queda
  vinculada por `auth_user_id` (políticas RLS ya aplicadas en la BD el
  2026-10-17 — registro verificado con INSERT 201 y perfil privado: solo el
  dueño autenticado ve su fila).
- **Confirmación de correo desactivada** en el proyecto
  (`MAILER_AUTOCONFIRM = true`, 2026-10-18): `signUp` devuelve sesión
  inmediata y el flujo registro → login funciona sin correo de
  confirmación. Si se reactiva, `registrarCuenta` avisa el paso pendiente
  sin bloquear la app.
- **POIs reales** desde la BD (`services/pois.ts` + `store/poisStore.ts`)
  con degradación a mocks tipados si la lectura sigue bloqueada por RLS.
- **Contribuir y Guardados operativos con la BD (2026-10-18)**: las RPCs de
  la Entrega 2 (`crear_reporte`, `confirmar_reporte`, `decidir_reporte`,
  `listar_reportes_moderacion`) y el bucket `evidencia` quedaron ejecutados
  en el proyecto; `favorito` recibió políticas del dueño y el corazón de
  U08 sincroniza con rollback optimista (`store/favoritosStore.ts`).
- El perfil de accesibilidad sigue siendo 100 % local (no se envía a Supabase).

## Notas para el equipo (backend / siguientes pasos)

1. `POST /routes` ya calcula en perfil peatonal accesible (`costing:
   'pedestrian'` + `costing_options` derivadas de las `restrictions`:
   motriz → `type: 'wheelchair'` con penalización de escaleras y ascensores
   favorecidos; visual → `type: 'blind'`), instrucciones en `es-ES`,
   `alternates: 1` (la respuesta incluye la ruta `alternativa` cuando el
   motor la propone) y respuesta normalizada con `pasos[]` (maneuvers) y
   `advertencias[]`.
   Contrato y pruebas: `backend/src/routing/valhalla-payload.ts`.
2. El Proceso 1 escribe directo a Supabase (RPC `security definer` + Storage
   del bucket `evidencia`); queda como deuda técnica migrar esas escrituras a
   NestJS manteniendo el contrato (ADR en `docs/gestion/11-plan-entrega-2.md`).
3. La BD del equipo tiene aplicadas las políticas RLS del front (2026-10-17),
   las RPCs + bucket de la Entrega 2 (2026-10-18, `peticiones-front-entrega2.sql`
   con ajustes documentados) y las políticas de `favorito` de Guardados:
   `docs/gestion/supabase-sara/`. El mapa muestra POIs reales, registro escribe
   en `usuario`, Contribuir reporta vía RPC y Guardados sincroniza favoritos.
4. Config de Auth del proyecto: confirmación de correo desactivada
   (`MAILER_AUTOCONFIRM = true`); cuenta de prueba personal creada,
   confirmada y vinculada (fila `usuario` id 11). Detalles en
   `docs/gestion/supabase-sara/README.md`.
5. Re-probar en Expo Go tras el primer video: U03 registro → U01 login con
   la cuenta creada → U06 mapa (tiles + marcadores) → U08 detalle. En la
   nueva grabación: no teclear la contraseña a la vista (o editarla) y
   excluir el video de cualquier commit.
