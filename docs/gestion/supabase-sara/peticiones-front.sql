-- ============================================================================
-- OmniTravel · Peticiones del FRONT a la BD (para Sara, equipo de datos)
-- ============================================================================
-- ⚠️ EJECUTADO Y VERIFICADO EN VIVO EL 2026-10-17, con autorización de la
-- responsable del front (equipo OmniTravel) para avanzar con la entrega.
-- Verificación posterior (llave publishable del cliente):
--   · poi → 5 filas · caracteristica_accesibilidad → 7 · rol → 5
--   · valor_accesibilidad_poi → 27 · retroalimentacion → 2
--   · INSERT usuario (anon) → 201; fila de prueba eliminada tras la prueba
--   · SELECT usuario (anon) → 0 filas (el perfil propio solo lo ve su dueño)
--
-- Contexto: el front móvil (mobile-app) consume este proyecto Supabase
-- (ref scpwrozsjpittiypvwxj) para: mapa U06, catálogo+valores U05/U08, y
-- registro/login de cuenta viajero (U01–U03).
--
-- Estado verificado en vivo (2026-10-17):
--   · Todas las tablas tienen RLS activo, PERO pg_policies está VACÍO
--     (cero políticas). Por eso toda lectura/escritura vía API devuelve
--     0 filas o error 42501.
--
-- Este script añade SOLO lo que el front necesita para su entrega.
-- No modifica tablas ni datos. Ejecutar en el SQL Editor del proyecto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) LECTURA PÚBLICA — requieren el mapa (U06), el detalle (U08), los filtros
--    (U05) y el catálogo de características. Son datos públicos por diseño
--    (mockups U04/U06: exploración sin sesión):
-- ----------------------------------------------------------------------------
create policy "lectura_publica_poi"
  on public.poi
  for select
  to anon, authenticated
  using (true);

create policy "lectura_publica_caracteristica_accesibilidad"
  on public.caracteristica_accesibilidad
  for select
  to anon, authenticated
  using (true);

create policy "lectura_publica_valor_accesibilidad_poi"
  on public.valor_accesibilidad_poi
  for select
  to anon, authenticated
  using (true);

create policy "lectura_publica_retroalimentacion"
  on public.retroalimentacion
  for select
  to anon, authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 2) REGISTRO (U03) — el cliente crea la cuenta en Supabase Auth y luego
--    intenta insertar la fila de `usuario` con auth_user_id = auth.uid().
--    Si el equipo prefiere que SOLO un trigger/edge function cree la fila
--    (recomendado para robustez), marcar las políticas a modo "disable"
--    y avisar al front; hoy el front hace best-effort sin bloquear la UX.
-- ----------------------------------------------------------------------------
create policy "registro_cuenta_viajero"
  on public.usuario
  for insert
  to anon, authenticated
  with check (true);

-- ----------------------------------------------------------------------------
-- 3) PERFIL PROPIO — después de iniciar sesión el front lee la fila de
--    `usuario` enlazada por auth_user_id. Solo el dueño puede leerla:
-- ----------------------------------------------------------------------------
create policy "lectura_perfil_propio"
  on public.usuario
  for select
  to authenticated
  using (auth_user_id is not null and auth_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4) (OPCIONAL) LECTURA CATÁLOGO DE ROLES — permite al front resolver el
--    rol viajero por nombre en lugar de la semilla id_rol=1:
-- ----------------------------------------------------------------------------
create policy "lectura_catalogo_rol"
  on public.rol
  for select
  to anon, authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 5) (PENDIENTE PRÓXIMA FASE) Escrituras de crowdsourcing U09/U10 — crear
--    POI/reporte desde el cliente requiere además política INSERT/UPDATE en
--    `reporte`, `valor_caracteristica_reporte` y storage para `evidencia`.
--    NO activar hasta acordar el flujo con el equipo (Proceso 1 del MER).
-- ----------------------------------------------------------------------------
-- create policy "reportes_autor_propio" on public.reporte ... (a decidir)

-- Verificación sugerida tras ejecutar (SQL Editor):
--   select tablename, policyname, cmd, roles from pg_policies where schemaname='public' order by tablename;
-- Prueba del front: GET /rest/v1/poi?select=id_poi,nombre con la publishable
--   key debe devolver las 5 filas semilla.
