# OmniTravel Backend — Guía de integración para frontend

**Versión documentada:** rama `main`, commit `4b8f0fb`. Esta guía se basa en los controladores, DTO y servicios del backend publicados en el repositorio. Los ejemplos de datos son ilustrativos salvo donde se indica una respuesta previamente verificada.

## 1. Arquitectura

Backend construido con NestJS y TypeScript.

| Módulo | Responsabilidad |
|---|---|
| `health` | Comprobación básica del servicio. |
| `auth` | Validación del access token de Supabase. |
| `authorization` | Protección de operaciones por rol. |
| `users` | Datos del usuario autenticado. |
| `pois` | Listado, búsqueda y consultas geográficas de puntos de interés. |
| `reports` | Crear/listar/consultar reportes y registrar confirmaciones. |
| `routing` | Cálculo de rutas a través de Valhalla. |
| `database` | Pool PostgreSQL y diagnóstico restringido a administradores. |

Archivos centrales: `src/main.ts` (inicio, validación y Swagger), `src/app.module.ts` (módulos), `src/database/database.service.ts` (PostgreSQL), `src/auth/supabase-auth.service.ts` (autenticación).

## 2. Instalación y ejecución

Desde la raíz del repositorio:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edita `backend/.env` con los valores de tu entorno. No subas `.env` a Git.

```powershell
npm run start:dev
npm run build
npm test -- --runInBand
```

URL local habitual: `http://localhost:3000`. Swagger: `http://localhost:3000/api/docs`. El puerto se configura con `PORT` y por defecto es `3000`.

## 3. Variables de entorno

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP; predeterminado `3000`. |
| `DB_HOST`, `DB_PORT` | Host y puerto PostgreSQL; puerto predeterminado `5432`. |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Credenciales y base de datos. La contraseña es secreta. |
| `DB_SSL` | Activa SSL cuando es `true`; por defecto está desactivado. |
| `DB_SSL_CA` | Ruta opcional a certificado CA, resuelta desde `process.cwd()`. |
| `VALHALLA_URL` | URL de Valhalla; predeterminada `http://localhost:8002`. |
| `SUPABASE_URL` | URL del proyecto Supabase. |
| `SUPABASE_ANON_KEY` | Clave pública `anon`/publishable para consultar Supabase Auth. No usar service-role. |

`DB_SSL` y `DB_SSL_CA` son admitidas por el código, aunque no aparecen en `.env.example`. Los nombres `postgres` y `valhalla` suelen corresponder a servicios de Docker; en ejecución local usa hosts accesibles desde tu máquina.

## 4. Autenticación

Los endpoints de usuarios, POI, reportes, rutas y diagnóstico de base de datos requieren un access token válido de Supabase:

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

Ejemplo:

```typescript
const response = await fetch("http://localhost:3000/users/me", {
  headers: { Authorization: `Bearer ${accessToken}` },
});
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const user = await response.json();
```

El backend valida el token consultando `SUPABASE_URL/auth/v1/user`, después relaciona el UUID de Supabase con `public.usuario.auth_user_id`. La cuenta debe estar vinculada y tener `estado_cuenta = 'activo'`. El `id_usuario` interno no es necesariamente el UUID de Supabase. Para crear reportes y confirmaciones, el backend deriva el usuario del token; el frontend no debe enviar un ID de usuario para esas operaciones.

## 5. Endpoints

Base URL local: `http://localhost:3000`. Excepto indicación contraria, las rutas de esta sección requieren Bearer token.

### Salud

`GET /health` — comprobación básica. En pruebas previas respondió `{"status":"ok"}`.

### Usuario actual

`GET /users/me`

Respuesta de ejemplo:

```json
{
  "id_usuario": "3",
  "email": "viajero1@omnitravel.test",
  "estado_cuenta": "activo",
  "rol_id": "1",
  "nombre_rol": "viajero"
}
```

### Puntos de interés

`GET /pois?tipo=museo&search=parque&page=1&limit=10`

Parámetros opcionales:
- `tipo`: filtro por tipo.
- `search`: búsqueda parcial por nombre.
- `page`: página positiva; predeterminado `1`.
- `limit`: registros por página, de `1` a `100`; predeterminado `10`.

Solo se devuelven POI con estado `publicado`. La respuesta tiene `data` y `meta`:

