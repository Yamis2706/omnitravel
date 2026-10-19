# 09. Matriz de trazabilidad

Esta matriz inicial vincula los requisitos funcionales propuestos (documento 02) con las pantallas del mockup, los componentes y las pruebas mínimas. Debe ampliarse con los IDs oficiales de requisitos del curso cuando exista una matriz aprobada, y con las HU efectivamente construidas.

| IDs | Dominio | Pantallas (mockup) | Componentes principales | Pruebas mínimas |
|---|---|---|---|---|
| U1–U4 | Usuarios y perfiles | U01–U03, U12 | `auth` (backend NestJS, JWT propio), `security` (guards JWT), `profileStore` local | Registro con política aceptada, login válido/inválido, sesión ≤ 24 h y cifrada (RNF-08), campos sensibles fuera del backend (RNF-07) |
| U5–U6 | Notificaciones y gamificación | U11, U12 | `notifications` [PENDIENTE contrato], agregados de aporte | Sin implementación hasta aprobar contrato |
| P1–P5 | POI y mapa | U04–U08 | `pois` (MapController bbox GeoJSON), `accessibility` (catálogo), `react-native-maps` | Bounding box válido, GeoJSON correcto, filtros combinados, formas idénticas a los mocks (`Poi`, `ValorAccesibilidad`) |
| C1–C6 | Crowdsourcing | U09–U10, S01 | `reports` (reportes/evidencias S3, confirmaciones, denuncias) | Consenso de 3 publicado exactamente una vez (RNF-18/23), anti-autoconfirmación (RNF-28), MIME/tamaño (RNF-29), reintentos de evidencia (RNF-19), EN_REVISION tras re-verificación (RNF-20) |
| RT1–RT5 | Rutas accesibles | U06–U07, S02 | `routes` (proxy Valhalla), `polyline.ts`, modal S02 | Exclusión de barreras críticas (RNF-21/26), warnings > 60 días (RNF-27), fallo con mensaje claro (RNF-17), ≤ 3 s en 95% (RNF-01) |
| F1–F4 | Retroalimentación | U08 (experiencias) | `feedback` (experiencias, incidencias), agregados en POI | Solo post-viaje (RNF-24), discrepancia genera re-verificación trazable (RNF-25) |
| A1–A8 | Moderación/admin | M01–M07 | `moderation` (dashboard, decisiones, denuncias, incidencias, auditoría), RBAC | Solo MODERADOR/ADMIN (RNF-09), decisión sobre-escribe consenso (RNF-22), sin segunda decisión (409), auditoría inmutable (RNF-30), estado visible ≤ 2 s (RNF-05) |

## Estado actual del proyecto (honesto)
| Elemento | Estado |
|---|---|
| App móvil Expo (SDK 57) con comunidad y mocks de POI | Construida (Home/Mapa/POI/Contribuir/Perfil/Guardados; pruebas unitarias base) |
| Autenticación Supabase compartida | Retirada (2026-10-18): la app autentica contra el backend y la BD está en AWS RDS |
| Backend NestJS + OpenAPI | En diseño; `POST /routes` opera con `costing: 'auto'` [pendiente peatonal accesible] |
| `MapController` (POI reales por bbox) | Pendiente; hoy la app consume mocks tipados |
| Moderación (M01–M07) y feedback de ciclo completo | Pendiente |
| Notificaciones push | Pendiente del contrato |

Por ello en la matriz los componentes del backend son **objetivo**, no código integrado todavía: la columna de pruebas mínimas define lo que debe existir antes de declarar cumplido cada ID.

## Requisitos no funcionales
Relacionar cada prueba con los RNF del documento 03; ninguna métrica se da por cumplida sin evidencia reproducible (comando, entorno y resultados).

## Criterio de cierre
No marcar una fila como cumplida hasta que existan: código, prueba automatizada (o medición reproducible) y evidencia guardada. Las decisiones pendientes (contrato de notificaciones, perfil de ruteo de Valhalla) se registran en el documento 01 y bloquean los IDs asociados.
