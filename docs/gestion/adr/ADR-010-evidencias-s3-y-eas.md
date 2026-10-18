# ADR-010: Evidencias en S3 con validación en backend; distribución de la app con EAS

- **Estado:** Propuesta basada en el C4 (N1/N2: AWS S3 para fotos) y el RNF-03/19/29.
- **Contexto:** Las evidencias fotográficas de accesibilidad son de gran tamaño, se capturan en campo con red móvil inestable y no deben pasar por el backend ni computar su almacenamiento; la app necesita desplegar y actualizar iOS/Android sin infraestructura local de firmas.
- **Decisión:** Las fotos se suben **directamente a AWS S3** desde la app con URLs presignadas emitidas por el backend tras validar tipo MIME y tamaño máximo (RNF-29); el dispositivo implementa colas/reintentos para conservar la evidencia ante cortes de red de hasta 5 minutos (RNF-19); los metadatos (objectKey, MIME, tamaño, fecha) se registran vía el reporte. La distribución de la app usa **EAS** (builds en la nube, OTA updates con `eas update`, configuración nativa solo en `app.json`/config plugins por CNG).
- **Alternativas:** Almacenamiento local del dispositivo (no colaborativo); subir por el backend (mayor costo y RNF-03 en riesgo); builds nativos locales.
- **Justificación:** Desacopla el binario de la app del ciclo de releases del equipo; protege el backend del peso de los archivos; habilita análisis posteriores (calidad de evidencia, deduplicación) sin mover datos.
- **Consecuencias:** Definir límite de tamaño y tipos permitidos en política; presigned URLs de vida corta; RLS/CORS del bucket restrictivo; monitoreo de costos de S3; cada build nuevo exige revisión de `expo-doctor`.
