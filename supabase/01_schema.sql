-- =====================================================================
-- Alvo Certo Estande de Tiro — Banco de dados (Supabase / PostgreSQL)
-- Cole no SQL Editor do Supabase e execute de uma vez.
-- Implementa: entidades da seção 5, RN01, RN02, RN03 e RF/RNF de dados.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
create type perfil_usuario       as enum ('administrador', 'atendente', 'instrutor');
create type tipo_cliente         as enum ('avulso', 'filiado');
create type situacao_cliente     as enum ('ativo', 'inativo', 'bloqueado');
create type categoria_item       as enum ('municao', 'alvo', 'protecao', 'acessorio', 'arma_aluguel', 'aula', 'hora_pista');
create type tipo_item            as enum ('produto', 'servico');
create type situacao_pista       as enum ('ativa', 'em_manutencao');
create type situacao_agendamento as enum ('agendado', 'cancelado', 'no_show', 'concluido');
create type situacao_venda       as enum ('aberta', 'paga', 'cancelada');
create type tipo_movimentacao    as enum ('entrada', 'saida');
create type forma_pagamento      as enum ('dinheiro', 'pix', 'debito', 'credito');
create type situacao_manutencao  as enum ('operacional', 'em_manutencao', 'baixado');
create type situacao_mensalidade as enum ('pendente', 'paga', 'atrasada');

-- ---------------------------------------------------------------------
-- 2. TABELAS
-- ---------------------------------------------------------------------

-- Parâmetros configuráveis pelo administrador (RF18)
create table configuracao (
  chave      text primary key,
  valor      numeric not null,
  descricao  text
);

-- Usuários do sistema (login/senha ficam no Supabase Auth, com hash — RNF03)
create table usuario (
  id     uuid primary key references auth.users(id) on delete cascade,
  nome   text not null,
  login  text not null unique,
  perfil perfil_usuario not null default 'atendente',
  ativo  boolean not null default true
);

create table cliente (
  id                 bigint generated always as identity primary key,
  auth_user_id       uuid unique references auth.users(id) on delete set null, -- acesso do cliente pelo app (RF03)
  nome               text not null,
  cpf                text not null unique check (cpf ~ '^\d{11}$'),
  rg                 text,
  data_nascimento    date not null,
  telefone           text,
  email              text unique,
  tipo               tipo_cliente not null default 'avulso',
  cr_numero          text,
  cr_validade        date,
  data_certidao      date,                     -- emissão da certidão de antecedentes
  situacao           situacao_cliente not null default 'ativo',
  criado_em          timestamptz not null default now()
);

create table produto_servico (
  id             bigint generated always as identity primary key,
  nome           text not null,
  categoria      categoria_item not null,
  tipo           tipo_item not null,
  preco          numeric(10,2) not null check (preco >= 0),
  unidade        text not null default 'un',
  estoque_atual  numeric(12,2) not null default 0 check (estoque_atual >= 0),
  estoque_minimo numeric(12,2) not null default 0 check (estoque_minimo >= 0),
  ativo          boolean not null default true,
  -- serviços não têm estoque
  constraint ck_servico_sem_estoque check (tipo = 'produto' or estoque_atual = 0)
);

create table pista (
  id          bigint generated always as identity primary key,
  nome        text not null unique,
  descricao   text,
  valor_hora  numeric(10,2) not null check (valor_hora >= 0),
  situacao    situacao_pista not null default 'ativa'
);

create table equipamento (
  id               bigint generated always as identity primary key,
  descricao        text not null,
  tipo             text not null,
  pista_id         bigint references pista(id),
  situacao         situacao_manutencao not null default 'operacional'
);

create table manutencao (
  id               bigint generated always as identity primary key,
  equipamento_id   bigint references equipamento(id),
  pista_id         bigint references pista(id),
  data_manutencao  date not null default current_date,
  observacoes      text,
  constraint ck_manut_alvo check (equipamento_id is not null or pista_id is not null)
);

