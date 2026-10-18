# 04. Modelo entidad-relación (MER)

> **ESTADO: PROPUESTA EN PAUSA.** La revisión del esquema de base de datos quedó pospuesta por decisión del equipo (17/10/2026). Este documento **no bloquea** la aprobación del `openapi.yaml` ni de las demás piezas de `docs/gestion/`; no usarlo como fuente normativa hasta su revisión.

## Fuente y estado
La app móvil (`mobile-app/src/services/types.ts`) documenta que el diseño de BD define un **modelo físico PostgreSQL + PostGIS de 16 tablas** y nombra explícitamente las tablas `POI`, `INFORMACION_ACCESIBILIDAD`, `CARACTERISTICA_ACCESIBILIDAD`, `VALOR_ACCESIBILIDAD_POI` y `RETROALIMENTACION`. Este documento es la **propuesta inicial** para validar contra ese modelo físico cuando esté disponible; no eliminar ni renombrar tablas del diseño real tras la validación. El diagrama del repo de referencia (`MER.pdf`) debe reemplazarse por un diagrama propio; al final se incluye un DSL dbdiagram.io para generarlo.

No se adoptan migraciones versionadas todavía [decisión pendiente]; mientras tanto, el esquema se gestiona manualmente (scripts SQL) y las entidades del backend deben mapear el MER al pie de la letra. No inferir restricciones `UNIQUE`, `NOT NULL` o `ON DELETE` que no aparezcan explícitas en el modelo aprobado.

## Entidades propuestas

| Entidad (tabla) | Si existe en el diseño | Responsabilidad / observaciones |
|---|---|---|
| `USUARIO` | Vía Supabase (cuenta) | Cuenta de acceso y datos básicos: rol (`VIAJERO_ADI`, `COLABORADOR`, `ESTABLECIMIENTO`, `MODERADOR`, `ADMIN`), correo, estado de aprobación y fecha de creación. Ver discrepancia del esquema compartido. |
| `PERFIL_ACCESIBILIDAD` | No (local) | Se guarda **en el dispositivo**, no en el backend (RNF-07): tipo de discapacidad (motriz/sensorial), preferencias de filtro y necesidades. Referencia solo para diseño de la app. |
| `POI` | Sí | Punto de interés: nombre, categoría, descripción, dirección, ciudad, `geography(Point,4326)`, estado de verificación (`PENDIENTE`, `EN_REVISION`, `VERIFICADO`), confirmaciones comunitarias, calificación agregada, total de experiencias, última verificación, creador y fecha de creación. Índice GIST sobre la geometría (RNF-04). |
| `CARACTERISTICA_ACCESIBILIDAD` | Sí | Catálogo controlado (no EAV libre): identificador (`ancho_puerta`, `tiene_rampa`, `tiene_ascensor`, `tiene_escaleras`, `tiene_bano_accesible`, `tiene_semaforo_sonoro`, `tiene_piso_podotactil`, `tiene_braille`), nombre, descripción, tipo de valor (`NUMERICO`, `BOOLEANO`, `TEXTO`), unidad e icono. El catálogo es extensible sin tocar formularios ni filtros. |
| `VALOR_ACCESIBILIDAD_POI` | Sí | Valor vigente de una característica para un POI (1:1 vigente por característica y POI): `valor_booleano`, `valor_numerico`, `valor_texto`. Actualizable solo por reporte aprobado. |
| `INFORMACION_ACCESIBILIDAD` | Sí | Historial/ficha agregada de accesibilidad del POI según el diseño físico; validar su relación con `VALOR_ACCESIBILIDAD_POI`. |
| `REPORTE_ACCESIBILIDAD` | Propuesta | Reporte de creación/actualización/re-verificación de un POI: autor, tipo, estado (`PENDIENTE_VALIDACION`, `PUBLICADO`, `RECHAZADO`, `REVERIFICACION_SOLICITADA`), resumen de referencia, motivo de rechazo y fechas. Punto de unión de los procesos 1 y 3. |
| `EVIDENCIA_FOTO` | Propuesta | Fotografía asociada a un reporte: URL de S3, tipo MIME, tamaño, fecha de subida. El archivo vive en S3; la tabla guarda solo metadatos (RNF-29). |
| `CONFIRMACION_POI` | Propuesta | Confirmación comunitaria de un POI: usuario, POI y fecha. `UNIQUE(poi_id, usuario_id)` para impedir doble confirmación y autoconfirmación del creador (RNF-28). La 3ra confirmación dispara la transición a `PUBLICADO`. |
| `DENUNCIA` | Propuesta | Denuncia de un reporte o POI por falsedad/spam: denunciante, motivo y estado de atención; activa la vía B de moderación. |
| `DECISION_MODERACION` | Propuesta | Decisión ejecutiva del moderador: reporte objetivo, acción (`APROBADO`/`RECHAZADO`/`REVERIFICAR`), motivo, moderador responsable y fecha. Sobre-escribe cualquier parte del consenso comunitario (vía B). |
| `INCIDENCIA` | Propuesta | Incidencia post-viaje (proceso 3): origen (experiencia o ruta), tipo de discrepancia, estado (`ABIERTA`, `EN_GESTION`, `RESUELTA`) y responsable de soporte/moderador (M06). |
| `RETROALIMENTACION` | Sí | Experiencia del viajero sobre un POI/ruta: autor, perfil percepción, calificación 1–5, comentario y fecha. Alimenta el agregado de `POI`. |
| `NOTIFICACION` | Propuesta | Notificaciones asociadas a un usuario: tipo, payload mínimo, estado de entrega e intentos. [PENDIENTE: aprobar catálogo de eventos antes de implementar]. |
| `AUDITORIA_MODERACION` | Propuesta | Registro inmutable de acciones críticas de moderación (quién, cuándo, qué) (RNF-30). Solo escritura desde el backend. |

