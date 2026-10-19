-- RioRota alpha — schema (TDD sections 3.1 and 3.2)
-- Portuguese table/column names. Run this file FIRST in the Supabase SQL Editor.
-- Safe to re-run: drops existing objects, then recreates tables, indexes, and RLS.

drop table if exists contato cascade;
drop table if exists embarcacao_rota cascade;
drop table if exists rota cascade;
drop table if exists embarcacao cascade;
drop table if exists porto cascade;

create table porto (
  id bigint generated always as identity primary key,
  nome text not null,
  endereco text,
  cidade text not null,
  latitude numeric(9,6),
  longitude numeric(9,6)
);

create table embarcacao (
  id bigint generated always as identity primary key,
  nome text not null,
  tipo text not null,
  capacidade integer check (capacidade is null or capacidade > 0),
  comodidades text[] not null default '{}'
);

create table rota (
  id bigint generated always as identity primary key,
  horario_saida time not null,
  duracao_minutos integer not null check (duracao_minutos > 0),
  valor_taxa numeric(10,2) check (valor_taxa is null or valor_taxa >= 0),
  dias_semana smallint[] not null default '{0,1,2,3,4,5,6}',
  ponto_embarque text,
  atualizado_em timestamptz not null default now(),
  porto_origem_id bigint not null references porto(id),
  porto_destino_id bigint not null references porto(id),
  check (porto_origem_id <> porto_destino_id)
);

create table embarcacao_rota (
  embarcacao_id bigint not null references embarcacao(id) on delete cascade,
  rota_id bigint not null references rota(id) on delete cascade,
  primary key (embarcacao_id, rota_id)
);

create table contato (
  id bigint generated always as identity primary key,
  numero_telefone text not null,
  valor text,
  embarcacao_id bigint not null references embarcacao(id) on delete cascade
);

create index on rota (porto_origem_id);
create index on rota (porto_destino_id);
create index on contato (embarcacao_id);

-- Public site is read-only. RLS blocks inserts/updates/deletes with the anon key.
alter table porto enable row level security;
alter table embarcacao enable row level security;
alter table rota enable row level security;
alter table embarcacao_rota enable row level security;
alter table contato enable row level security;

create policy "public read" on porto for select using (true);
create policy "public read" on embarcacao for select using (true);
create policy "public read" on rota for select using (true);
create policy "public read" on embarcacao_rota for select using (true);
create policy "public read" on contato for select using (true);