-- item que representa um equipamento alugável (ex.: pistola de aluguel)
alter table produto_servico add column equipamento_id bigint references equipamento(id);

create table agendamento (
  id                bigint generated always as identity primary key,
  cliente_id        bigint not null references cliente(id),
  pista_id          bigint not null references pista(id),
  instrutor_id      uuid references usuario(id),
  inicio            timestamptz not null,
  fim               timestamptz not null,
  usa_arma_propria  boolean not null default false,
  taxa_reserva      numeric(10,2) not null default 0 check (taxa_reserva >= 0),
  situacao          situacao_agendamento not null default 'agendado',
  data_cancelamento timestamptz,
  reembolso_taxa    boolean,                  -- definido ao cancelar / no-show (RN03)
  checkin_em        timestamptz,
  criado_em         timestamptz not null default now(),
  constraint ck_agend_periodo check (fim > inicio),
  -- RN03: uma pista não pode ter dois agendamentos no mesmo horário.
  -- Ao cancelar, o horário é liberado automaticamente (sai do WHERE).
  constraint ex_agend_sem_conflito exclude using gist (
    pista_id with =,
    tstzrange(inicio, fim) with &&
  ) where (situacao in ('agendado', 'concluido'))
);
create index on agendamento (cliente_id);
create index on agendamento (inicio);

create table venda (
  id                bigint generated always as identity primary key,
  cliente_id        bigint not null references cliente(id),
  usuario_id        uuid references usuario(id),
  agendamento_id    bigint references agendamento(id),
  usa_arma_propria  boolean not null default false,
  data_hora         timestamptz not null default now(),
  subtotal          numeric(12,2) not null default 0,
  desconto          numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  forma_pagamento   forma_pagamento,
  situacao          situacao_venda not null default 'aberta'
);
create index on venda (cliente_id);
create index on venda (data_hora);

create table item_venda (
  id                 bigint generated always as identity primary key,
  venda_id           bigint not null references venda(id) on delete cascade,
  produto_servico_id bigint not null references produto_servico(id),
  quantidade         numeric(12,2) not null check (quantidade > 0),
  preco_tabela       numeric(10,2) not null default 0,   -- preenchido por trigger
  preco_unitario     numeric(10,2) not null default 0,   -- preenchido por trigger (RN02)
  subtotal           numeric(12,2) not null default 0    -- preenchido por trigger
);
create index on item_venda (venda_id);

create table movimentacao_estoque (
  id                 bigint generated always as identity primary key,
  produto_servico_id bigint not null references produto_servico(id),
  tipo               tipo_movimentacao not null,
  quantidade         numeric(12,2) not null check (quantidade > 0),
  data               timestamptz not null default now(),
  venda_id           bigint references venda(id) on delete set null,
  usuario_id         uuid references usuario(id),
  observacao         text
);
create index on movimentacao_estoque (produto_servico_id);

create table pagamento (
  id              bigint generated always as identity primary key,
  tipo            text not null check (tipo in ('venda', 'reserva', 'mensalidade')),
  venda_id        bigint references venda(id),
  agendamento_id  bigint references agendamento(id),
  cliente_id      bigint references cliente(id),
  valor           numeric(12,2) not null check (valor > 0),
  forma           forma_pagamento not null,
  pago_em         timestamptz not null default now()
);

create table mensalidade (
  id           bigint generated always as identity primary key,
  cliente_id   bigint not null references cliente(id),
  competencia  date not null,                       -- 1º dia do mês
  valor        numeric(10,2) not null check (valor >= 0),
  vencimento   date not null,
  pago_em      date,
  situacao     situacao_mensalidade not null default 'pendente',
  unique (cliente_id, competencia)
);

