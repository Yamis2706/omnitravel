-- ============================================================================
-- OmniTravel · Peticiones del FRONT a la BD — GUARDADOS (favoritos)
-- ============================================================================
-- Contexto: el tab Guardados necesita leer/escribir la tabla `favorito`
-- existente (usuario_id, poi_id, fecha). La tabla tenía RLS activada pero
-- SIN políticas (denegaba todo), por lo que la app no podía sincronizarla.
--
-- EJECUTADO 2026-10-18 en el SQL Editor del proyecto
-- ("sarafaustino's Project" · ref scpwrozsjpittiypvwxj), con la autorización
-- de la responsable del front, usando la función `usuario_actual_id()`
-- (security definer) creada por peticiones-front-entrega2.sql §3 — ejecutar
-- ese script ANTES que este.
--
-- Efecto verificado: cada viajero solo ve, agrega y quita SUS favoritos.
-- El conteo público de favoritos por POI no se expone aquí por privacidad
-- (decisión documentada en el README de la carpeta).
-- ============================================================================

drop policy if exists "guardados_lectura_propia" on public.favorito;
create policy "guardados_lectura_propia"
  on public.favorito for select to authenticated
  using (usuario_id = public.usuario_actual_id());

drop policy if exists "guardados_inserta_propia" on public.favorito;
create policy "guardados_inserta_propia"
  on public.favorito for insert to authenticated
  with check (usuario_id = public.usuario_actual_id());

drop policy if exists "guardados_elimina_propia" on public.favorito;
create policy "guardados_elimina_propia"
  on public.favorito for delete to authenticated
  using (usuario_id = public.usuario_actual_id());

grant select, insert, delete on public.favorito to authenticated;

-- Verificación rápida (debe devolver las 3 políticas):
select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'favorito'
order by policyname;
