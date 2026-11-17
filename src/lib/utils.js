export const TZ = 'America/Sao_Paulo';

export const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl0 = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
export const num = n => Number(n || 0).toLocaleString('pt-BR');
export const pad = n => String(n).padStart(2, '0');
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

/* ---------- datas (sempre no fuso de Brasília) ---------- */
export const ymd = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
export const addDays = (s, n) => {
  const d = new Date(s + 'T12:00:00-03:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const dayStart = s => new Date(s + 'T00:00:00-03:00');
export const dayEnd = s => new Date(addDays(s, 1) + 'T00:00:00-03:00');
export const hm = d =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d));
export const dmy = d =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00-03:00') : new Date(d)
  );
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const shortDay = s => s.slice(8) + ' ' + MES[+s.slice(5, 7) - 1];
export const longDay = s =>
  cap(new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(s + 'T12:00:00-03:00')));
export const monthStart = s => s.slice(0, 7) + '-01';
export const addMonths = (s, n) => {
  const [y, m] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
};
export const monthLabel = s =>
  cap(new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(s + 'T12:00:00Z')));

/* ---------- textos ---------- */
export const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const cod = id => 'CLI-' + String(id).padStart(4, '0');
export const dig = v => String(v || '').replace(/\D/g, '');
export const maskCpf = c => {
  const d = dig(c);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : c || '—';
};
export const niceMax = m => {
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  return Math.ceil(m / p) * p;
};

/* ---------- domínio ---------- */
export const ROLE = { administrador: 'Administrador', atendente: 'Atendente', instrutor: 'Instrutor', cliente: 'Cliente' };
export const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito' };
export const CAT = {
  municao: ['Munição', 'box'],
  alvo: ['Alvo', 'target'],
  protecao: ['Proteção', 'shield'],
  acessorio: ['Acessório', 'wrench'],
  arma_aluguel: ['Arma de aluguel', 'target'],
  aula: ['Aula', 'user'],
  hora_pista: ['Hora de pista', 'clock'],
};
export const TIPO_DE = {
  municao: 'produto', alvo: 'produto', protecao: 'produto', acessorio: 'produto',
  arma_aluguel: 'servico', aula: 'servico', hora_pista: 'servico',
};
export const SIT_AG = { agendado: 'Agendado', cancelado: 'Cancelado', no_show: 'No-show', concluido: 'Concluído' };

/** RN02: preço unitário conforme a modalidade do cliente (espelha o trigger do banco). */
export function precoItem(p, tipoCliente, cfg) {
  if (tipoCliente === 'filiado') {
    if (p.categoria === 'hora_pista') return 0;
    if (['municao', 'alvo', 'acessorio'].includes(p.categoria))
      return Math.round(p.preco * (1 - (cfg.desconto_filiado_pct ?? 15) / 100) * 100) / 100;
  }
  return Number(p.preco);
}

export function downloadCSV(nome, linhas) {
  const csv = linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}
