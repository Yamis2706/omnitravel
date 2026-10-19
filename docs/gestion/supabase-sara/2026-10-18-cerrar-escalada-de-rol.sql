-- =============================================================================
-- Supabase (proyecto histórico de OmniTravel) — cerrar escalada de privilegios
-- Aplicado el 2026-10-18.
--
-- Problema: la política `registro_cuenta_viajero` permitía a anon y a
-- authenticated insertar en `usuario` CUALQUIER fila (WITH CHECK true). Como
-- `es_moderador()` lee el rol de esa tabla, cualquiera podía registrarse,
-- insertar su fila con rol moderador/administrador y resolver reportes con
-- `decidir_reporte`.
--
-- Corrección: solo una sesión autenticada puede crear SU propia fila, siempre
-- con rol viajero y cuenta activa. El registro legítimo de viajeros sigue
-- funcionando; los roles elevados solo se asignan desde administración.
-- =============================================================================

drop policy if exists registro_cuenta_viajero on public.usuario;

create policy registro_cuenta_viajero on public.usuario
  for insert to authenticated
  with check (
    auth_user_id = (select auth.uid())
    and rol_id = (select id_rol from public.rol where nombre_rol = 'viajero')
    and estado_cuenta = 'activo'
  );
