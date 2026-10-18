# Decisiones de arquitectura (ADR) de OmniTravel

Índice de decisiones, en orden de lectura sugerido. Formato: Estado / Contexto / Decisión / Alternativas / Justificación / Consecuencias.

| ADR | Decisión | Estado |
|---|---|---|
| [ADR-001](ADR-001-app-movil-multiplataforma.md) | App móvil multiplataforma (React Native/Expo) como único cliente multirol | Aceptada |
| [ADR-002](ADR-002-backend-separado-por-modulos.md) | Frontend móvil y backend NestJS separados por módulos | Aceptada |
| [ADR-003](ADR-003-api-rest-versionada.md) | API REST versionada bajo `/api/v1` con OpenAPI | Propuesta |
| [ADR-004](ADR-004-stack-tecnologico.md) | Stack: Expo RN + NestJS + PostgreSQL/PostGIS + Valhalla (+ AWS RDS, S3) | Aceptada |
| [ADR-005](ADR-005-bd-relacional-geoespacial.md) | BD relacional PostgreSQL con extensión geoespacial PostGIS | Aceptada |
| [ADR-006](ADR-006-orm-sql-geoespacial-selectivo.md) | ORM estándar + SQL geoespacial selectivo encapsulado | Propuesta |
| [ADR-007](ADR-007-jwt-rbac-datos-sensibles-locales.md) | JWT + RBAC; datos sensibles del perfil solo en el dispositivo | Propuesta |
| [ADR-008](ADR-008-moderacion-hibrida.md) | Moderación híbrida: consenso (3 confirmaciones) + vía moderadora | Aceptada |
| [ADR-009](ADR-009-motor-ruteo-valhalla.md) | Ruteo peatonal accesible con Valhalla auto-hospedado vía backend | Aceptada |
| [ADR-010](ADR-010-evidencias-s3-y-eas.md) | Evidencias en S3 con validación server-side; builds/OTA con EAS | Propuesta |

## Correspondencia con el documento C4
El documento `OmniTravel Software Architecture Description – C4 Model.pdf` cita ADRs con otra numeración. Correspondencias aproximadas:

- C4 "ADR-04 (índices espaciales GIST)" → aquí **ADR-005** (+ RNF-04).
- C4 "ADR-07 (control de subida de archivos y permisos del bucket)" → aquí **ADR-010**.
- C4 "ADR-08 (moderación de reportes comunitarios)" → aquí **ADR-008**.
- C4 "ADR-09 (JWT stateless para clientes móviles)" → aquí **ADR-007**.
- C4 "ADR-02/06/07 (REST/HTTPS y servicios externos)" → aquí **ADR-003** y **ADR-010**.

Al citar ADRs en código, commits o documentos del equipo, usar la numeración de este `adr/` para evitar confusión.
