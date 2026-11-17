-- =====================================================================
-- Alvo Certo — SQL COMPLEMENTAR para o front-end
-- Rode DEPOIS do alvo_certo_supabase.sql (SQL Editor do Supabase).
-- Não cria tabelas, só funções, views, políticas e parâmetros.
-- =====================================================================

-- Parâmetros extras (editáveis na tela Configurações)
insert into configuracao (chave, valor, descricao) values
  ('taxa_reserva_padrao', 25,  'Taxa de reserva padrão de um agendamento (R$)'),
  ('valor_mensalidade',   120, 'Mensalidade dos membros filiados (R$)')
on conflict (chave) do nothing;

-- Situação cadastral de cada cliente (motivo NULL = documentação em dia)
create or replace view vw_clientes_situacao with (security_invoker = true) as
select c.*, motivo_bloqueio(c.id, current_date, false) as motivo
  from cliente c;

-- Cliente pode ver as próprias vendas e mensalidades
create policy venda_self on venda for select to authenticated
  using (cliente_id in (select id from cliente where auth_user_id = auth.uid()));
create policy mensalidade_self on mensalidade for select to authenticated
  using (cliente_id in (select id from cliente where auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Perfis / primeiro acesso
-- ---------------------------------------------------------------------
create or replace function precisa_admin_inicial() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from usuario)
$$;

create or replace function bootstrap_admin(p_nome text) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from usuario) then raise exception 'Já existe um administrador'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into usuario (id, nome, login, perfil) values (auth.uid(), p_nome, v_email, 'administrador');
end $$;

-- Liga a conta ao cadastro criado pelo atendente (mesmo e-mail)
create or replace function vincular_cliente() returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint; v_email text;
begin
  if auth.uid() is null then return null; end if;
  select email into v_email from auth.users where id = auth.uid();
  update cliente set auth_user_id = auth.uid()
   where auth_user_id is null and email is not null and lower(email) = lower(v_email)
     and not exists (select 1 from cliente x where x.auth_user_id = auth.uid())
   returning id into v;
  return v;
end $$;

-- Auto cadastro do cliente (só campos seguros: documentos são conferidos no balcão)
create or replace function criar_meu_cadastro(p_nome text, p_cpf text, p_nascimento date, p_telefone text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint; v_email text;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from usuario where id = auth.uid()) then raise exception 'Esta conta é da equipe'; end if;
  if exists (select 1 from cliente where auth_user_id = auth.uid()) then raise exception 'Cadastro já existe'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into cliente (auth_user_id, nome, cpf, data_nascimento, telefone, email, tipo)
  values (auth.uid(), p_nome, regexp_replace(p_cpf, '\D', '', 'g'), p_nascimento, p_telefone, v_email, 'avulso')
  returning id into v;
  return v;
end $$;

-- Administração de usuários (RF16)
create or replace function listar_contas()
returns table (id uuid, email text, criado_em timestamptz, perfil perfil_usuario, eh_cliente boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Apenas administradores'; end if;
  return query
    select u.id, u.email::text, u.created_at, us.perfil,
           exists (select 1 from cliente c where c.auth_user_id = u.id)
      from auth.users u left join usuario us on us.id = u.id
     order by u.created_at desc;
end $$;

create or replace function promover_usuario(p_id uuid, p_nome text, p_perfil perfil_usuario, p_ativo boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Apenas administradores'; end if;
  insert into usuario (id, nome, login, perfil, ativo)
  select p_id, p_nome, email, p_perfil, p_ativo from auth.users where id = p_id
  on conflict (id) do update set nome = excluded.nome, perfil = excluded.perfil, ativo = excluded.ativo;
end $$;

-- ---------------------------------------------------------------------
-- Caixa: venda completa em uma transação (aplica RN01 e RN02 via triggers)
-- p_itens = [{"id": 1, "qtd": 2}, ...]
-- ---------------------------------------------------------------------
create or replace function finalizar_venda(
  p_cliente bigint, p_itens jsonb, p_forma forma_pagamento,
  p_agendamento bigint default null, p_arma_propria boolean default false
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; it jsonb; v_total numeric;
begin
  if not is_staff() then raise exception 'Sem permissão'; end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then raise exception 'A comanda está vazia'; end if;

  insert into venda (cliente_id, usuario_id, agendamento_id, usa_arma_propria, forma_pagamento, situacao)
  values (p_cliente, auth.uid(), p_agendamento, p_arma_propria, p_forma, 'aberta')
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_itens) loop
    insert into item_venda (venda_id, produto_servico_id, quantidade)
    values (v_id, (it->>'id')::bigint, (it->>'qtd')::numeric);
  end loop;

  select total into v_total from venda where id = v_id;
  update venda set situacao = 'paga' where id = v_id;
  if v_total > 0 then
    insert into pagamento (tipo, venda_id, cliente_id, valor, forma)
    values ('venda', v_id, p_cliente, v_total, p_forma);
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Mensalidades dos filiados (RF14)
-- ---------------------------------------------------------------------
create or replace function gerar_mensalidades(p_competencia date default date_trunc('month', current_date)::date)
returns integer
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if not is_staff() then raise exception 'Sem permissão'; end if;
  insert into mensalidade (cliente_id, competencia, valor, vencimento)
  select id, p_competencia, cfg('valor_mensalidade'), p_competencia + 9
    from cliente where tipo = 'filiado' and situacao = 'ativo'
  on conflict (cliente_id, competencia) do nothing;
  get diagnostics v = row_count;
  return v;
end $$;

create or replace function pagar_mensalidade(p_id bigint, p_forma forma_pagamento)
returns void
language plpgsql security definer set search_path = public as $$
declare m mensalidade;
begin
  if not is_staff() then raise exception 'Sem permissão'; end if;
  update mensalidade set situacao = 'paga', pago_em = current_date
   where id = p_id and situacao <> 'paga'
   returning * into m;
  if not found then raise exception 'Mensalidade inexistente ou já paga'; end if;
  if m.valor > 0 then
    insert into pagamento (tipo, cliente_id, valor, forma) values ('mensalidade', m.cliente_id, m.valor, p_forma);
  end if;
end $$;
