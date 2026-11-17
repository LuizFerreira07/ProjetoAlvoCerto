# Alvo Certo — Estande de Tiro (React + Supabase)

Sistema web mobile-first (funciona no celular e no computador) ligado ao banco no Supabase.

## 1. Banco de dados (Supabase)
No **SQL Editor** do Supabase, rode nesta ordem:
1. `supabase/01_schema.sql` (tabelas, regras RN01–RN03, RLS) — se já rodou, não repita.
2. `supabase/02_complemento_front.sql` (funções usadas pelas telas: venda, mensalidades, perfis, usuários).

Em **Authentication → Providers → Email**, desative *Confirm email* enquanto estiver testando
(senão cada conta nova precisa confirmar o e-mail antes de entrar).

## 2. Rodar o app
```bash
npm install
cp .env.example .env     # preencha URL e chave anon do projeto (Project Settings → API)
npm run dev              # abre em http://localhost:5173
npm run build            # gera a pasta dist/ para publicar
```
Sem `.env`, o app mostra uma tela para colar a URL e a chave.

## 3. Primeiro acesso
1. Abra o app → **Criar conta** → entre.
2. Na tela "Complete seu cadastro", use **Tornar-me administrador** (aparece só enquanto não existe nenhum administrador).
3. Em **Configurações → Usuários e acessos**, libere os demais como Atendente ou Instrutor.
4. **Clientes**: a recepção cadastra o cliente (com e-mail). Quando ele criar a conta no app com o mesmo e-mail, o cadastro é vinculado sozinho. O cliente também pode se cadastrar sozinho (fica como avulso e sem documentos até a recepção conferir).

## Telas
| Perfil | Telas |
|---|---|
| Administrador | Visão geral, Agendamentos, Clientes, Caixa, Catálogo, Estoque, Pistas e equipamentos, Filiados, Relatórios, Configurações, Área do cliente (pré-visualização) |
| Atendente | Tudo acima, menos Relatórios e Configurações |
| Instrutor | Agendamentos (só os dele) e Clientes (leitura) |
| Cliente | Minha agenda (agendar, remarcar, cancelar), Meu perfil (documentos, mensalidades, compras) |

## Estrutura
```
src/App.jsx            sessão, perfil, tema, toasts
src/components/        Shell (menu/rotas), AgDetail, NovoAgendamento, ui
src/pages/             uma tela por arquivo
src/lib/               supabase, hooks, utilitários, rotas
supabase/              scripts SQL
```
