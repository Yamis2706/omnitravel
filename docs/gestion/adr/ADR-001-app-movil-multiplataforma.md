# ADR-001: Aplicación móvil multiplataforma como único cliente

- **Estado:** Aceptada según la Definición del Proyecto ("plataforma móvil OmniTravel") y el Modelo C4.
- **Contexto:** Los actores del sistema (viajero con discapacidad, colaborador comunitario, establecimiento turístico y moderador) necesitan la app en campo: GPS, cámara para evidencia, notificaciones y navegación paso a paso.
- **Decisión:** Un único cliente móvil multiplataforma (React Native con Expo, iOS/Android) con módulos de experiencia segmentados por rol (Módulo Viajero/Comunidad y Módulo Administrador/Moderador), controlados por el rol del JWT (RBAC).
- **Alternativas:** SPA web responsive; apps nativas separadas por sistema; PWA.
- **Justificación:** El dispositivo es imprescindible (cámara, GPS, retroalimentación táctil/auditiva para RNF-14, Secure Storage para RNF-07, lectores de pantalla RNF-12); Expo permite iOS/Android con un codebase y OTA updates vía EAS.
- **Consecuencias:** Debe mantenerse accesibilidad nativa (RNF-11/12) en ambas plataformas, usar Expo SDK vigente (57) con sus APIs actuales, y generar desarrollo builds/EAS para módulos nativos. Las pantallas M01–M07 habilitan dinámicamente el módulo de moderación solo para roles autorizados.
