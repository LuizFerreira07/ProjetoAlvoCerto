import { Avatar } from './ui';
import { SIT_AG, hm } from '../lib/utils';

export function agDot(a) {
  const now = new Date();
  if (a.situacao === 'cancelado' || a.situacao === 'no_show') return 'bad';
  if (a.situacao === 'concluido') return 'gray';
  if (a.checkin_em || (new Date(a.inicio) <= now && new Date(a.fim) > now)) return 'ok';
  return '';
}

export const agTags = a =>
  `${a.cliente?.tipo === 'filiado' ? 'Filiado' : 'Avulso'}${a.instrutor_id ? ' · Com instrutor' : ''}`;

export default function AgRow({ a, onOpen, showStatus, showDate }) {
  const dur = Math.round((new Date(a.fim) - new Date(a.inicio)) / 60000);
  const st = ['cancelado', 'no_show', 'concluido'].includes(a.situacao) ? SIT_AG[a.situacao] : null;
  return (
    <button className="row" onClick={() => onOpen(a)}>
      <Avatar nome={a.cliente?.nome} />
      <span className="grow">
        <span className="nm" style={{ display: 'block' }}>{a.cliente?.nome || 'Cliente'}</span>
        <span className="mt">{agTags(a)}{showStatus && st ? ' · ' + st : ''}</span>
      </span>
      <span className="rt">
        {showDate ? new Date(a.inicio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }) + ' · ' : ''}
        {hm(a.inicio)} — {hm(a.fim)}
        <small>{dur} min · {a.pista?.nome || ''}</small>
      </span>
      <span className={'sd ' + agDot(a)} />
    </button>
  );
}
