# ADR-002: Frontend móvil y backend separados, backend por módulos

- **Estado:** Aceptada según la Descripción de Arquitectura (C4, N2/N3).
- **Contexto:** Sistema con reglas de negocio propias (consenso, moderación, ruteo accesible), roles diferenciados y datos geoespaciales que no deben residir en el cliente; el cliente móvil es de solo presentación y captura.
- **Decisión:** Dos aplicaciones desplegables independientes: la app móvil (ADR-001) y un backend core NestJS organizado por módulos de dominio (auth, users, pois, accessibility, reports, moderation, feedback, routes, storage), cada uno con controller/service/DTO; reglas de negocio y autorización residen solo en el backend.
- **Alternativas:** Backend-less con Supabase RLS como única lógica; lógica compartida cliente-servidor; microservicios.
- **Justificación:** Evita duplicar reglas (consenso, estados, exclusión de barreras) y permite auditar/controlar sin depender del cliente; el ماشá ORM y PostGIS viven en el backend. Un monolito modular es suficiente para la escala del proyecto.
- **Consecuencias:** Contratos API estables (ADR-003), CORS explícito entre móvil/front web y backend, y disciplina de DTO: nunca exponer entidades crudas ni datos sensibles (RNF-07).