```json
{
  "data": [
    {
      "id_poi": 1,
      "nombre": "Nombre del lugar",
      "descripcion": "Descripción",
      "tipo": "museo",
      "direccion": "Dirección",
      "ubicacion": {
        "type": "Point",
        "coordinates": [-75.673, 4.535]
      },
      "estado": "publicado"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

Campos ilustrativos; el objeto real incluye también fechas de creación/actualización. `ubicacion` se serializa como GeoJSON y las coordenadas están en orden `[longitud, latitud]`.

`GET /pois/:id` — detalle de un POI publicado. Si no existe/no está publicado, responde `404`.

`GET /pois/nearby?lat=4.535&lon=-75.673&radio=5000&page=1&limit=10`

- `lat`: obligatorio, entre -90 y 90.
- `lon`: obligatorio, entre -180 y 180.
- `radio`: metros, de 1 a 50000; predeterminado `5000`.
- `page`: predeterminado `1`.
- `limit`: entre 1 y 100; predeterminado `10`.

Devuelve la misma estructura paginada y añade `distancia_metros` a cada POI; `meta` incluye `radio`. El orden es por distancia ascendente.

### Reportes

`GET /reports?page=1&limit=10` — listado paginado. `page` predeterminado `1`; `limit` predeterminado `10`, máximo `100`.

`GET /reports/:id` — detalle por ID positivo. El formato no numérico puede producir `400`; un reporte inexistente produce `404`.

`POST /reports` — crea un reporte. El usuario se obtiene del token.

```json
{
  "poi_id": 12,
  "tipo": "obstruccion",
  "descripcion": "El acceso principal está bloqueado."
}
```

Validaciones: `poi_id` entero positivo; `tipo` texto obligatorio de máximo 100 caracteres; `descripcion` opcional de máximo 2000 caracteres.

`POST /reports/:id/confirmations` — registrar un voto sobre un reporte:

```json
{ "tipo_confirmacion": "confirma" }
```

`tipo_confirmacion` admite solamente `confirma` o `refuta`. Regla de negocio verificada: cada usuario puede votar una sola vez por reporte y el primer voto es definitivo. El segundo voto devuelve `409 Conflict` con el mensaje `Ya has confirmado o refutado este reporte. Tu primer voto es definitivo.`. Si el reporte no existe, devuelve `404`.

La forma completa de las respuestas de reportes depende de `ReportsService` y del esquema vigente; consultar Swagger o la implementación cuando se necesiten todos sus campos.

### Rutas

`POST /routes`

```json
{
  "origin": [-75.673, 4.535],
  "destination": [-75.6803, 4.5355]
}
```

Cada coordenada es exactamente `[longitud, latitud]`; longitud entre -180 y 180, latitud entre -90 y 90. El backend convierte las coordenadas a `lat`/`lon`, llama a Valhalla con `costing: "auto"` y `units: "kilometers"` y devuelve el JSON del servicio. La estructura de respuesta depende de Valhalla.

### Diagnóstico de base de datos

`GET /database/diagnostic` — requiere el rol `administrador`. Devuelve estado y versiones de PostgreSQL/PostGIS. No debe exponerse como operación pública.

## 6. Validación y errores

`main.ts` aplica `ValidationPipe` global con:
- `whitelist: true`: elimina propiedades sin validadores DTO.
- `forbidNonWhitelisted: true`: rechaza propiedades adicionales.
- `transform: true`: transforma los datos a instancias DTO.

Códigos comunes: `200` éxito, `201` creación, `400` datos inválidos, `401` token ausente/inválido o cuenta no autorizada, `403` permisos insuficientes, `404` recurso inexistente, `409` conflicto de negocio, `500` error interno, `503` dependencia no disponible. La forma de error puede incluir `statusCode`, `message` y `error`; el cliente debe revisar `response.ok`/`status` y no depender solo del texto.

Nota de implementación: aunque Swagger documenta `503` para indisponibilidad de Valhalla, el `RoutingService` actual convierte los fallos de comunicación y las respuestas HTTP no exitosas de Valhalla en `InternalServerErrorException`. Verificar este comportamiento si el frontend necesita distinguir `500` y `503`.

## 7. Cliente TypeScript reutilizable

```typescript
const API_BASE_URL = "http://localhost:3000";

export async function apiFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message ?? `HTTP ${response.status}`;
    throw new Error(Array.isArray(message) ? message.join(", ") : String(message));
  }
  return body as T;
}
```

Ejemplo:

```typescript
const me = await apiFetch("/users/me", accessToken);
const pois = await apiFetch(
  "/pois?search=parque&page=1&limit=10",
  accessToken,
);
const route = await apiFetch("/routes", accessToken, {
  method: "POST",
  body: JSON.stringify({
    origin: [-75.673, 4.535],
    destination: [-75.6803, 4.5355],
  }),
});
```

## 8. Pruebas y Swagger

- Swagger: `http://localhost:3000/api/docs`.
- Compilar: `npm run build`.
- Pruebas: `npm test -- --runInBand`.
- Cobertura: `npm run test:cov`.

Para probar rutas protegidas en Swagger, pulsa **Authorize** y pega el access token de Supabase.

## 9. Reglas para el frontend

1. Coordenadas siempre en orden `[longitud, latitud]`, no `[latitud, longitud]`.
2. Adjuntar el access token vigente a cada petición protegida.
3. No enviar `usuario_id` para operaciones que derivan la identidad del token.
4. Usar `meta.total` y `meta.totalPages` para paginación cuando existan.
5. Tratar `409` al votar como un voto ya registrado; no reintentar automáticamente.
6. Manejar errores de red y de servicios externos como fallos recuperables.
7. No incluir `.env`, tokens, contraseñas ni claves service-role en el frontend ni en commits.
8. Los controles visuales de rol no sustituyen la autorización del backend.

## 10. Pendientes para una especificación exhaustiva

- Documentar todos los campos de respuesta de reportes directamente desde `ReportsService` y el esquema actual.
- Definir el tipo TypeScript de la respuesta de Valhalla que consumirá la UI.
- Completar el flujo de login/sesión del frontend y los contratos exactos de health.
- Documentar catálogos permitidos para `tipo` de reporte si el dominio define uno cerrado.

Actualizar esta guía junto con los DTO, controladores y pruebas cuando cambie el contrato de la API.
