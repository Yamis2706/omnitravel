# Documentación de gestión del proyecto OmniTravel

Paquete de documentación de ingeniería del proyecto **OmniTravel** (turismo accesible), estructurado con el mismo formato del repositorio de referencia del curso (teen-sport-bk), pero adaptado al stack real de este proyecto:

- **App móvil:** React Native / Expo SDK 57 (TypeScript) — `mobile-app/`
- **Backend:** NestJS con API REST `/api/v1` (`POST /routes` operativo vía Valhalla)
- **Persistencia:** PostgreSQL + PostGIS en **AWS RDS** (base `omnitravel_db`), accesible solo desde el backend; motor de ruteo **Valhalla** (local en `docker-compose.yml`)
- **Identidad:** cuentas propias en el backend (bcrypt + JWT ≤ 24 h) con sesión cifrada en el dispositivo
- **Servicios externos:** Mapbox/OpenStreetMap, AWS S3, notificaciones push

## Orden de lectura
1. `00-checklist-aprobacion.md` — guion para que el equipo apruebe el contrato y las decisiones pendientes.
2. `01-contexto-del-proyecto.md` — propósito, actores/roles, alcance y discrepancias a resolver.
3. `02-requisitos-funcionales.md` — requisitos propuestos con IDs (U, P, C, RT, F, A, N) y pantallas del mockup.
4. `03-requisitos-no-funcionales.md` — transcripción de RNF-01 a RNF-30 del Plan de Gestión de la Calidad.
5. `04-modelo-entidad-relacion.md` — propuesta de MER (**en pausa: revisión del equipo diferida**; con DSL dbdiagram.io para generar el diagrama).
6. `05-arquitectura-backend.md` — arquitectura operativa (módulos, persistencia, transacciones, despliegue).
7. `06-seguridad-y-autorizacion.md` — JWT/RBAC, datos sensibles (Ley 1581 de 2012) y errores.
8. `07-contrato-api.md` + `openapi.yaml` (BORRADOR 0.1.0) — convenciones, inventario de operaciones y esquemas.
9. `08-estrategia-de-pruebas.md` — pirámide de pruebas y criterios por requisito.
10. `09-trazabilidad-requisitos.md` — matriz requisito ↔ componente ↔ prueba ↔ RNF ↔ pantalla.
11. `10-plan-implementacion.md` — fases incrementales y estado actual.
12. `adr/` — decisiones de arquitectura (ADR-001 a ADR-010).

## Estado de las piezas
- Los documentos **01–03** son la referencia normativa actual (con ADRs de los entregables del curso).
- El documento **04 (schema de BD) está en pausa**: el equipo lo revisará después; no bloquea la aprobación del `openapi.yaml` ni del resto del paquete.
- El documento **07 y `openapi.yaml`** son **propuestas (BORRADOR 0.1.0)**: el paso siguiente del equipo es aprobar el contrato (ver `00-checklist-aprobacion.md`); después pasan a ser fuente de verdad.
- `MER.pdf` del repo de referencia no se copia: cuando el MER se revise, generarlo con el DSL incluido en `04` y añadirlo aquí.
- Otros elementos quedan marcados **PENDIENTE** de decisión (contrato de notificaciones, perfil accesible de Valhalla, límites de evidencia): ver `01`, `00` y `10`.

## Infraestructura local (nunca subir al repositorio)
La configuración con credenciales **no se versiona** en GitHub (regla registrada en `.gitignore`):
- `docker-compose.yml` (PostGIS + Valhalla con credenciales de BD) y variantes `docker-compose.*.yml`.
- `.env` / `.env.*` (credenciales de la BD en AWS, JWT, S3, push) — solo una plantilla `.env.example`, si se crea, puede subir.
- Datos generados de Valhalla (`infra/valhalla/data/valhalla/`) y tiles `.pbf`.

## Fuentes del proyecto (en `docs/`)
- `OmniTravel Definición del Proyecto.pdf` — alcance, actores y procesos 1–3.
- `OmniTravel Software Architecture Description – C4 Model.pdf` — vistas N1–N4 del sistema.
- `OmniTravel. Plan de Gestión de la Calidad.pdf` — RNF-01 a RNF-30 (ISO/IEC 25010).
- `OmniTravel UI_ Mockups.pdf` — pantallas U01–U12, M01–M07, S01–S02.
- Conversiones de referencia de esos PDFs en `.md` junto a cada PDF (generadas para revisión, no para sustituir la fuente).