-- ---------------------------------------------------------------------
-- 3. FUNÇÕES AUXILIARES
-- ---------------------------------------------------------------------
create or replace function cfg(p_chave text) returns numeric
language sql stable as $$ select valor from configuracao where chave = p_chave $$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from usuario where id = auth.uid() and ativo)
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from usuario where id = auth.uid() and ativo and perfil = 'administrador')
$$;

-- RN01: devolve o motivo do bloqueio, ou NULL se o cliente está apto.
create or replace function motivo_bloqueio(
  p_cliente bigint, p_data date, p_arma_propria boolean default false
) returns text
language plpgsql stable as $$
declare
  c cliente%rowtype;
  v_idade_min int := cfg('idade_minima')::int;
  v_validade_certidao int := cfg('validade_certidao_dias')::int;
begin
  select * into c from cliente where id = p_cliente;
  if not found then return 'Cliente não encontrado'; end if;
  if c.situacao <> 'ativo' then return 'Cadastro do cliente não está ativo'; end if;
  if coalesce(c.rg, '') = '' then return 'RG ausente'; end if;
  if coalesce(c.cpf, '') = '' then return 'CPF ausente'; end if;
  if date_part('year', age(p_data, c.data_nascimento)) < v_idade_min then
    return format('Idade mínima de %s anos não atingida', v_idade_min);
  end if;
  if c.data_certidao is null then return 'Certidão de antecedentes ausente'; end if;
  if c.data_certidao + v_validade_certidao < p_data then
    return 'Certidão de antecedentes vencida';
  end if;
  if p_arma_propria then
    if c.cr_numero is null or c.cr_validade is null then return 'CR (Certificado de Registro) ausente'; end if;
    if c.cr_validade < p_data then return 'CR (Certificado de Registro) vencido'; end if;
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 4. REGRAS DE NEGÓCIO — AGENDAMENTO (RN01 + RN03 + RF12)
-- ---------------------------------------------------------------------
create or replace function trg_agendamento_valida() returns trigger
language plpgsql as $$
declare v_motivo text; v_sit situacao_pista;
begin
  if new.situacao <> 'agendado' then return new; end if;
  if tg_op = 'UPDATE' and new.cliente_id = old.cliente_id and new.pista_id = old.pista_id
     and new.inicio = old.inicio and new.usa_arma_propria = old.usa_arma_propria
     and old.situacao = 'agendado' then
    return new;
  end if;

  v_motivo := motivo_bloqueio(new.cliente_id,
                (new.inicio at time zone 'America/Sao_Paulo')::date, new.usa_arma_propria);
  if v_motivo is not null then
    raise exception 'Agendamento bloqueado (RN01): %', v_motivo using errcode = 'P0001';
  end if;

  select situacao into v_sit from pista where id = new.pista_id;
  if v_sit <> 'ativa' then
    raise exception 'Pista em manutenção (RF12): não é possível agendar';
  end if;
  return new;
end $$;

create trigger agendamento_valida
  before insert or update on agendamento
  for each row execute function trg_agendamento_valida();

-- Cancelamento com antecedência mínima (RN03)
create or replace function cancelar_agendamento(p_id bigint)
returns agendamento
language plpgsql security definer set search_path = public as $$
declare a agendamento;
begin
  select * into a from agendamento where id = p_id for update;
  if not found then raise exception 'Agendamento não encontrado'; end if;
  if not (is_staff() or exists (select 1 from cliente where id = a.cliente_id and auth_user_id = auth.uid())) then
    raise exception 'Sem permissão para cancelar este agendamento';
  end if;
  if a.situacao <> 'agendado' then raise exception 'Agendamento não está ativo'; end if;

  update agendamento
     set situacao = 'cancelado',
         data_cancelamento = now(),
         reembolso_taxa = (now() <= a.inicio - cfg('antecedencia_cancelamento_horas') * interval '1 hour')
   where id = p_id
   returning * into a;
  return a;
end $$;

