import { createClient } from '@supabase/supabase-js';

const LS = 'ac_cfg';

/** Lê a configuração do .env (preferencial) ou do que foi salvo na tela de conexão. */
export function getCfg() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) return { url, key, env: true };
  try {
    return JSON.parse(localStorage.getItem(LS) || 'null');
  } catch {
    return null;
  }
}
export const saveCfg = c => localStorage.setItem(LS, JSON.stringify(c));
export const clearCfg = () => localStorage.removeItem(LS);

let client = null;
export function getClient() {
  if (client) return client;
  const c = getCfg();
  if (!c) return null;
  client = createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

/** Resolve a promessa do supabase-js e lança o erro, se houver. */
export async function q(p) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export function errMsg(e) {
  const m = (e && (e.message || e.details)) || String(e);
  if (/ex_agend_sem_conflito|conflicting key/.test(m)) return 'Já existe um agendamento nessa pista e horário.';
  if (/cliente_cpf_key/.test(m)) return 'Já existe um cliente com esse CPF.';
  if (/cliente_email_key/.test(m)) return 'Já existe um cliente com esse e-mail.';
  if (/pista_nome_key/.test(m)) return 'Já existe uma pista com esse nome.';
  if (/ck_servico_sem_estoque/.test(m)) return 'Serviços não têm estoque. Zere o saldo antes de converter o item em serviço.';
  if (/estoque_atual_check/.test(m)) return 'Estoque insuficiente para esta operação.';
  if (/row-level security|permission denied/.test(m)) return 'Seu perfil não tem permissão para esta ação.';
  if (/Failed to fetch|NetworkError/.test(m)) return 'Sem conexão com o Supabase. Verifique a internet e a URL do projeto.';
  if (/Invalid login/.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/.test(m)) return 'Confirme seu e-mail antes de entrar.';
  if (/already registered/.test(m)) return 'Este e-mail já tem conta. Use "Entrar".';
  return m;
}
