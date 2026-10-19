# 13. Plan de integración — unificar el lote de la app con `main` (NestJS/JWT)

> Estado: borrador para el equipo · Autora: Yamileth · 2026-10-18
> Regla permanente pactada con la autora: **cada que se cierre un fix, se entrega el
> listado actualizado de lo pendiente del Proceso 1 y 2 para la entrega** (sección 8).

## 1. Objetivo

Dejar en `main` una sola línea de desarrollo del móvil con TODO el alcance de la
Entrega 2 (Procesos 1 y 2) funcionando contra la arquitectura definitiva del
equipo (backend NestJS + PostgreSQL RDS + JWT), sin Supabase-directo en la capa
de datos de la app.

## 2. Contexto verificado (no supuestos)

| Línea | Commit | Contenido |
|---|---|---|
| `main` | `5ff1d81` (= `origin/main`, PR #6) | Backend unificado: auth JWT (`/auth`, rol en el token, `GET /users/me` con guard), Proceso 1 completo en el backend (`POST /reportes`, `POST /reportes/:id/confirmaciones`, `GET /pois/:id/reporte-activo`, `GET /moderacion/reportes`, `POST /moderacion/reportes/:id/decision`, `evidencias POST/GET archivo/:usuario/:archivo`), routing Valhalla (sin `alternates`), POIs, mapa, health, `/database/diagnostic`. App móvil en esta línea: servicios todos por `apiFetch` (JWT en `client.ts`), pero **UI vieja** (sin MapaWeb, sin wizard de 4 pasos, sin moderación embebida, sin favoritos, sin foto por cuenta). |
| `respaldo/yamis-local` | `0655d8e` (pushed, base `7a566b5` = `dev_yamis`) | Todo el alcance UI/UX verificado hoy (Lint 0, tsc 0, **83/83 tests**): wizard U09/U10, moderación M03–M05, Guardados, Mis reportes, gamificación, MapaWeb (Leaflet/OSM), U07 con guía por voz, foto por cuenta, `alternates: 1` en `backend/src/routing/valhalla-payload.ts`, README Entrega 2. **Capa de datos: Supabase directo** (RPCs `crear_reporte`/`confirmar_reporte`/`decidir_reporte`/`listar_reportes_moderacion`, bucket `evidencia`, RLS). |

Hallazgos clave del backend de `main` (verificados leyendo el código):

1. El backend **ya implementa el Proceso 1** con `JwtAuthGuard` + `@UsuarioActual()`:
   el id del creador/moderador sale del token (`sub`), no de consultas de `usuario`.
2. Nombres de estados: BD RDS usa `'pendiente_validacion'`; el backend **traduce**
   a `'pendiente'` hacia la app (y de vuelta con `estadoParaBd`). El lote usa
   `'pendiente_validacion'` como estado visible. Se conserva el mapeo del backend.
3. `CONFIRMACIONES_PARA_PUBLICAR = 3` — coincide con el S01 del lote.
4. El creador no puede decidir su propio reporte (hay dicha validación en el servicio).
5. **No existen** en el backend: `/favoritos` ni «mis reportes» (`GET /reportes/mios`).
6. Existe un módulo **duplicado** `backend/src/reports/` (findAll/findOne) junto a
   `reportes/` — candidato a limpieza tras la integración.
7. Evidencias: el backend guarda `storage_key` en la tabla `evidencia` y sirve
   archivos con `GET /evidencias/archivo/:usuario/:archivo` (disco del servidor),
   no Supabase Storage.
8. `GET /database/diagnostic` permite verificar en vivo el esquema de RDS
   (útil para confirmar si existe `favorito`).

## 3. Estrategia

- **Rama de destino del trabajo**: `feature/integracion-entrega3` **creada desde
  `main`**. Sobre ella se hace un único `git merge respaldo/yamis-local`, que genera
  TODOS los conflictos una sola vez; se resuelven siguiendo la matriz de la §4.
- **La arquitectura de datos que gana es la de `main`** (NestJS + JWT, documentada
  en `client.ts` como «única vía de la app hacia la base de datos»). El lote aporta
  UI/UX, componentes, tests y el contrato visual; los servicios se adaptan.
- Al final: PR `feature/integracion-entrega3` → `main` (revisión del equipo,
  mismo flujo que PR #5/#6). `respaldo/yamis-local` queda como respaldo histórico.
- `docs/gestion/supabase-sara/` pasa a ser documentación histórica de la Entrega 2;
  el README del front se re-escribe al estado Entrega 3.

## 4. Matriz de resolución de conflictos (los 10 archivos + 2 modify/delete)

| Archivo en conflicto | Resolución |
|---|---|
| `services/api/client.ts` | **main** (JWT + timeout 10 s). El ruteo del lote sigue usándolo vía `apiFetch`. |
| `services/supabase/*` (auth, types) — *modify/delete* | **Deleted** (main). Los usos del lote se migran: roles desde el claim `rol` del JWT / `GET /users/me`; id de usuario desde `sub`. |
| `services/api/routes.ts` | **Lote** (reserva Valhalla público + `alternates: 1` + advertencias en alternativa), rewritten sobre `apiFetch` de main. |
| `services/reportes.ts` | **Reescrito** contra los endpoints de `main` (§2) conservando las interfaces del lote (`ReporteResumen`, etc.) para que las pantallas no cambien. |
| `services/favoritos.ts` (nuevo del lote) | Pasa a consumir `/favoritos` (Fase 2-B) o local-pendiente si el equipo decide no crear el módulo → ver §6 decisiones. |
| `package.json` / `package-lock.json` | Unión: conservar deps del lote que se usan (`expo-speech`, sin `react-native-maps`) y **no** reintroducir `@supabase/supabase-js`. Regenerar lock con `npx expo install --fix`. |
| `screens/LoginScreen.tsx` | **Lote** (pasos de rol, sesión persistente, recuperar foto) + adaptar servicios a `api/auth.ts`; a11y labels intactos. |
| `screens/MapScreen.tsx` | **Lote** (MapaWeb, buscador, GPS, filtros, barreras, panel deslizable) con POIs por `services/pois.ts` de main. |
| `screens/ProfileScreen.tsx` | **Lote** (foto por cuenta, gamificación, privacidad) con rol desde JWT. |
| `mobile-app/README.md` | **Re-escrito** al estado final (Entrega 3), fusionando decisiones de ambos. |

Archivos del lote sin conflicto (entran limpios): `components/MapaWeb.tsx`,
`PoiCardFeed.tsx`, `BrandMark/assets`, `screens/{Home,DetalllePoi,Contribute,
Moderacion,Saved,MisReportes,Navegacion,Register}`, `utils/*`, `store/*`,
`__tests__/*` del lote, `docs/*`, fotos demo.

## 5. Fases

### Fase 0 — Preparación (½ día)
1. `git checkout main && git pull` (base fresca) → `git checkout -b feature/integracion-entrega3`.
2. **Verificar con el backend vivo**: `GET /database/diagnostic` (tablas: `favorito`?, `valor_caracteristica_reporte`, `evidencia`) y smoke de `/reportes`, `/moderacion/reportes` con JWT. Registrar hallazgos aquí mismo.
3. Acordar con el equipo las decision de §6.1–§6.3 (bloqueantes de Fase 2-B y C).

### Fase A — Backend pequeño en rama propia (`feature/backend-entrega3`) (1 día)
1. **Port de `alternates`**: cherry-pick del cambio de ruteo desde `0655d8e`
   (`valhalla-payload.ts` + spec). El `main` queda con alternativa; ver tests del routing (16 → 19).
2. **`GET /reportes/mios`** (guard JWT): lista del creador con `confirmaciones` y
   actualizacion_fecha (MisReportes + gamificación). Respuesta con misma forma de `listarModeracion` filtrada por `usuario_creador_id`.
3. **`/favoritos`** — *solo si* RDS ya tiene la tabla `favorito` (verificar en Fase 0.2):
   `GET /favoritos`, `POST /favoritos {poi_id}`, `DELETE /favoritos/:poi_id` con guard,
   respaldo `IntegrationsSpec`. Si el equipo decide NO añadirlo ahora → Automatismo:
   Guardados queda local (SecureStore) con aviso «sincronización pendiente» (ya existe ese estado).
4. (Opcional, low risk) Eliminar módulo duplicado `reports/`.
5. Criterio de cierre: `npm test` + lint backend en verde; endpoints probados con curl/Swagger.

### Fase B — Migración del móvil, feature por feature (2–3 días)
Base: conflicto resuelto (§4) → commits por feature, cada uno con lint + tsc + test en verde.

1. **Sesión/roles**: `LoginScreen`/`RegisterScreen` del lote sobre `api/auth.ts`;
   rol efectivo desde claim JWT (`users/me` de respaldo); guardar id de cuenta (`sub`) para `idCuenta` de la foto. Criterio: login/registro/salida + «entrar sin registrarme» en Expo Go.
2. **Mapa U06**: `MapaWeb` + buscador + `FilterSheet` + FAB GPS + marcadores
   (POIs publicados + reportes activos como barreras vía `/pois/:id/reporte-activo`).
   Criterio: mapa ≥ media pantalla con panel deslizable; filtros duros.
3. **Rutas**: `routes.ts` del lote sobre `apiFetch`; U07 (tarjeta maniobra, pasos,
   **guía por voz**), S02 y «Recalcular ruta» alternando (`alternatives` una vez Fase A.1).
4. **Reportes**: wizard U09/U10 + `reporteValidacion` + subida de evidencia por
   `POST /evidencias` (FormData; storage_key local del server) + valores de catálogo
   (`valor_caracteristica_reporte`) + pantalla de éxito S01; moderación embebida con
   chips/badges sobre `/moderacion/reportes` + `decision`; MisReportes sobre
   `/reportes/mios`; gamificación calculada con esa lista.
5. **Guardados**: según decisión de §6.2.
   6. **Pulido**: Home feed (U04) con PoiCardFeed + historial U08 dinámico según
   `GET /pois/:id` (verificar que incluye valores de características; si no, añadir en
   Fase A), avatar de Home, notas de README.

### Fase C — Cierre de entrega (1 día)
1. Suite completa en verde: `npx expo lint`, `npx tsc --noEmit`, `npm test`,
   backend `npm test` + lint.
2. Prueba E2E manual en Expo Go (checklist): cantar → crear reporte con foto/etiquetas
   → moderar (aprobar/rechazar) → confirmar a 3 (publica) → guardar favorito →
   ruta accesible → recalcular (alternativa) → guía por voz → perfil con foto por usuario.
3. Actualizar `mobile-app/README.md` + `docs/gestion/07-contrato-api.md` (endpoints nuevos).
4. PR → `main`, merge, tag de la entrega, push.

### Fase D — Despliegues (fuera del código, coherente con Fase A/B)
1. `EXPO_PUBLIC_API_URL` apuntando al deploy del backend.
2. `VALHALLA_URL` del equipo desplegada (o mantener la reserva pública de OSM
   documentada para demos — decide el equipo).
3. EAS build para binario de desarrollo/producción.

## 6. Riesgos y decisiones abiertas (OWNER: equipo de datos/backend)

| # | Decisión | Impacto si no se acuerda |
|---|---|---|
| 1 | **Estados visibles**: adoptar `'pendiente'` (mapeo del backend, ya implementado) o `'pendiente_validacion'` (texto del lote / BD). | Strings inconsistentes en moderación y badges. Recomendado: lo que salga del backend (ya normalizado). |
| 2 | **`favorito` en RDS**: existe o se crea (migración SQL + endpoints) o Guardados queda local. | Guardados sin sincronización entre dispositivos. |
| 3 | **Roles de moderación**: confirmar que el claim `rol` del JWT llega como `moderador`/`administrador` y que el guard lo valida (hoy solo hay `JwtAuthGuard`; el guard de roles es por-endpoint si existe). | La consola quedaría accesible a viajeros o bloqueada a admins. |
| 4 | **Evidencias en disco del servidor** (storage_key local): espacio, backup,oulouse y upload por partes. | Pérdida de evidencias / DD en producción. |
| 5 | **M06/M07** (notificación al publicar / encuesta post-visita): siguen **fuera de alcance** documentado (sin backend de notificaciones ni datos post-viaje). | Si P de la entrega exige y M06/M07, se abre requerimiento al equipo de datos. |

## 7. Verificación permanente (cada tarea)

```bash
# app móvil (mobile-app/)
npx.cmd expo lint
npx.cmd tsc --noEmit
cmd /c "npm test --silent 2>nul"

# backend (backend/)
cmd /c "npm test --silent 2>&1"
npx.cmd tsc --noEmit -p tsconfig.json
cmd /c "npm run lint --silent 2>&1"
```

## 8. Listado vivo de pendientes para la entrega (Proceso 1 y 2)

Se entrega al final de cada fix o tarea. Base al 2026-10-18:

**Proceso 1 — Reportes de la comunidad**
- [ ] Integración del lote con la línea NestJS/JWT (este plan — Fases A–C).
- [ ] `GET /reportes/mios` + `/favoritos` en backend (o decisión local).
- [ ] Confirmación de roles/guard para moderación en el backend (§6.3).
- [ ] M06/M07: fuera de alcance documentado (requiere equipo de datos).
- [ ] Despliegue del backend + BD real para pruebas E2E (RDS 'live').

**Proceso 2 — Rutas accesibles**
- [ ] Port de `alternates` al backend de `main` (Fase A.1, cherry-pick desde `0655d8e`).
- [ ] Mapa/navegación nuevo (MapaWeb, U07, voz) integrado a la línea de `main` (Fase B.2–B.3).
- [ ] `VALHALLA_URL` propia desplegada (o fallback público documentado como definitiva de demo).

## 9. Referencias

- Respaldos: `respaldo/yamis-local` (0655d8e) · base del lote `7a566b5` (dev_yamis) · `main` `5ff1d81`.
- Entrega 2 (supabase): `docs/gestion/11-plan-entrega-2.md`, `docs/gestion/supabase-sara/`.
- Contrato de ruteo y `alternates`: `backend/src/routing/valhalla-payload.ts` (en la rama del lote).
- Contrato API: `docs/gestion/07-contrato-api.md`, `backend/openapi` (Swagger tras PR #6).
