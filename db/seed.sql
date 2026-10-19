-- RioRota alpha — illustrative seed (TDD section 3.3)
-- Run AFTER schema.sql. Safe to re-run: clears rows, then inserts again.
-- Phone numbers are fake. Fees and durations are consistent per trip.

truncate table contato, embarcacao_rota, rota, embarcacao, porto restart identity cascade;

-- One port per city from the prototype. Coordinates are approximate (for a later map).
insert into porto (nome, endereco, cidade, latitude, longitude) values
  (
    'Terminal Fluvial de Santarém',
    'Av. Tapajós, s/n — Centro',
    'Santarém',
    -2.443060,
    -54.708330
  ),
  (
    'Porto de Óbidos',
    'Orla fluvial — Centro',
    'Óbidos',
    -1.901110,
    -55.520560
  ),
  (
    'Porto de Alenquer',
    'Av. Beira Rio, s/n — Centro',
    'Alenquer',
    -1.941670,
    -54.738330
  ),
  (
    'Porto de Monte Alegre',
    'Rua do Porto, s/n — Centro',
    'Monte Alegre',
    -2.000830,
    -54.081110
  );

-- At least two Lancha and two Barco. Names inspired by the prototype.
insert into embarcacao (nome, tipo, capacidade, comodidades) values
  (
    'Expresso Tapajós II',
    'Lancha',
    80,
    '{poltrona,wifi,lanchonete,colete}'
  ),
  (
    'Lancha Tapajós I',
    'Lancha',
    60,
    '{poltrona,wifi,colete}'
  ),
  (
    'F/B Monte Cristo II',
    'Barco',
    180,
    '{poltrona,lanchonete,colete}'
  ),
  (
    'N/M Cidade de Oriximiná II',
    'Barco',
    220,
    '{poltrona,lanchonete,colete}'
  );

-- Six routes leaving Santarém. dias_semana: 0 = Sunday ... 6 = Saturday.
-- Inserts look up ports by city so we do not depend on generated ids.

-- 1) Santarém → Óbidos, 06:30, every day (will be linked to two boats)
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select
  '06:30'::time,
  150,
  90.00,
  '{0,1,2,3,4,5,6}',
  'Rampa 3',
  timestamptz '2026-08-20 12:00:00-03',
  origem.id,
  destino.id
from porto origem
join porto destino on destino.cidade = 'Óbidos'
where origem.cidade = 'Santarém';

-- 2) Santarém → Óbidos, 18:45, weekdays
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select
  '18:45'::time,
  150,
  70.00,
  '{1,2,3,4,5}',
  'Rampa 4',
  timestamptz '2026-08-18 09:00:00-03',
  origem.id,
  destino.id
from porto origem
join porto destino on destino.cidade = 'Óbidos'
where origem.cidade = 'Santarém';

-- 3) Santarém → Alenquer, 07:15, every day
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select
  '07:15'::time,
  90,
  110.00,
  '{0,1,2,3,4,5,6}',
  'Rampa 2',
  timestamptz '2026-08-21 08:00:00-03',
  origem.id,
  destino.id
from porto origem
join porto destino on destino.cidade = 'Alenquer'
where origem.cidade = 'Santarém';

-- 4) Santarém → Alenquer, 16:30, every day
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select
  '16:30'::time,
  90,
  110.00,
  '{0,1,2,3,4,5,6}',
  'Rampa 2',
  timestamptz '2026-08-21 08:00:00-03',
  origem.id,
  destino.id
from porto origem
join porto destino on destino.cidade = 'Alenquer'
where origem.cidade = 'Santarém';

-- 5) Santarém → Monte Alegre, 08:00, Mon/Wed/Fri (use another weekday to test the empty state)
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select
  '08:00'::time,
  330,
  150.00,
  '{1,3,5}',
  'Rampa 1',
  timestamptz '2026-08-19 16:00:00-03',
  origem.id,
  destino.id
from porto origem
join porto destino on destino.cidade = 'Monte Alegre'
where origem.cidade = 'Santarém';

-- 6) Santarém → Monte Alegre, 20:00, Tue/Thu/Sat
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select
  '20:00'::time,
  330,
  150.00,
  '{2,4,6}',
  'Rampa 1',
  timestamptz '2026-08-19 16:00:00-03',
  origem.id,
  destino.id
from porto origem
join porto destino on destino.cidade = 'Monte Alegre'
where origem.cidade = 'Santarém';

-- Junction: one route × boat (plus two boats on the 06:30 Óbidos trip).
insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '06:30'::time
join porto d on d.id = r.porto_destino_id and d.cidade = 'Óbidos'
where e.nome in ('Expresso Tapajós II', 'Lancha Tapajós I');

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '18:45'::time
join porto d on d.id = r.porto_destino_id and d.cidade = 'Óbidos'
where e.nome = 'F/B Monte Cristo II';

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '07:15'::time
join porto d on d.id = r.porto_destino_id and d.cidade = 'Alenquer'
where e.nome = 'Lancha Tapajós I';

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '16:30'::time
join porto d on d.id = r.porto_destino_id and d.cidade = 'Alenquer'
where e.nome = 'Expresso Tapajós II';

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '08:00'::time
join porto d on d.id = r.porto_destino_id and d.cidade = 'Monte Alegre'
where e.nome = 'N/M Cidade de Oriximiná II';

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '20:00'::time
join porto d on d.id = r.porto_destino_id and d.cidade = 'Monte Alegre'
where e.nome = 'F/B Monte Cristo II';

