-- OmniTravel · migración 001 (AWS RDS, base omnitravel_db)
--
-- `reporte.es_critico`: bandera de barrera crítica que la app envía en el
-- wizard U09/U10 y que la consola de moderación usa para priorizar (Vía B).
-- Existía en el proyecto Supabase; se agrega aquí para mantener el contrato.
-- Ya aplicada en omnitravel_db el 2026-10-18.
--
-- Aditiva e idempotente: puede ejecutarse varias veces sin efecto adicional.

alter table public.reporte
  add column if not exists es_critico boolean not null default false;

create index if not exists idx_reporte_poi          on public.reporte(poi_id);
create index if not exists idx_reporte_estado       on public.reporte(estado);
create index if not exists idx_confirmacion_reporte on public.confirmacion(reporte_id);
create index if not exists idx_valor_reporte        on public.valor_caracteristica_reporte(reporte_id);
create index if not exists idx_evidencia_reporte    on public.evidencia(reporte_id);