## Tipos y convenciones de mapeo
- Identificadores: `UUID` en las tablas de dominio (alineado a Supabase/Auth), generados por el backend.
- Geometría: `geography(Point, 4326)` en `POI`; consultas espaciales con operadores PostGIS e índices GIST.
- Estados: `VARCHAR` con `CHECK` o enums de backend con los valores exactos definidos arriba (`PENDIENTE`/`EN_REVISION`/`VERIFICADO` en POI; `PENDIENTE_VALIDACION`/`PUBLICADO`/`RECHAZADO`/`REVERIFICACION_SOLICITADA` en reportes).
- Calificaciones y agregados: `NUMERIC(3,2)` para la media; contadores `INT`.
- Timestamps: `TIMESTAMPTZ` (UTC) en todas las tablas transaccionales.

## Relaciones principales
- `USUARIO` 1:N `REPORTE_ACCESIBILIDAD`, `CONFIRMACION_POI`, `RETROALIMENTACION`, `DENUNCIA`.
- `POI` 1:N `VALOR_ACCESIBILIDAD_POI` N:1 `CARACTERISTICA_ACCESIBILIDAD` (relación EAV controlada).
- `POI` 1:N `REPORTE_ACCESIBILIDAD`, `CONFIRMACION_POI`, `RETROALIMENTACION`, `INCIDENCIA`.
- `REPORTE_ACCESIBILIDAD` 1:N `EVIDENCIA_FOTO` y 1:N `DECISION_MODERACION`.
- `INCIDENCIA` N:1 `RETROALIMENTACION` (cuando nace de una discrepancia) y N:1 `USUARIO` resolutor.
- `DECISION_MODERACION` N:1 `USUARIO` (moderador responsable).

