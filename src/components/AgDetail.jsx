import { useState } from 'react';
import { Icon, Modal, Tag } from './ui';
import { agTags } from './AgRow';
import { useApp, ADM, ATD, CLI, INS } from '../lib/ctx';
import { getClient, q, errMsg } from '../lib/supabase';
import { SIT_AG, brl, hm, longDay, ymd } from '../lib/utils';
import { go } from '../lib/router';

const TONE = { agendado: '', cancelado: 'bad', no_show: 'bad', concluido: 'gray' };

/** Detalhe do agendamento com todas as ações (check-in, cancelar, remarcar, no-show, caixa). */
export default function AgDetail({ ag: a, onClose, asClient }) {
  const { me, cfg, toast, refresh, setComanda } = useApp();
  const db = getClient();
  const [mode, setMode] = useState('view');
  const [busy, setBusy] = useState(false);
  const [rem, setRem] = useState({ data: ymd(new Date(a.inicio)), hora: hm(a.inicio) });

  const staff = me.role !== CLI && !asClient;
  const edit = staff && (me.role === ADM || me.role === ATD);
  const ativo = a.situacao === 'agendado';
  const futuro = new Date(a.fim) > new Date();
  const dur = Math.round((new Date(a.fim) - new Date(a.inicio)) / 60000);
  const horas = cfg.antecedencia_cancelamento_horas ?? 2;

  async function act(fn, okMsg, tone = 'ok') {
    setBusy(true);
    try {
      await fn();
      toast(okMsg, tone);
      refresh();
      onClose();
    } catch (e) {
      toast(errMsg(e), 'bad');
    } finally {
      setBusy(false);
    }
  }

  const checkin = () => act(() => q(db.rpc('realizar_checkin', { p_id: a.id })), 'Check-in realizado. Documentação conferida.');
  const concluir = () => act(() => q(db.from('agendamento').update({ situacao: 'concluido' }).eq('id', a.id)), 'Atendimento concluído.');
  const noShow = () => act(() => q(db.rpc('marcar_no_show', { p_id: a.id })), 'No-show registrado. Taxa não reembolsada.', '');
  const cancelar = () => {
    if (!window.confirm(`Cancelar este agendamento? Com menos de ${horas}h de antecedência a taxa de reserva não é reembolsada.`)) return;
    act(async () => {
      const r = await q(db.rpc('cancelar_agendamento', { p_id: a.id }));
      toast(r.reembolso_taxa ? 'Taxa de reserva reembolsável.' : 'Taxa não reembolsável (fora da antecedência).', '');
    }, 'Agendamento cancelado.');
  };
  const lancarCaixa = () => {
    setComanda({
      items: [], cliente: String(a.cliente_id), ag: a.id, arma: !!a.usa_arma_propria, forma: 'pix',
      seedHoras: Math.round(((new Date(a.fim) - new Date(a.inicio)) / 3600000) * 100) / 100,
    });
    onClose();
    go('caixa');
  };
  const remarcar = e => {
    e.preventDefault();
    const ini = new Date(`${rem.data}T${rem.hora}:00-03:00`);
    const fim = new Date(ini.getTime() + (new Date(a.fim) - new Date(a.inicio)));
    act(
      () => q(db.rpc('remarcar_agendamento', { p_id: a.id, p_novo_inicio: ini.toISOString(), p_novo_fim: fim.toISOString() })),
      'Agendamento remarcado.'
    );
  };

  if (mode === 'remarcar') {
    return (
      <Modal
        title="Remarcar agendamento"
        sub={`Exige ${horas}h de antecedência. A duração é mantida.`}
        onClose={onClose}
        foot={
          <>
            <button className="btn" onClick={() => setMode('view')}>Voltar</button>
            <button className="btn pri" type="submit" form="f-rem" disabled={busy}>Confirmar</button>
          </>
        }
      >
        <form id="f-rem" className="fg" onSubmit={remarcar}>
          <div className="g2">
            <label>Data<input className="inp" type="date" required value={rem.data} onChange={e => setRem({ ...rem, data: e.target.value })} /></label>
            <label>Horário<input className="inp" type="time" required value={rem.hora} onChange={e => setRem({ ...rem, hora: e.target.value })} /></label>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal title={a.cliente?.nome || 'Agendamento'} sub={`${longDay(ymd(new Date(a.inicio)))} · ${hm(a.inicio)} — ${hm(a.fim)}`} onClose={onClose}>
      <div className="box">
        <div className="l"><span>Situação</span><Tag tone={TONE[a.situacao]}>{SIT_AG[a.situacao]}{a.checkin_em && ativo ? ' · check-in feito' : ''}</Tag></div>
        <div className="l"><span>Pista</span><b>{a.pista?.nome}</b></div>
        <div className="l"><span>Duração</span><b>{dur} min</b></div>
        <div className="l"><span>Modalidade</span><b>{agTags(a)}</b></div>
        {a.instrutor?.nome && <div className="l"><span>Instrutor</span><b>{a.instrutor.nome}</b></div>}
        <div className="l"><span>Arma/munição própria</span><b>{a.usa_arma_propria ? 'Sim' : 'Não'}</b></div>
        <div className="l"><span>Taxa de reserva</span><b>{brl(a.taxa_reserva)}</b></div>
        {a.reembolso_taxa != null && <div className="l"><span>Taxa</span><b>{a.reembolso_taxa ? 'Reembolsável' : 'Não reembolsável'}</b></div>}
      </div>
      <div className="btns" style={{ marginTop: 14 }}>
        {ativo && edit && !a.checkin_em && <button className="btn ok" disabled={busy} onClick={checkin}><Icon name="check" />Check-in</button>}
        {ativo && edit && <button className="btn pri" disabled={busy} onClick={lancarCaixa}><Icon name="bag" />Lançar no caixa</button>}
        {ativo && edit && a.checkin_em && <button className="btn" disabled={busy} onClick={concluir}>Concluir</button>}
        {ativo && futuro && me.role !== INS && (
          <>
            <button className="btn" disabled={busy} onClick={() => setMode('remarcar')}>Remarcar</button>
            <button className="btn bad" disabled={busy} onClick={cancelar}>Cancelar</button>
          </>
        )}
        {ativo && !futuro && edit && <button className="btn bad" disabled={busy} onClick={noShow}>Marcar no-show</button>}
      </div>
    </Modal>
  );
}
