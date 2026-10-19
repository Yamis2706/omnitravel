# ADR-003: API REST versionada bajo /api/v1

- **Estado:** Propuesta (alineada con el C4 y el patrón del curso; el backend aún no la formaliza).
- **Contexto:** La app móvil y el front web del equipo consumen el mismo backend; la cobertura cambia rápido (hoy mock-driven) y se necesitan evoluciones sin romper clientes.
- **Decisión:** Todas las rutas bajo el prefijo `/api/v1` (NestJS con `app.setGlobalPrefix('api/v1')`), documentadas con OpenAPI/Swagger. El archivo `docs/gestion/openapi.yaml` (BORRADOR 0.1.0) es el candidato a contrato normativo tras aprobación.
- **Alternativas:** Una única versión sin prefijo; gRPC; GraphQL.
- **Justificación:** Versionable, simple para clientes móviles, instrumentable con Swagger, y consistente con el estándar REST/HTTPS de los entregables.
- **Consecuencias:** Mantener la forma ya consumida por la app (`Poi`, `ValorAccesibilidad`, respuesta de `/routes` compatible con Valhalla más `warnings[]`) para reemplazar mocks sin romper el front; los cambios incompatibles exigen versión nueva `/v2`.
