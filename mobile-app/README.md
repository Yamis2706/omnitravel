# OmniTravel — App Móvil (React Native + Expo)

Adelanto del **Módulo Viajero/Comunidad** de OmniTravel: plataforma colaborativa
de turismo accesible que centraliza, verifica (crowdsourcing) y personaliza la
información de accesibilidad de infraestructura turística.

> **Estado:** MVP navegable (rama `dev_yamis`) con login (U01/U02), registro
> (U03), mapa (U06) y detalle (U08) de los mockups oficiales, datos de la BD
> del equipo (Supabase OmniTravel) con degradación a demo tipada y ruteo
> real contra el backend (`POST /routes`).

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Expo SDK 57 + React Native 0.86 + TypeScript estricto |
| Navegación | React Navigation 7 (stack + bottom tabs) |
| Estado | Zustand 5 |
| Almacenamiento local | expo-secure-store (perfil, cifrado) + AsyncStorage (disponible) |
| Mapas | react-native-maps + tiles OpenStreetMap (ADR-06) |
| Ubicación | expo-location |
| Pruebas | Jest + jest-expo + React Native Testing Library |
| Calidad | ESLint 9 (flat) + Prettier + `eslint-plugin-triple-rn-a11y` (WCAG) |

## Estructura

Alineada con el árbol del **C4 Nivel 4** (`docs/` del repositorio raíz):

```
mobile-app/
├── App.tsx                  # Punto de entrada (SafeAreaProvider + RootNavigator)
├── src/
│   ├── screens/             # U03 Registro · U06 Mapa · U08 Detalle + stubs (Inicio, Contribuir, Guardados, Perfil)
│   ├── components/          # UI accesible: botones, chips, badges, FilterSheet, PoiCard…
│   ├── navigation/          # Shell de pestañas + stack raíz por estado de sesión
│   ├── services/            # Contratos de datos, mocks (POIs del Quindío), cliente API y ruteo
│   ├── store/               # Perfil de accesibilidad local cifrado (Privacy by Design)
│   ├── utils/               # Tokens de diseño, filtros, formato, polilínea
│   └── assets/              # (assets del template en ./assets)
└── __tests__                # (en src/__tests__) filtros, formato, store, componente
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
| `npm test` | Jest (65 pruebas unitarias) |
| `npm run build:apk` | APK de distribución vía EAS (perfil `preview`) — ver runbook |
| `npm run build:ios` | Build iOS vía EAS (perfil `preview`) |

> **Despliegue (Entrega 2):** pasos completos de EAS, variables de entorno y
> verificación en `docs/gestion/12-despliegue-entrega2.md`.

## Alcance implementado (mockups → código)

| Pantalla | Estado | Notas |
| --- | --- | --- |
| **U01/U02** Inicio de sesión | ✅ | Supabase Auth (signIn + sesión cifrada con SecureStore) |
| **U03** Registro y Privacidad | ✅ | Cuenta real en Supabase Auth + perfil de accesibilidad local + aviso Ley 1581 |
| **U05** Filtros de accesibilidad | ✅ | Bottom sheet generado desde el catálogo (motriz/sensorial) |
| **U06** Mapa y Ruteo | ✅ | Base Google en Expo Go + POIs reales de la BD del equipo (fallback a demo con aviso visible) + ruta real contra `POST /routes` con restricciones del perfil, advertencia de datos > 60 días (RNF-27) y acceso a U07 |
| **U07** Navegación paso a paso | ✅ | `maneuvers` de Valhalla con instrucción localizada, distancia e ícono direccional + botón "Finalizar"; fallo del motor con mensaje y reintento (RNF-17) |
| **U08** Detalle del lugar | ✅ | Ficha dinámica por `tipo_valor` + verificación comunitaria |
| **U09–U10** Contribuir (reporte) | ✅ | Wizard de 3 pasos (tipo → ubicación+foto → características) que escribe `reporte` vía RPC y sube evidencia al bucket `evidencia` con degradación elegante |
| **S01 / S02** Modales | ✅ | S01 Consenso alcanzado (P1) y S02 barrera crítica en ruta con recálculo (P2) |
| **M03–M05** Consola de moderación | ✅ | Lista priorizada, detalle con evidencia y decisión con motivo obligatorio (visible solo para rol moderador) |
| Inicio (U04), Guardados, Perfil (U12) | 🔶 Stub | Llegan en la siguiente iteración (U12 ya difunde/desconecta sesión Supabase) |

## Decisiones clave

- **React Navigation + árbol C4** en lugar de Expo Router: mantiene la
  trazabilidad documento ↔ código del equipo (nota: `AGENTS.md` del template
  sugiere Expo Router; se priorizó la arquitectura del proyecto).
- **Mapa base de Google vía `react-native-maps`** detrás de la capa
  `services/api` (funciona en Expo Go sin API key; migrable a Mapbox,
  ADR-06). La vía solo-OSM (`mapType="none"` + `UrlTile`) dejó el lienzo
  vacío en un Android real (issue react-native-maps #5413, cerrado sin fix);
  para el binario de producción se añade la API key con el plugin
  `react-native-maps` dentro de `app.json` (docs Expo SDK 57, "Deploy app
  with Google Maps").
- **Perfil de accesibilidad 100 % local** en `expo-secure-store` (AES-256 del
  sistema): nunca se envía al backend (ADR-09, Ley 1581, RNF-07/08).
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
- El perfil de accesibilidad sigue siendo 100 % local (no se envía a Supabase).

## Notas para el equipo (backend / siguientes pasos)

1. `POST /routes` ya calcula en perfil peatonal accesible (`costing:
   'pedestrian'` + `costing_options` derivadas de las `restrictions`:
   motriz → `type: 'wheelchair'` con penalización de escaleras y ascensores
   favorecidos; visual → `type: 'blind'`), instrucciones en `es-ES` y
   respuesta normalizada con `pasos[]` (maneuvers) y `advertencias[]`.
   Contrato y pruebas: `backend/src/routing/valhalla-payload.ts`.
2. El Proceso 1 escribe directo a Supabase (RPC `security definer` + Storage
   del bucket `evidencia`); queda como deuda técnica migrar esas escrituras a
   NestJS manteniendo el contrato (ADR en `docs/gestion/11-plan-entrega-2.md`).
3. La BD del equipo ya tiene las políticas RLS del front aplicadas
   (2026-10-17, `docs/gestion/supabase-sara/`); el mapa muestra los POIs
   reales y el registro escribe en `usuario`.
4. Config de Auth del proyecto: confirmación de correo desactivada
   (`MAILER_AUTOCONFIRM = true`); cuenta de prueba personal creada,
   confirmada y vinculada (fila `usuario` id 11). Detalles en
   `docs/gestion/supabase-sara/README.md`.
5. Re-probar en Expo Go tras el primer video: U03 registro → U01 login con
   la cuenta creada → U06 mapa (tiles + marcadores) → U08 detalle. En la
   nueva grabación: no teclear la contraseña a la vista (o editarla) y
   excluir el video de cualquier commit.