-- One or two contacts per boat. valor = label (assumption from TDD section 12).
insert into contato (numero_telefone, valor, embarcacao_id)
select '91900000001', 'WhatsApp', id from embarcacao where nome = 'Expresso Tapajós II';

insert into contato (numero_telefone, valor, embarcacao_id)
select '91900000002', 'Responsável', id from embarcacao where nome = 'Expresso Tapajós II';

insert into contato (numero_telefone, valor, embarcacao_id)
select '91900000003', 'WhatsApp', id from embarcacao where nome = 'Lancha Tapajós I';

insert into contato (numero_telefone, valor, embarcacao_id)
select '91900000004', 'WhatsApp', id from embarcacao where nome = 'F/B Monte Cristo II';

insert into contato (numero_telefone, valor, embarcacao_id)
select '91900000005', 'Telefone', id from embarcacao where nome = 'F/B Monte Cristo II';

insert into contato (numero_telefone, valor, embarcacao_id)
select '91900000006', 'WhatsApp', id from embarcacao where nome = 'N/M Cidade de Oriximiná II';

-- ---------------------------------------------------------------------------
-- Return routes (X → Santarém). Same duration and fee as the outbound leg.
-- The junction inserts above only match routes whose DESTINATION is Óbidos,
-- Alenquer or Monte Alegre, so these new rows (destination Santarém) are not
-- picked up by them; each one gets its own junction insert below.
-- ---------------------------------------------------------------------------

-- 7) Óbidos → Santarém, 14:00, every day
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select '14:00'::time, 150, 90.00, '{0,1,2,3,4,5,6}', 'Rampa 1',
  timestamptz '2026-08-20 12:00:00-03', origem.id, destino.id
from porto origem
join porto destino on destino.cidade = 'Santarém'
where origem.cidade = 'Óbidos';

-- 8) Óbidos → Santarém, 06:00, weekdays
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select '06:00'::time, 150, 70.00, '{1,2,3,4,5}', 'Rampa 2',
  timestamptz '2026-08-18 09:00:00-03', origem.id, destino.id
from porto origem
join porto destino on destino.cidade = 'Santarém'
where origem.cidade = 'Óbidos';

-- 9) Alenquer → Santarém, 09:30, every day
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select '09:30'::time, 90, 110.00, '{0,1,2,3,4,5,6}', 'Rampa 1',
  timestamptz '2026-08-21 08:00:00-03', origem.id, destino.id
from porto origem
join porto destino on destino.cidade = 'Santarém'
where origem.cidade = 'Alenquer';

-- 10) Alenquer → Santarém, 18:30, every day
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select '18:30'::time, 90, 110.00, '{0,1,2,3,4,5,6}', 'Rampa 1',
  timestamptz '2026-08-21 08:00:00-03', origem.id, destino.id
from porto origem
join porto destino on destino.cidade = 'Santarém'
where origem.cidade = 'Alenquer';

-- 11) Monte Alegre → Santarém, 14:00, Mon/Wed/Fri
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select '14:00'::time, 330, 150.00, '{1,3,5}', 'Rampa 1',
  timestamptz '2026-08-19 16:00:00-03', origem.id, destino.id
from porto origem
join porto destino on destino.cidade = 'Santarém'
where origem.cidade = 'Monte Alegre';

-- 12) Monte Alegre → Santarém, 05:30, Tue/Thu/Sat
insert into rota (
  horario_saida, duracao_minutos, valor_taxa, dias_semana, ponto_embarque, atualizado_em,
  porto_origem_id, porto_destino_id
)
select '05:30'::time, 330, 150.00, '{2,4,6}', 'Rampa 1',
  timestamptz '2026-08-19 16:00:00-03', origem.id, destino.id
from porto origem
join porto destino on destino.cidade = 'Santarém'
where origem.cidade = 'Monte Alegre';

-- Junction for the return routes (matched by origin city + time).
insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '14:00'::time
join porto o on o.id = r.porto_origem_id and o.cidade = 'Óbidos'
where e.nome in ('Expresso Tapajós II', 'Lancha Tapajós I');

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '06:00'::time
join porto o on o.id = r.porto_origem_id and o.cidade = 'Óbidos'
where e.nome = 'F/B Monte Cristo II';

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '09:30'::time
join porto o on o.id = r.porto_origem_id and o.cidade = 'Alenquer'
where e.nome = 'Lancha Tapajós I';

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '18:30'::time
join porto o on o.id = r.porto_origem_id and o.cidade = 'Alenquer'
where e.nome = 'Expresso Tapajós II';

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '14:00'::time
join porto o on o.id = r.porto_origem_id and o.cidade = 'Monte Alegre'
where e.nome = 'N/M Cidade de Oriximiná II';

insert into embarcacao_rota (embarcacao_id, rota_id)
select e.id, r.id
from embarcacao e
join rota r on r.horario_saida = '05:30'::time
join porto o on o.id = r.porto_origem_id and o.cidade = 'Monte Alegre'
where e.nome = 'F/B Monte Cristo II';