-- Remarcação (RF05): exige a mesma antecedência mínima
create or replace function remarcar_agendamento(p_id bigint, p_novo_inicio timestamptz, p_novo_fim timestamptz)
returns agendamento
language plpgsql security definer set search_path = public as $$
declare a agendamento;
begin
  select * into a from agendamento where id = p_id for update;
  if not found then raise exception 'Agendamento não encontrado'; end if;
  if not (is_staff() or exists (select 1 from cliente where id = a.cliente_id and auth_user_id = auth.uid())) then
    raise exception 'Sem permissão';
  end if;
  if a.situacao <> 'agendado' then raise exception 'Agendamento não está ativo'; end if;
  if now() > a.inicio - cfg('antecedencia_cancelamento_horas') * interval '1 hour' then
    raise exception 'Remarcação fora da antecedência mínima';
  end if;
  update agendamento set inicio = p_novo_inicio, fim = p_novo_fim where id = p_id returning * into a;
  return a;
end $$;

-- No-show (RN03): taxa não reembolsada
create or replace function marcar_no_show(p_id bigint)
returns agendamento
language plpgsql security definer set search_path = public as $$
declare a agendamento;
begin
  if not is_staff() then raise exception 'Sem permissão'; end if;
  update agendamento set situacao = 'no_show', reembolso_taxa = false
   where id = p_id and situacao = 'agendado' and inicio < now()
   returning * into a;
  if not found then raise exception 'Agendamento não elegível para no-show'; end if;
  return a;
end $$;

-- Check-in (RF06): revalida documentação e idade
create or replace function realizar_checkin(p_id bigint)
returns agendamento
language plpgsql security definer set search_path = public as $$
declare a agendamento; v_motivo text;
begin
  if not is_staff() then raise exception 'Sem permissão'; end if;
  select * into a from agendamento where id = p_id for update;
  if not found or a.situacao <> 'agendado' then raise exception 'Agendamento não está ativo'; end if;
  v_motivo := motivo_bloqueio(a.cliente_id, current_date, a.usa_arma_propria);
  if v_motivo is not null then raise exception 'Check-in bloqueado (RN01): %', v_motivo; end if;
  update agendamento set checkin_em = now() where id = p_id returning * into a;
  return a;
end $$;

-- ---------------------------------------------------------------------
-- 5. REGRAS DE NEGÓCIO — VENDA (RN01 + RN02) E ESTOQUE (RF09/RF10)
-- ---------------------------------------------------------------------
create or replace function trg_item_venda_calcula() returns trigger
language plpgsql as $$
declare
  v_cli_id bigint; v_cli_tipo tipo_cliente; v_arma boolean;
  p produto_servico%rowtype;
  v_motivo text; v_eq situacao_manutencao;
begin
  select v.cliente_id, c.tipo, v.usa_arma_propria
    into v_cli_id, v_cli_tipo, v_arma
    from venda v join cliente c on c.id = v.cliente_id
   where v.id = new.venda_id;

  select * into p from produto_servico where id = new.produto_servico_id;
  if not p.ativo then raise exception 'Item "%" está inativo', p.nome; end if;

  -- RN01: serviços de pista exigem cliente apto
  if p.categoria in ('hora_pista', 'aula') then
    v_motivo := motivo_bloqueio(v_cli_id, current_date, v_arma);
    if v_motivo is not null then
      raise exception 'Venda de serviço de pista bloqueada (RN01): %', v_motivo;
    end if;
  end if;

  -- RF12: equipamento em manutenção não pode ser locado
  if p.equipamento_id is not null then
    select situacao into v_eq from equipamento where id = p.equipamento_id;
    if v_eq <> 'operacional' then
      raise exception 'Equipamento "%" indisponível (manutenção)', p.nome;
    end if;
  end if;

  -- RN02: preço conforme modalidade
  new.preco_tabela   := p.preco;
  new.preco_unitario := p.preco;
  if v_cli_tipo = 'filiado' then
    if p.categoria = 'hora_pista' then
      new.preco_unitario := 0;                                   -- isenção de pista
    elsif p.categoria in ('municao', 'alvo', 'acessorio') then
      new.preco_unitario := round(p.preco * (1 - cfg('desconto_filiado_pct') / 100), 2);
    end if;                                                      -- arma de aluguel: tabela
  end if;
  new.subtotal := round(new.quantidade * new.preco_unitario, 2);
  return new;
