# ADR-005: Base de datos relacional con extensión geoespacial (PostGIS)

- **Estado:** Aceptada según el C4 (N2: "Base de Datos Relacional PostgreSQL + PostGIS") y el docker-compose del repo.
- **Contexto:** El dominio central son puntos geográficos (POI) con atributos de accesibilidad consultados por proximidad/bounding box y cruces con rutas, junto con datos relacionales tradicionales (usuarios, reportes, auditoría).
- **Decisión:** PostgreSQL 17 como motor relacional con la extensión **PostGIS 3.5** (`postgis/postgis:17-3.5`), geometría `geography(Point,4326)` para POI, índices **GIST** para consultas espaciales (RNF-04) e índices B-tree para estado/fechas/FK. Nota del C4: los datos sensibles detallados NO se persisten aquí (RNF-07).
- **Alternativas:** BD documental con lat/lon simples (MongoDB/DocumentDB); Postgres con cálculo Haversine en app; ruteo directamente sobre OSM sin BD de accesibilidad.
- **Justificación:** ACID para transacciones de consenso/moderación, SQL estándar con operadores espaciales (`ST_DWithin`, `ST_Intersects`, `ST_MakeEnvelope`) y soporte maduro en Node; escala probada para las 300 consultas concurrentes del RNF-04.
- **Consecuencias:** El esquema debe definirse propio para OmniTravel (documento 04) alojado en AWS RDS (`omnitravel_db`); el proyecto Supabase compartido ya no se usa. Cambios de esquema con scripts SQL versionados en `backend/sql/`.