## Reglas de implementación
1. Validar nombres y tipos reales contra el modelo físico de 16 tablas antes de generar entidades.
2. No exponer tablas/entidades directamente: toda salida pasa por DTO del contrato API.
3. Usar claves foráneas y `CHECK` para preservar integridad; evitar cascadas de borrado no aprobadas (retroalimentación, reportes y evidencias son trazabilidad, no basura).
4. La regla de consenso (3 confirmaciones) y su transacción de publicación se validan en el servicio, con bloqueo del POI dentro de la transacción.
5. La regla "no autoconfirmar" se aplica en servicio (`CONFIRMACION_POI` no admite al creador del reporte) y con constraint funcional.
6. Definir índices GIST (geometría) y B-tree (estado, fechas, FK) tras revisar las consultas reales del mapa y los listados de moderación.

## Discrepancias / verificaciones pendientes
- Validar contra el modelo físico de 16 tablas del diseño de BD (nombres exactos, tipos y restricciones).
- El proyecto Supabase compartido expone hoy una tabla `usuarios` con campos de transporte ajenos al dominio; definir si OmniTravel usa su propio proyecto/esquema.
- Confirmar el rol exacto de `INFORMACION_ACCESIBILIDAD` respecto de `VALOR_ACCESIBILIDAD_POI`.
- Contrato de notificaciones pendiente de aprobación.

## DSL dbdiagram.io para generar el MER (PDF)
```dbml
Table POI {
  id uuid [pk]
  nombre varchar(120)
  categoria varchar(60)
  descripcion text
  direccion varchar(200)
  ciudad varchar(120)
  ubicacion geography(point,4326)
  estado_verificacion varchar(20) [ref: > ESTADOS_POI.nombre]
  confirmaciones int
  calificacion numeric(3,2)
  total_experiencias int
  ultima_verificacion timestamptz
  creado_por uuid
  creado_en timestamptz
  indexes { ubicacion [type: gist] }
}
Table CARACTERISTICA_ACCESIBILIDAD {
  id varchar(40) [pk]
  nombre varchar(80)
  descripcion text
  tipo_valor varchar(10)
  unidad varchar(10)
  icono varchar(40)
}
Table VALOR_ACCESIBILIDAD_POI {
  poi_id uuid [pk]
  caracteristica_id varchar(40) [pk]
  valor_booleano boolean
  valor_numerico numeric(8,2)
  valor_texto varchar(120)
}
Ref: VALOR_ACCESIBILIDAD_POI.poi_id > POI.id
Ref: VALOR_ACCESIBILIDAD_POI.caracteristica_id > CARACTERISTICA_ACCESIBILIDAD.id
Table REPORTE_ACCESIBILIDAD {
  id uuid [pk]
  poi_id uuid
  autor_id uuid
  tipo varchar(30)
  estado varchar(30)
  resumen varchar(240)
  motivo_rechazo text
  creado_en timestamptz
}
Ref: REPORTE_ACCESIBILIDAD.poi_id > POI.id
Table CONFIRMACION_POI {
  poi_id uuid [pk]
  usuario_id uuid [pk]
  confirmado_en timestamptz
}
Table RETROALIMENTACION {
  id uuid [pk]
  poi_id uuid
  autor_id uuid
  calificacion numeric(2,1)
  comentario text
  creado_en timestamptz
}
Ref: RETROALIMENTACION.poi_id > POI.id
Table DECISION_MODERACION { id uuid [pk], reporte_id uuid, moderador_id uuid, accion varchar(20), motivo text, decidido_en timestamptz }
Table INCIDENCIA { id uuid [pk], poi_id uuid, origen_experiencia_id uuid, tipo varchar(30), estado varchar(20), abierto_en timestamptz }
Table DENUNCIA { id uuid [pk], reporte_id uuid, denunciante_id uuid, motivo text, estado varchar(20) }
Table EVIDENCIA_FOTO { id uuid [pk], reporte_id uuid, s3_url varchar(500), mime_type varchar(60), tamano_bytes int, subido_en timestamptz }
Table AUDITORIA_MODERACION { id uuid [pk], moderador_id uuid, accion varchar(40), objetivo_id varchar(60), detalle jsonb, creado_en timestamptz }
```
