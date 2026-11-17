import { useEffect, useState } from 'react';
import { Icon, Modal, Switch } from './ui';
import { useAsync } from '../lib/hooks';
import { useApp, CLI } from '../lib/ctx';
import { getClient, q, errMsg } from '../lib/supabase';
import { FORMAS, addDays, brl, hm, ymd } from '../lib/utils';

const DURACOES = [[30, '30 minutos'], [60, '60 minutos'], [90, '90 minutos'], [120, '120 minutos'], [180, '180 minutos']];

/**
 * Novo agendamento. Equipe escolhe o cliente; o cliente agenda para si mesmo.
 * `asClient` + `cliente` = pré-visualização da área do cliente pela equipe.
 */
export default function NovoAgendamento({ clienteId, asClient, cliente: fixedCli, onClose }) {
  const { me, cliente: myCli, cfg, toast, refresh } = useApp();
  const db = getClient();
  const staff = me.role !== CLI && !asClient;
  const own = staff ? null : fixedCli || myCli;
  const taxa = cfg.taxa_reserva_padrao ?? 25;
  const horas = cfg.antecedencia_cancelamento_horas ?? 2;
  const nx = new Date(Date.now() + 3600000);

  const [f, setF] = useState({
    cliente: staff ? (clienteId ? String(clienteId) : '') : String(own?.id || ''),
    data: ymd(nx), hora: hm(nx).slice(0, 2) + ':00', pista: '', dur: '60', instr: '', arma: false, forma: '',
  });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const [bq, setBq] = useState({ motivo: null, ok: false });
  const [busy, setBusy] = useState(false);

  const ref = useAsync(async () => {
    const [pistas, clientes, instr] = await Promise.all([
      q(db.from('pista').select('*').eq('situacao', 'ativa').order('id')),
      staff ? q(db.from('cliente').select('id,nome,tipo,situacao').eq('situacao', 'ativo').order('nome')) : Promise.resolve([own]),
      staff ? q(db.from('usuario').select('id,nome').eq('perfil', 'instrutor').eq('ativo', true)) : Promise.resolve([]),
    ]);
    return { pistas, clientes, instr };
  }, []);
  const { pistas = [], clientes = [], instr = [] } = ref.data || {};
  const pistaId = f.pista || String(pistas[0]?.id || '');
  const cli = clientes.find(c => String(c.id) === String(f.cliente));
  const pista = pistas.find(p => String(p.id) === pistaId);

  // RN01: confere documentação/idade enquanto o formulário muda
  useEffect(() => {
    if (!f.cliente || !f.data) { setBq({ motivo: null, ok: false }); return; }
    let dead = false;
    const t = setTimeout(async () => {
      try {
        const m = await q(db.rpc('motivo_bloqueio', { p_cliente: +f.cliente, p_data: f.data, p_arma_propria: f.arma }));
        if (!dead) setBq({ motivo: m, ok: !m });
      } catch {
        if (!dead) setBq({ motivo: null, ok: false });
      }
    }, 250);
    return () => { dead = true; clearTimeout(t); };
  }, [f.cliente, f.data, f.arma]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimativa = !pista ? '—' : cli?.tipo === 'filiado' ? 'Isento (filiado)' : brl((pista.valor_hora * f.dur) / 60);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (bq.motivo) throw new Error('Agendamento bloqueado pela documentação.');
      const ini = new Date(`${f.data}T${f.hora}:00-03:00`);
      const fim = new Date(ini.getTime() + f.dur * 60000);
      if (ini <= new Date()) throw new Error('Escolha um horário futuro.');
      const row = await q(
        db.from('agendamento').insert({
          cliente_id: +f.cliente, pista_id: +pistaId, instrutor_id: f.instr || null,
          inicio: ini.toISOString(), fim: fim.toISOString(), usa_arma_propria: f.arma, taxa_reserva: taxa,
        }).select().single()
      );
      if (staff && f.forma && taxa > 0)
        await q(db.from('pagamento').insert({ tipo: 'reserva', agendamento_id: row.id, cliente_id: +f.cliente, valor: taxa, forma: f.forma }));
      toast('Agendamento confirmado!', 'ok');
      refresh();
      onClose();
    } catch (er) {
      toast(errMsg(er), 'bad');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Novo agendamento"
      sub="Reserve uma pista ou uma aula. A documentação é conferida antes da confirmação."
      onClose={onClose}
      foot={
        <>
          <button className="btn" onClick={onClose}>Voltar</button>
          <button className="btn pri" type="submit" form="f-ag" disabled={busy || !!bq.motivo || !pista}>
            <Icon name="cal" />Confirmar agendamento
          </button>
        </>
      }
    >
      <form id="f-ag" className="fg" onSubmit={submit}>
        <label>Cliente
          <select className="inp" required disabled={!staff} value={f.cliente} onChange={e => set('cliente', e.target.value)}>
            <option value="">Selecione o cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <div className="g2">
          <label>Data<input className="inp" type="date" required min={ymd()} value={f.data} onChange={e => set('data', e.target.value)} /></label>
          <label>Horário<input className="inp" type="time" required value={f.hora} onChange={e => set('hora', e.target.value)} /></label>
        </div>
        <div className="btns">
          <button type="button" className="btn sm" onClick={() => set('data', ymd())}>Hoje</button>
          <button type="button" className="btn sm" onClick={() => set('data', addDays(ymd(), 1))}>Amanhã</button>
        </div>
        <div className="g2">
          <label>Pista
            <select className="inp" required value={pistaId} onChange={e => set('pista', e.target.value)}>
              {pistas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <label>Duração
            <select className="inp" value={f.dur} onChange={e => set('dur', e.target.value)}>
              {DURACOES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        {staff && (
          <label>Instrutor (opcional)
            <select className="inp" value={f.instr} onChange={e => set('instr', e.target.value)}>
              <option value="">Sem instrutor</option>
              {instr.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          </label>
        )}
        <div className="tg">
          <div>
            <b style={{ fontSize: 14 }}>Arma ou munição própria</b>
            <div className="sub" style={{ fontSize: 12 }}>Exige CR ativo e válido na data da reserva.</div>
          </div>
          <Switch checked={f.arma} onChange={v => set('arma', v)} />
        </div>
        {bq.motivo && <div className="box bad"><b>Agendamento bloqueado (RN01)</b><span>{bq.motivo}</span></div>}
        {bq.ok && <div className="box ok"><span><Icon name="check" size={18} /> Documentação e idade conferidas.</span></div>}
        <div className="box">
          <div className="l"><span>Estimativa de uso da pista</span><b>{estimativa}</b></div>
          <div className="l"><span>Taxa de reserva</span><b style={{ color: 'var(--pri)' }}>{brl(taxa)}</b></div>
          <div className="sub" style={{ fontSize: 12 }}>
            Cancelamentos com menos de {horas}h de antecedência ou no-show não têm reembolso da taxa.
          </div>
        </div>
        {staff && (
          <label>Taxa de reserva paga agora?
            <select className="inp" value={f.forma} onChange={e => set('forma', e.target.value)}>
              <option value="">Cobrar depois</option>
              {Object.entries(FORMAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
      </form>
    </Modal>
  );
}
