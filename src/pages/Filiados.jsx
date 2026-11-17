import { useState } from 'react';
import { Avatar, Empty, Icon, Load, Modal, PageTitle, Tag } from '../components/ui';
import { useApp } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { getClient, q, errMsg } from '../lib/supabase';
import { FORMAS, addMonths, brl, cod, dmy, monthLabel, monthStart, ymd } from '../lib/utils';

/** Situação exibida: mensalidade pendente com vencimento passado conta como atrasada. */
const sitMens = m => (m.situacao === 'paga' ? 'paga' : m.vencimento < ymd() ? 'atrasada' : 'pendente');
const TONE = { paga: ['Paga', 'ok'], pendente: ['Pendente', 'warn'], atrasada: ['Atrasada', 'bad'] };

export default function Filiados() {
  const { cfg, toast, refresh } = useApp();
  const [comp, setComp] = useState(monthStart(ymd()));
  const [sel, setSel] = useState(null);
  const [filiar, setFiliar] = useState(false);
  const [receber, setReceber] = useState(null);
  const [busy, setBusy] = useState(false);

  const st = useAsync(async () => {
    const db = getClient();
    const [clientes, mens] = await Promise.all([
      q(db.from('cliente').select('id,nome,tipo,situacao').order('nome')),
      q(db.from('mensalidade').select('*').eq('competencia', comp)),
    ]);
    return { clientes, mens };
  }, [comp]);

  async function gerar() {
    setBusy(true);
    try {
      const n = await q(getClient().rpc('gerar_mensalidades', { p_competencia: comp }));
      toast(n ? `${n} mensalidade${n > 1 ? 's' : ''} gerada${n > 1 ? 's' : ''}.` : 'Todas as mensalidades do mês já existem.', n ? 'ok' : '');
      refresh();
    } catch (e) { toast(errMsg(e), 'bad'); } finally { setBusy(false); }
  }

  return (
    <Load st={st}>
      {({ clientes, mens }) => {
        const fil = clientes.filter(c => c.tipo === 'filiado');
        const ativos = fil.filter(c => c.situacao === 'ativo');
        const mapa = Object.fromEntries(mens.map(m => [m.cliente_id, m]));
        const pagas = mens.filter(m => m.situacao === 'paga');
        const abertas = mens.filter(m => m.situacao !== 'paga');
        const recebido = pagas.reduce((s, m) => s + Number(m.valor), 0);
        const aReceber = abertas.reduce((s, m) => s + Number(m.valor), 0);
        const atual = sel && fil.find(c => c.id === sel);
        const candidatos = clientes.filter(c => c.tipo === 'avulso' && c.situacao === 'ativo');
        return (
          <>
            <PageTitle title="Filiados" sub="Pista gratuita, desconto no consumo e mensalidade." />
            <div className="btns">
              <button className="btn pri" onClick={() => setFiliar(true)}><Icon name="plus" />Filiar cliente</button>
              <button className="btn" disabled={busy} onClick={gerar}><Icon name="receipt" />Gerar mensalidades do mês</button>
            </div>

            <div className="box ok">
              <b>Benefícios do filiado</b>
              <span>Pista gratuita · {cfg.desconto_filiado_pct ?? 15}% de desconto em munição, alvos e acessórios · mensalidade de {brl(cfg.valor_mensalidade ?? 120)}.</span>
            </div>

            <div className="kpis">
              <div className="kpi"><div className="t">Filiados ativos<span className="ico ok"><Icon name="check" size={18} /></span></div><b>{ativos.length}</b><small>Com benefícios aplicados</small></div>
              <div className="kpi"><div className="t">Recebido no mês<span className="ico"><Icon name="bag" size={18} /></span></div><b>{brl(recebido)}</b><small>{pagas.length} mensalidade{pagas.length === 1 ? '' : 's'} paga{pagas.length === 1 ? '' : 's'}</small></div>
              <div className="kpi span2"><div className="t">A receber<span className="ico warn"><Icon name="clock" size={18} /></span></div><b>{brl(aReceber)}</b><small>{abertas.length} em aberto · {abertas.filter(m => sitMens(m) === 'atrasada').length} atrasada(s)</small></div>
            </div>

            <div className="card stackc">
              <div className="daynav">
                <button className="ib" onClick={() => setComp(addMonths(comp, -1))} aria-label="Mês anterior"><Icon name="left" /></button>
                <b>{monthLabel(comp)}</b>
                <button className="ib" onClick={() => setComp(addMonths(comp, 1))} aria-label="Próximo mês"><Icon name="right" /></button>
              </div>
              <div className="list">
                {fil.map(c => {
                  const m = mapa[c.id];
                  const s = m && sitMens(m);
                  return (
                    <button key={c.id} className="row" onClick={() => setSel(c.id)}>
                      <Avatar nome={c.nome} />
                      <span className="grow">
                        <span className="nm" style={{ display: 'block' }}>{c.nome}</span>
                        <span className="mt">{cod(c.id)}{c.situacao !== 'ativo' ? ' · inativo' : ''}{m ? ` · vence ${dmy(m.vencimento)}` : ''}</span>
                      </span>
                      {m ? <><b>{brl(m.valor)}</b><Tag tone={TONE[s][1]}>{TONE[s][0]}</Tag></> : <Tag tone="gray">Sem cobrança</Tag>}
                    </button>
                  );
                })}
                {!fil.length && <Empty>Nenhum filiado ainda. Use “Filiar cliente”.</Empty>}
              </div>
            </div>

            {atual && <FiliadoModal c={atual} onClose={() => setSel(null)} onReceber={setReceber} />}
            {filiar && <FiliarModal candidatos={candidatos} onClose={() => setFiliar(false)} />}
            {receber && <ReceberModal m={receber} onClose={() => setReceber(null)} />}
          </>
        );
      }}
    </Load>
  );
}

