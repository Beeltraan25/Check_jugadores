-- Datos de prueba para HOY (opcional). Ejecútalo en el SQL Editor después de schema.sql.
-- Crea 3 partidas que salieron hace ~2 h, ~1 h y ~30 min, con jugadores, un buggy y avistamientos.
-- Las horas usan la zona de Madrid; cámbiala si tu campo está en otra.

with zona as (select 'Europe/Madrid'::text as tz),
ahora as (select (now() at time zone (select tz from zona)) as local),
nuevas as (
  insert into public.partidas (fecha, hora_salida, hoyo_salida, nombre)
  select (select local::date from ahora),
         date_trunc('minute', now()) - make_interval(mins => m),
         1,
         n
  from (values (124, 'Partida García'), (64, 'Partida López'), (34, '')) as v(m, n)
  returning id, hora_salida
),
jug as (
  insert into public.jugadores (partida_id, nombre, orden)
  select id, j.nombre, j.orden
  from nuevas, (values ('Ana Ruiz', 0), ('Luis Gil', 1)) as j(nombre, orden)
  returning id, partida_id, orden
),
buggy as (
  insert into public.alquileres (partida_id, jugador_id, tipo, numero)
  select partida_id, id, 'buggy', 7 from jug where orden = 0
  returning id
)
-- Un avistamiento por partida: vistos ahora mismo en un green que deberían haber
-- terminado hace 4 min (15 min por hoyo) → retraso de unos 4 min = "aviso".
insert into public.avistamientos (partida_id, hoyo, posicion, visto_en, retraso_min, estado, marshal)
select id,
       hoyo,
       'green',
       now(),
       round((minutos - 15 * hoyo)::numeric, 1),
       'aviso',
       'Datos de prueba'
from (
  select id,
         extract(epoch from now() - hora_salida) / 60 as minutos,
         floor((extract(epoch from now() - hora_salida) / 60 - 4) / 15)::int as hoyo
  from nuevas
) as calculo;
