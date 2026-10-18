# 03. Requisitos no funcionales y calidad

La fuente normativa de valores, fórmulas y criterios de aceptación es el **Plan de Gestión de la Calidad del Proyecto OmniTravel** (entregable del curso, 33 páginas, secciones 4.1–4.6, ISO/IEC 25010). Esta documentación transcribe las metas conocidas (RNF-01 a RNF-30) y no reemplaza la tabla original. No declarar cumplimiento sin medición reproducible.

## Resumen por categoría ISO/IEC 25010

| ID | Categoría | Requisito | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| RNF-01 | Eficiencia de desempeño | Tiempo de cálculo de ruta accesible (Valhalla/pgRouting) | ≤ 3 s en el 95% de las solicitudes, con hasta 200 usuarios concurrentes | Alta |
| RNF-02 | Eficiencia de desempeño | Carga del mapa interactivo (capas cartográficas y de accesibilidad) | ≤ 2 s con conexión 4G estándar | Alta |
| RNF-03 | Eficiencia de desempeño | Subida de evidencia fotográfica a S3 | ≤ 5 s por fotografía en condiciones de red 4G | Media |
| RNF-04 | Eficiencia de desempeño | Consultas geoespaciales concurrentes (PostgreSQL + PostGIS con índices GIST) | ≥ 300 consultas espaciales concurrentes manteniendo el tiempo del RNF-01 | Media |
| RNF-05 | Eficiencia de desempeño | Procesamiento de moderación | Estado visible en la app ≤ 2 s tras la decisión del moderador | Media |
| RNF-06 | Seguridad | Autenticación JWT en todos los endpoints protegidos | 100% de los endpoints protegidos validan un JWT vigente antes de procesar | Alta |
| RNF-07 | Seguridad | Cifrado de datos sensibles de discapacidad | AES-256 en el 100% de los campos clasificados como sensibles; sin persistencia en el backend | Alta |
| RNF-08 | Seguridad | Expiración y renovación de tokens (Secure Storage) | Expiración máxima de 24 h por token de sesión | Alta |
| RNF-09 | Seguridad | Control de acceso basado en roles (moderación solo MODERADOR/ADMIN) | 0 accesos no autorizados detectados en pruebas | Alta |
| RNF-10 | Seguridad | Comunicación cifrada app ↔ backend ↔ servicios externos | 100% de las peticiones externas sobre HTTPS/TLS | Alta |
| RNF-11 | Capacidad de interacción | Pautas de accesibilidad WCAG en la app | Nivel AA de WCAG 2.1 verificado con herramientas de auditoría | Alta |
| RNF-12 | Capacidad de interacción | Compatibilidad con lectores de pantalla (TalkBack/VoiceOver) | 100% de los componentes de navegación principal etiquetados y navegables | Alta |
| RNF-13 | Capacidad de interacción | Configuración simple del perfil de accesibilidad | Configuración completa en ≤ 3 pantallas o 5 interacciones | Media |
| RNF-14 | Capacidad de interacción | Retroalimentación multisensorial ante acciones críticas | 100% de acciones críticas perceptibles por ≥ 2 canales sensoriales | Media |
| RNF-15 | Capacidad de interacción | Formularios de reporte simplificados | Diligenciamiento promedio ≤ 2 min por reporte | Media |
| RNF-16 | Fiabilidad | Disponibilidad del backend | Uptime ≥ 99% mensual | Alta |
| RNF-17 | Fiabilidad | Tolerancia a fallos del motor de ruteo | 100% de errores capturados y notificados con mensaje claro | Alta |
| RNF-18 | Fiabilidad | Validación por consenso de reportes | 3 confirmaciones independientes antes de publicar/modificar | Alta |
| RNF-19 | Fiabilidad | Recuperación ante caída del almacenamiento en la nube | 0% de pérdida de evidencia ante interrupciones de red de hasta 5 min | Media |
| RNF-20 | Fiabilidad | Consistencia de datos tras re-verificación | 100% de las solicitudes reflejadas en el estado del punto en < 1 min | Media |
| RNF-21 | Adecuación funcional | Cálculo correcto de rutas evitando barreras reportadas | 100% de rutas excluyen segmentos marcados como barrera crítica para el perfil | Alta |
| RNF-22 | Adecuación funcional | Completitud del ciclo de publicación de reportes | 100% de reportes recorren captura→moderación→consenso→publicación sin estados indefinidos | Alta |
| RNF-23 | Adecuación funcional | Aplicación correcta de la regla de consenso | 0% de publicaciones con número de confirmaciones distinto al definido | Alta |
| RNF-24 | Adecuación funcional | Pertinencia del registro de retroalimentación | 100% de solicitudes solo tras finalización confirmada del trayecto/visita | Media |
| RNF-25 | Adecuación funcional | Escalamiento correcto de incidencias a re-verificación | 100% de discrepancias generan solicitud trazable | Media |
| RNF-26 | Protección | Prevención de rutas con riesgo físico | 0% de rutas que atraviesen barrera critica marcada para el perfil | Alta |
| RNF-27 | Protección | Advertencia ante información no verificada | 100% de tramos con datos de > 60 días muestran advertencia visible | Alta |
| RNF-28 | Protección | Protección ante manipulación del consenso | 0 casos de autoconfirmación aceptados en pruebas de seguridad funcional | Alta |
| RNF-29 | Protección | Validación de archivos subidos como evidencia | 100% de archivos validados por tipo MIME y tamaño máximo | Media |
| RNF-30 | Protección | Registro de auditoría de acciones críticas de moderación | 100% de acciones generan registro de auditoría inmutable | Media |

> El plan original incluye además métricas de evidencias (sección 5, p. ej. "80% de aceptación por parte de los usuarios" asociada a RNF-08) pendientes de consolidar por el equipo; no se transcriben como criterios de aceptación sin la fórmula de medición correspondiente.

## Controles técnicos recomendados
- Pruebas automatizadas asociadas a cada requisito y a los endpoints, con evidencia reproducible.
- Transacciones y restricciones de integridad para el consenso comunitario (C3) y las decisiones de moderación.
- Pruebas de concurrencia en confirmaciones (no duplicar la publicación al 3er confirmación) y en decisiones simultáneas del moderador.
- Pruebas de rendimiento de ruta y de consultas PostGIS con carga realista (RNF-01, RNF-04) y del daño del lenguaje de exclusión de barreras (RNF-21/RNF-26) con casos de prueba funcionales.
- Pruebas de accesibilidad en dispositivo (RNF-11/RNF-12) además del análisis estático (eslint-plugin-triple-rn-a11y ya configurado en la app).
- RNF-07 es un requisito de arquitectura: el perfil detallado de accesibilidad vive en el dispositivo (Async Storage / Secure Storage); el comportamiento actual de `profileStore` debe verificarse para garantizar el cifrado (AES-256) y que los datos sensibles nunca viajen al backend.
- Métricas y logs sin datos sensibles, token, ubicación precisa persistente asidos de datos personales innecesarios.
- La medición de RNF-02/RNF-03/RNF-15 es de experiencia en campo móvil: no se cubre con pruebas de backend aisladas.

## Trazabilidad de calidad
Cada prueba debe referenciar el RNF aplicable, registrar resultado, entorno y limitaciones, y guardar evidencia reproducible. Ver documento 08 (estrategia de pruebas) y 09 (trazabilidad).