function FiliadoModal({ c, onClose, onReceber }) {
  const { toast, refresh } = useApp();
  const st = useAsync(() => q(getClient().from('mensalidade').select('*').eq('cliente_id', c.id).order('competencia', { ascending: false }).limit(8)), [c.id]);

  async function desfiliar() {
    if (!window.confirm(`Remover a filiação de ${c.nome}? Os benefícios deixam de ser aplicados.`)) return;
    try {
      await q(getClient().from('cliente').update({ tipo: 'avulso' }).eq('id', c.id));
      toast('Filiação removida.', 'ok');
      refresh();
      onClose();
    } catch (e) { toast(errMsg(e), 'bad'); }
  }

  return (
    <Modal title={c.nome} sub={`${cod(c.id)} · Filiado`} onClose={onClose} foot={<button className="btn bad" onClick={desfiliar}>Remover filiação</button>}>
      <h4 className="sec-t" style={{ marginTop: 0 }}>Mensalidades</h4>
      <Load st={st}>
        {ms => (
          <div className="list">
            {ms.map(m => {
              const s = sitMens(m);
              return (
                <div className="row" key={m.id}>
                  <span className="grow"><span className="nm" style={{ display: 'block' }}>{monthLabel(m.competencia)}</span><span className="mt">Vence {dmy(m.vencimento)}{m.pago_em ? ` · paga em ${dmy(m.pago_em)}` : ''}</span></span>
                  <b>{brl(m.valor)}</b>
                  {s === 'paga' ? <Tag tone="ok">Paga</Tag> : <button className="btn sm ok" onClick={() => { onClose(); onReceber(m); }}>Receber</button>}
                </div>
              );
            })}
            {!ms.length && <Empty>Sem mensalidades geradas.</Empty>}
          </div>
        )}
      </Load>
    </Modal>
  );
}

function FiliarModal({ candidatos, onClose }) {
  const { toast, refresh } = useApp();
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await q(getClient().from('cliente').update({ tipo: 'filiado' }).eq('id', +id));
      toast('Cliente filiado!', 'ok');
      refresh();
      onClose();
    } catch (er) { toast(errMsg(er), 'bad'); } finally { setBusy(false); }
  }
  return (
    <Modal title="Filiar cliente" sub="O cliente passa a ter pista gratuita e desconto automático no caixa." onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit" form="f-fil" disabled={busy || !id}>Filiar</button></>}>
      <form id="f-fil" className="fg" onSubmit={submit}>
        <label>Cliente avulso
          <select className="inp" required value={id} onChange={e => setId(e.target.value)}>
            <option value="">Selecione</option>
            {candidatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      </form>
    </Modal>
  );
}

function ReceberModal({ m, onClose }) {
  const { toast, refresh } = useApp();
  const [forma, setForma] = useState('pix');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await q(getClient().rpc('pagar_mensalidade', { p_id: m.id, p_forma: forma }));
      toast('Mensalidade recebida.', 'ok');
      refresh();
      onClose();
    } catch (er) { toast(errMsg(er), 'bad'); } finally { setBusy(false); }
  }
  return (
    <Modal title="Receber mensalidade" sub={`${monthLabel(m.competencia)} · ${brl(m.valor)}`} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn ok" type="submit" form="f-rec" disabled={busy}><Icon name="check" />Confirmar recebimento</button></>}>
      <form id="f-rec" className="fg" onSubmit={submit}>
        <label>Forma de pagamento
          <select className="inp" value={forma} onChange={e => setForma(e.target.value)}>
            {Object.entries(FORMAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </form>
    </Modal>
  );
}
