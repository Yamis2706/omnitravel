# 14. Runbook de demo — Entrega (Procesos 1 y 2)

> Objetivo: ejecutar la demo y la entrega el día D sin improvisar. Estado al 2026-10-18.

## 0. Qué está desplegado hoy

| Pieza | Dónde | URL / comando |
|---|---|---|
| Backend NestJS (`/health`, `/routes` con alternates) | **Nube — Railway** (autorizada por el profe) | `https://omnitravel-production-4af6.up.railway.app` — deploy con `railway up` desde `backend/` (proyecto `pacific-smile`); BD RDS real (`omnitravel_db`) vía `DATABASE_URL`; Nixpacks vía `railway.toml` |
| Motor Valhalla | Nube pública de OSM | `https://valhalla1.openstreetmap.de` (tras el backend) |
| BD (Proceso 1: reportes, favoritos, evidencia) | Supabase (proyecto del equipo) | RPCs ejecutados y operativos |
| App (APK Android) | EAS Build → proyecto `@yamis2706s-team/omnitravel` | link del build en `expo.dev` |

## 1. Antes de llegar a la demo (checklist)

- [x] Rama `feature/integracion-entrega3` empujada: móvil **83/83** tests, backend **47/47**, tsc y lint limpios.
- [x] Backend corriendo en LAN (py la IP es `192.168.1.4`, puerto `3000`).
- [x] Regla de firewall: `netsh advfirewall firewall add rule name="OmniTravel Backend 3000" dir=in action=allow protocol=TCP localport=3000` (PowerShell como **administrador**).
- [x] APK con `EXPO_PUBLIC_API_URL=http://192.168.1.4:3000` YA APUNTANDO a ese backend.
- [ ] **PC en la misma red Wi-Fi del teléfono en la demo** (mismo SSID). Verificar que la IP no haya cambiado: `ipconfig` → si cambió, editar `eas env:set`(o rebuild) o usar la reserva pública automáticamente.
- [ ] Celular: instalar el APK (descargar del link del build) y abrir con conexión al mismo Wi-Fi.

## 2. Script de demo (8–10 min)

1. **Login**: entrar por rol (viajero/moderador) — mostrar sesión persistente.
2. **Mapa** (Proceso 2, U06): mapa a media pantalla+ con panel deslizable; buscar «Parque del Café» o punto de Armenia; activar GPS (FAB); filtrar por accesibilidad.
3. **Ruta accesible**: elegir destino → ruta dibujada con pasos (Calle 18 → Carrera 21…), advertencias; mapa ≥ media pantalla.
4. **Recalcular ruta** (alternates): pulsar «Recalcular» → aparece el sello **Ruta alternativa** y traza distinta. (Reserva: si el LAN backend falla, la app cae al Valhalla público sola.)
5. **Navegación paso a paso** (U07): iniciar navegación, guía por voz, avanzar paso.
6. **Proceso 1 — crear reporte** (U09/U10): wizard 4 pasos con etiquetas + foto de evidencia → publicar.
7. **Moderación** (M03–M05): entrar como moderador → listar, ver evidencia, decidir (aprobar/rechazar con motivo).
8. **Confirmado por la comunidad**: con otra cuenta confirmar el reporte 3 veces → publica (S01).
9. **Guardados/favoritos**: guardar POI, ver en Guardados.
10. **Perfil con foto local** (privacidad Ley 1581: la foto no sale del dispositivo): cambiar foto por cuenta; cerrar sesión y entrar con otro usuario → cada quien su foto.

## 3. Si algo falla en la demo

- **Rutas fallan** → la app hace *fallback* solo al Valhalla público (el mapa funciona igual; el backend LAN es la “ruta del equipo” pero no es condición de límite de la demo).
- **Backend LAN no responde desde el teléfono** → verificar firewall + misma red; la IP LAN cambió → leer `ipconfig` y (rápido) `eas env:set EXPO_PUBLIC_API_URL` y rebuild, o continuar demo con fallback.
- **Quedó imposible el backend propio** → el APK sigue demostrando TODO (Proceso 1 sobre Supabase + Proceso 2 sobre Valhalla público).

## 4. Pendientes post-entrega (integración a `main` + nube)

### Desplegar backend a la nube (cuando el equipo dé `DATABASE_URL` + `JWT_SECRET`)

1. Colocar las credenciales reales en `backend/.env` (local) y verificar localmente:
   `cd backend; node dist/main.js` → `GET /health` ok y `POST /reportes` responde con JWT (prueba login `POST /auth/login` con un usuario del RDS).
2. En Render (cuenta gratuita, login con GitHub `estiven322M`): **New → Web Service** → conectar repo `estiven322M/omnitravel` → rama `feature/integracion-entrega3` → Root Directory `backend` → Environment **Node** → Build `npm ci && npm run build` → Start `node dist/main.js`.
3. Environment variables en Render: `DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`, `VALHALLA_URL=https://valhalla1.openstreetmap.de`, `EVIDENCIAS_DIR=uploads/evidencia`.
4. Verificar `https://<render-url>/health` → ok.
5. Actualizar la var del APK (NUEVO build): `eas env:set --environment preview --name EXPO_PUBLIC_API_URL --value https://<render-url>` → `npm run build:apk` → APK final con URL público (entregable).
6. Si Render no logra conectar a RDS (seguridad/VPC), mantener backend LAN para la demo y anotarlo.

### Migración completa a `main`
- Completar la migración de la capa de datos al NestJS/RDS (plan §Fase B en `13-plan-integracion-entrega3.md`).