end $$;

create trigger item_venda_calcula
  before insert or update on item_venda
  for each row execute function trg_item_venda_calcula();

-- Baixa automática de estoque (RF09)
create or replace function trg_item_venda_baixa_estoque() returns trigger
language plpgsql as $$
declare p produto_servico%rowtype; v_user uuid;
begin
  select * into p from produto_servico where id = new.produto_servico_id;
  if p.tipo = 'produto' then
    select usuario_id into v_user from venda where id = new.venda_id;
    insert into movimentacao_estoque (produto_servico_id, tipo, quantidade, venda_id, usuario_id)
    values (new.produto_servico_id, 'saida', new.quantidade, new.venda_id, v_user);
  end if;
  return new;
end $$;

create trigger item_venda_baixa_estoque
  after insert on item_venda
  for each row execute function trg_item_venda_baixa_estoque();

-- Atualiza saldo do produto a cada movimentação
create or replace function trg_movimentacao_atualiza_saldo() returns trigger
language plpgsql as $$
begin
  update produto_servico
     set estoque_atual = estoque_atual + case new.tipo when 'entrada' then new.quantidade else -new.quantidade end
   where id = new.produto_servico_id;   -- CHECK (estoque_atual >= 0) impede saldo negativo
  return new;
end $$;

create trigger movimentacao_atualiza_saldo
  after insert on movimentacao_estoque
  for each row execute function trg_movimentacao_atualiza_saldo();

-- Recalcula totais da venda
create or replace function trg_item_venda_totais() returns trigger
language plpgsql as $$
declare v_id bigint := coalesce(new.venda_id, old.venda_id);
begin
  update venda v set
    subtotal = coalesce(s.sub, 0),
    total    = coalesce(s.tot, 0),
    desconto = coalesce(s.sub, 0) - coalesce(s.tot, 0)
  from (select sum(quantidade * preco_tabela) sub, sum(subtotal) tot
          from item_venda where venda_id = v_id) s
  where v.id = v_id;
  return null;
end $$;

create trigger item_venda_totais
  after insert or update or delete on item_venda
  for each row execute function trg_item_venda_totais();

-- ---------------------------------------------------------------------
-- 6. VIEWS (painel e relatórios — RF10, RF15, RF17)
-- ---------------------------------------------------------------------
create view vw_estoque_baixo with (security_invoker = true) as
select id, nome, categoria, estoque_atual, estoque_minimo
  from produto_servico
 where tipo = 'produto' and ativo and estoque_atual <= estoque_minimo;

-- Base dos relatórios de faturamento (filtre por período; agrupe por tipo_cliente / categoria)
create view vw_faturamento_itens with (security_invoker = true) as
select v.data_hora::date as dia,
       date_trunc('month', v.data_hora)::date as mes,
       c.tipo as tipo_cliente,
       ps.categoria,
       ps.tipo as tipo_item,
       iv.subtotal as valor
  from item_venda iv
  join venda v  on v.id = iv.venda_id and v.situacao = 'paga'
  join cliente c on c.id = v.cliente_id
  join produto_servico ps on ps.id = iv.produto_servico_id;

create view vw_faturamento_resumo with (security_invoker = true) as
select
  coalesce(sum(total) filter (where data_hora::date = current_date), 0) as faturamento_dia,
  coalesce(sum(total) filter (where date_trunc('month', data_hora) = date_trunc('month', now())), 0) as faturamento_mes
