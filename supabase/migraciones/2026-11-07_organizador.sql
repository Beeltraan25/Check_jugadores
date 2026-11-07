-- Añade el ORGANIZADOR a los torneos (para comparar qué organizador juega más rápido).
-- Ejecútalo UNA VEZ en Supabase → SQL Editor si ya habías creado las tablas con schema.sql
-- antes del 7/11/2026. Si lo ejecutas dos veces no pasa nada.
alter table public.torneos add column if not exists organizador text not null default '';
create index if not exists torneos_organizador_idx on public.torneos (organizador);
