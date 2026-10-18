# ADR-006: ORM estándar y SQL geoespacial selectivo encapsulado

- **Estado:** Propuesta (pendiente de la librería definitiva del backend).
- **Contexto:** La mayoría de operaciones es CRUD simple, pero las consultas del mapa y del ruteo requieren operadores PostGIS (GIST, `ST_DWithin`, `ST_Intersects`) y agregados (calificación media, total de experiencias, confirmaciones) que no deben construirse en cada capa.
- **Decisión:** Módulos NestJS con acceso a datos en servicios/repositorios dedicados: ORM del proyecto para operaciones ordinarias y **SQL espacial selectiva** para consultas geoespaciales y agregados críticos, encapsulada en el repositorio correspondiente y con tests de plan de ejecución (índices GIST en uso). La elección concreta de ORM (TypeORM, Prisma u otro, con soporte PostGIS) debe registrarse aquí en cuanto se decida el esqueleto del backend.
- **Alternativas:** SQL crudo para todo; ORM con extensión geográfica para todo; capa propia de data-mapper.
- **Justificación:** Rendimiento y control en las consultas calientes (RNF-01/04) sin perder productividad en CRUD; mantiene una única puerta a la BD para aplicar autorización y trazabilidad.
- **Consecuencias:** Los cambios de esquema requieren actualizar tanto el ORM como la SQL espacial; documentar los mapeos cuando el nombre de API difiera del físico.