from venda where situacao = 'paga';

create view vw_ocupacao_pistas_hoje with (security_invoker = true) as
select p.id as pista_id, p.nome, p.situacao,
       count(a.id) as agendamentos_hoje,
       coalesce(sum(extract(epoch from (a.fim - a.inicio)) / 3600), 0)::numeric(6,2) as horas_reservadas
  from pista p
  left join agendamento a on a.pista_id = p.id
       and a.situacao in ('agendado', 'concluido')
       and (a.inicio at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date
 group by p.id, p.nome, p.situacao;

-- ---------------------------------------------------------------------
-- 7. SEGURANÇA — RLS (RNF03)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['configuracao','usuario','cliente','produto_servico','pista','equipamento',
                           'manutencao','agendamento','venda','item_venda','movimentacao_estoque',
                           'pagamento','mensalidade']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;

  -- equipe: acesso total nas tabelas operacionais
  foreach t in array array['cliente','produto_servico','pista','equipamento','manutencao','agendamento',
                           'venda','item_venda','movimentacao_estoque','pagamento','mensalidade']
  loop
    execute format('create policy staff_all on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- administrador gerencia usuários e parâmetros; equipe pode ler
create policy usuario_leitura on usuario for select to authenticated using (is_staff() or id = auth.uid());
create policy usuario_admin   on usuario for all    to authenticated using (is_admin()) with check (is_admin());
create policy cfg_leitura     on configuracao for select to authenticated using (true);
create policy cfg_admin       on configuracao for all    to authenticated using (is_admin()) with check (is_admin());

-- cliente (app Android — RF03): vê o próprio cadastro, catálogo, pistas e seus agendamentos
create policy cliente_self      on cliente for select to authenticated using (auth_user_id = auth.uid());
create policy catalogo_publico  on produto_servico for select to authenticated using (ativo);
create policy pistas_publicas   on pista for select to authenticated using (true);
create policy agend_self_select on agendamento for select to authenticated
  using (cliente_id in (select id from cliente where auth_user_id = auth.uid()));
create policy agend_self_insert on agendamento for insert to authenticated
  with check (cliente_id in (select id from cliente where auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 8. DADOS INICIAIS
-- ---------------------------------------------------------------------
insert into configuracao (chave, valor, descricao) values
  ('desconto_filiado_pct',            15, 'Desconto (%) dos filiados em munição, alvos e acessórios (RN02)'),
  ('antecedencia_cancelamento_horas',  2, 'Antecedência mínima (h) para cancelar sem perder a taxa (RN03)'),
  ('idade_minima',                    18, 'Idade mínima para frequentar a pista (RN01)'),
  ('validade_certidao_dias',          90, 'Validade considerada da certidão de antecedentes (ajuste conforme o estande)');

insert into pista (nome, descricao, valor_hora) values
  ('Pista 1', 'Pista de 25 m', 80.00),
  ('Pista 2', 'Pista de 25 m', 80.00),
  ('Pista 3', 'Pista de 50 m', 120.00);

insert into produto_servico (nome, categoria, tipo, preco, unidade, estoque_atual, estoque_minimo) values
  ('Hora de pista',            'hora_pista',   'servico',  80.00, 'h',   0,   0),
  ('Aula com instrutor (1h)',  'aula',         'servico', 150.00, 'h',   0,   0),
  ('Aluguel de pistola',       'arma_aluguel', 'servico',  60.00, 'sessão', 0, 0),
  ('Munição 9mm (cx 50)',      'municao',      'produto',  140.00, 'cx', 100,  20),
  ('Alvo de papel',            'alvo',         'produto',    2.50, 'un', 500, 100),
  ('Protetor auricular',       'protecao',     'produto',   25.00, 'un',  40,  10),
  ('Óculos de proteção',       'protecao',     'produto',   35.00, 'un',  30,  10);
