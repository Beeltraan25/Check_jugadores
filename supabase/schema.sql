-- =====================================================================
-- Ritmo de juego · Esquema de base de datos (Supabase / PostgreSQL)
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pega este archivo → Run.
-- Crea 5 tablas (torneos, partidas, jugadores, alquileres, avistamientos), la
-- seguridad (solo personal con sesión iniciada) y activa el tiempo real.
-- =====================================================================

-- Tipos -----------------------------------------------------------------
create type public.posicion_hoyo as enum ('tee', 'segundo_golpe', 'tercer_golpe', 'green');
create type public.estado_ritmo  as enum ('adelantado', 'en_tiempo', 'aviso', 'retrasado');
create type public.tipo_alquiler as enum ('carro_electrico', 'buggy');

-- 0. TORNEOS: cada torneo (o jornada) guarda sus partidas y todo lo registrado
create table public.torneos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text        not null,
  fecha       date        not null,
  notas       text        not null default '',
  creado_en   timestamptz not null default now(),
  cerrado_en  timestamptz                                     -- null = abierto (en juego)
);
create index torneos_fecha_idx on public.torneos (fecha desc, creado_en desc);

-- 1. PARTIDAS: un grupo de jugadores con su hora de salida ---------------
create table public.partidas (
  id                    uuid primary key default gen_random_uuid(),
  torneo_id             uuid        not null references public.torneos (id) on delete cascade,
  fecha                 date        not null,                 -- día de juego (hora local)
  hora_salida           timestamptz not null,                 -- tee time
  hoyo_salida           smallint    not null default 1 check (hoyo_salida between 1 and 18),
  nombre                text        not null default '',
  observaciones         text        not null default '',      -- notas libres del Marshal
  revision_iniciada_en  timestamptz,                          -- Marshal revisándola ahora (null = no)
  terminada_en          timestamptz,
  creada_en             timestamptz not null default now(),
  actualizada_en        timestamptz not null default now()
);
create index partidas_torneo_salida_idx on public.partidas (torneo_id, hora_salida);

-- 2. JUGADORES ------------------------------------------------------------
create table public.jugadores (
  id          uuid primary key default gen_random_uuid(),
  partida_id  uuid     not null references public.partidas (id) on delete cascade,
  nombre      text     not null check (length(trim(nombre)) > 0),
  orden       smallint not null default 0
);
create index jugadores_partida_idx on public.jugadores (partida_id);

-- 3. ALQUILERES: carro eléctrico o buggy, con su número (uno por jugador) --
create table public.alquileres (
  id          uuid primary key default gen_random_uuid(),
  partida_id  uuid not null references public.partidas (id) on delete cascade,
  jugador_id  uuid not null unique references public.jugadores (id) on delete cascade,
  tipo        public.tipo_alquiler not null,
  numero      integer check (numero > 0),                     -- nº de carro / buggy
  creado_en   timestamptz not null default now()
);
create index alquileres_partida_idx on public.alquileres (partida_id);
create index alquileres_tipo_numero_idx on public.alquileres (tipo, numero);

-- 4. AVISTAMIENTOS ("tiempos"): cada vez que el Marshal ve a una partida ---
create table public.avistamientos (
  id                    uuid primary key default gen_random_uuid(),
  partida_id            uuid not null references public.partidas (id) on delete cascade,
  hoyo                  smallint not null check (hoyo between 1 and 18),
  posicion              public.posicion_hoyo not null,
  revision_iniciada_en  timestamptz,                          -- cuándo empezó a revisarlos
  visto_en              timestamptz not null,                 -- hora exacta (la pone el móvil)
  retraso_min           numeric(6, 1) not null,               -- + tarde / − adelantados
  estado                public.estado_ritmo not null,
  marshal               text,
  creado_en             timestamptz not null default now()    -- cuándo llegó al servidor
);
create index avistamientos_partida_visto_idx on public.avistamientos (partida_id, visto_en desc);

-- actualizada_en se rellena sola -----------------------------------------
create or replace function public.marcar_actualizada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizada_en := now();
  return new;
end;
$$;

create trigger partidas_actualizada
  before update on public.partidas
  for each row execute function public.marcar_actualizada();

-- Vista útil para informes: estado actual (último avistamiento) de cada partida
create view public.estado_partidas
with (security_invoker = true) as
select distinct on (p.id)
  p.id,
  p.torneo_id,
  p.fecha,
  p.hora_salida,
  p.hoyo_salida,
  p.nombre,
  p.terminada_en,
  a.hoyo        as ultimo_hoyo,
  a.posicion    as ultima_posicion,
  a.visto_en    as ultimo_visto_en,
  a.retraso_min as ultimo_retraso_min,
  a.estado      as ultimo_estado
from public.partidas p
left join public.avistamientos a on a.partida_id = p.id
order by p.id, a.visto_en desc nulls last;

-- Seguridad (RLS) ----------------------------------------------------------
-- La clave pública de Supabase va dentro de la web, así que sin RLS cualquiera
-- podría leer o escribir. Con estas políticas solo el personal con sesión iniciada
-- (cuentas creadas en Authentication → Users) puede usar los datos.
alter table public.torneos       enable row level security;
alter table public.partidas      enable row level security;
alter table public.jugadores     enable row level security;
alter table public.alquileres    enable row level security;
alter table public.avistamientos enable row level security;

create policy "Personal con sesión: acceso total" on public.torneos
  for all to authenticated using (true) with check (true);
create policy "Personal con sesión: acceso total" on public.partidas
  for all to authenticated using (true) with check (true);
create policy "Personal con sesión: acceso total" on public.jugadores
  for all to authenticated using (true) with check (true);
create policy "Personal con sesión: acceso total" on public.alquileres
  for all to authenticated using (true) with check (true);
create policy "Personal con sesión: acceso total" on public.avistamientos
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete
  on public.torneos, public.partidas, public.jugadores, public.alquileres, public.avistamientos
  to authenticated;
grant select on public.estado_partidas to authenticated;

-- Tiempo real: avisar a los dispositivos conectados de cada cambio --------
alter publication supabase_realtime
  add table public.torneos, public.partidas, public.jugadores, public.alquileres, public.avistamientos;
