import { useState } from 'react';
import { Empty, Icon, Load, Modal, PageTitle, Seg, Tag } from '../components/ui';
import { useApp } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { getClient, q, errMsg } from '../lib/supabase';
import { brl, dmy, ymd } from '../lib/utils';

const SIT_EQ = { operacional: ['Operacional', 'ok'], em_manutencao: ['Manutenção', 'warn'], baixado: ['Baixado', 'gray'] };
const TIPOS_EQ = ['Pistola', 'Revólver', 'Carabina', 'Equipamento de pista', 'Outro'];

export default function Pistas() {
  const [tab, setTab] = useState('pistas');
  const [pistaForm, setPistaForm] = useState(null);
  const [eqForm, setEqForm] = useState(null);
  const [manut, setManut] = useState(false);

  const st = useAsync(async () => {
    const db = getClient();
    const [pistas, equip, hist] = await Promise.all([
      q(db.from('pista').select('*').order('id')),
      q(db.from('equipamento').select('*,pista(nome)').order('descricao')),
      q(db.from('manutencao').select('*,equipamento(descricao),pista(nome)').order('data_manutencao', { ascending: false }).order('id', { ascending: false }).limit(15)),
    ]);
    return { pistas, equip, hist };
  }, []);

  return (
    <Load st={st}>
      {({ pistas, equip, hist }) => (
        <>
          <PageTitle title="Pistas e equipamentos" sub="Pista em manutenção não recebe agendamentos nem aluguel." />
          <div className="btns">
            <button className="btn pri" onClick={() => (tab === 'pistas' ? setPistaForm('novo') : setEqForm('novo'))}>
              <Icon name="plus" />{tab === 'pistas' ? 'Nova pista' : 'Novo equipamento'}
            </button>
            <button className="btn" onClick={() => setManut(true)}><Icon name="wrench" />Registrar manutenção</button>
          </div>
          <Seg options={[['pistas', 'Pistas'], ['equip', 'Equipamentos'], ['manut', 'Manutenções']]} value={tab} onChange={setTab} />

          {tab === 'pistas' && (
            <div className="pcards big">
              {pistas.map(p => (
                <button key={p.id} className="pc" style={{ textAlign: 'left' }} onClick={() => setPistaForm(p)}>
                  <div className="between"><b>{p.nome}</b><Tag tone={p.situacao === 'ativa' ? 'ok' : 'warn'}>{p.situacao === 'ativa' ? 'Ativa' : 'Manutenção'}</Tag></div>
                  <span className="mt">{p.descricao || 'Sem descrição'}</span>
                  <b style={{ color: 'var(--pri)' }}>{brl(p.valor_hora)}<span className="mt"> / hora</span></b>
                </button>
              ))}
              {!pistas.length && <Empty>Nenhuma pista cadastrada.</Empty>}
            </div>
          )}

          {tab === 'equip' && (
            <div className="card">
              <div className="list">
                {equip.map(e => (
                  <button key={e.id} className="row" onClick={() => setEqForm(e)}>
                    <span className="ico"><Icon name="target" size={18} /></span>
                    <span className="grow"><span className="nm" style={{ display: 'block' }}>{e.descricao}</span><span className="mt">{e.tipo}{e.pista?.nome ? ` · ${e.pista.nome}` : ''}</span></span>
                    <Tag tone={SIT_EQ[e.situacao][1]}>{SIT_EQ[e.situacao][0]}</Tag>
                  </button>
                ))}
                {!equip.length && <Empty>Nenhum equipamento cadastrado.</Empty>}
              </div>
            </div>
          )}

          {tab === 'manut' && (
            <div className="card">
              <div className="list">
                {hist.map(h => (
                  <div className="row" key={h.id}>
                    <span className="ico warn"><Icon name="wrench" size={18} /></span>
                    <span className="grow"><span className="nm" style={{ display: 'block' }}>{h.equipamento?.descricao || h.pista?.nome}</span><span className="mt">{h.observacoes || 'Sem observações'}</span></span>
                    <span className="rt">{dmy(h.data_manutencao)}</span>
                  </div>
                ))}
                {!hist.length && <Empty>Nenhuma manutenção registrada.</Empty>}
              </div>
            </div>
          )}

          {pistaForm && <PistaForm p={pistaForm === 'novo' ? null : pistaForm} onClose={() => setPistaForm(null)} />}
          {eqForm && <EquipForm e={eqForm === 'novo' ? null : eqForm} pistas={pistas} onClose={() => setEqForm(null)} />}
          {manut && <ManutForm pistas={pistas} equip={equip} onClose={() => setManut(false)} />}
        </>
      )}
    </Load>
  );
}

function useSave(onClose, okMsg) {
  const { toast, refresh } = useApp();
  const [busy, setBusy] = useState(false);
  const save = async fn => {
    setBusy(true);
    try { await fn(); toast(okMsg, 'ok'); refresh(); onClose(); }
    catch (er) { toast(errMsg(er), 'bad'); }
    finally { setBusy(false); }
  };
  return [busy, save];
}

function PistaForm({ p, onClose }) {
  const [busy, save] = useSave(onClose, 'Pista salva.');
  const [f, setF] = useState({ nome: p?.nome || '', desc: p?.descricao || '', valor: p?.valor_hora ?? '', sit: p?.situacao || 'ativa' });
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const submit = e => {
    e.preventDefault();
    save(() => {
      const row = { nome: f.nome.trim(), descricao: f.desc.trim() || null, valor_hora: Number(f.valor), situacao: f.sit };
      const t = getClient().from('pista');
      return q(p ? t.update(row).eq('id', p.id) : t.insert(row));
    });
  };
  return (
    <Modal title={p ? 'Editar pista' : 'Nova pista'} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit" form="f-pista" disabled={busy}>Salvar</button></>}>
      <form id="f-pista" className="fg" onSubmit={submit}>
        <label>Nome<input className="inp" required value={f.nome} onChange={set('nome')} /></label>
        <label>Descrição<input className="inp" value={f.desc} onChange={set('desc')} placeholder="Ex.: Pista de 25 m" /></label>
        <div className="g2">
          <label>Valor da hora (R$)<input className="inp" type="number" step="0.01" min="0" required value={f.valor} onChange={set('valor')} /></label>
          <label>Situação
            <select className="inp" value={f.sit} onChange={set('sit')}><option value="ativa">Ativa</option><option value="em_manutencao">Em manutenção</option></select>
          </label>
        </div>
      </form>
    </Modal>
  );
}

function EquipForm({ e, pistas, onClose }) {
  const [busy, save] = useSave(onClose, 'Equipamento salvo.');
  const [f, setF] = useState({ desc: e?.descricao || '', tipo: e?.tipo || TIPOS_EQ[0], pista: e?.pista_id || '', sit: e?.situacao || 'operacional' });
  const set = k => ev => setF(s => ({ ...s, [k]: ev.target.value }));
  const submit = ev => {
    ev.preventDefault();
    save(() => {
      const row = { descricao: f.desc.trim(), tipo: f.tipo, pista_id: f.pista ? +f.pista : null, situacao: f.sit };
      const t = getClient().from('equipamento');
      return q(e ? t.update(row).eq('id', e.id) : t.insert(row));
    });
  };
  return (
    <Modal title={e ? 'Editar equipamento' : 'Novo equipamento'} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit" form="f-eq" disabled={busy}>Salvar</button></>}>
      <form id="f-eq" className="fg" onSubmit={submit}>
        <label>Descrição<input className="inp" required value={f.desc} onChange={set('desc')} placeholder="Ex.: Pistola Taurus G2C 9mm" /></label>
        <div className="g2">
          <label>Tipo<select className="inp" value={f.tipo} onChange={set('tipo')}>{TIPOS_EQ.map(t => <option key={t}>{t}</option>)}</select></label>
          <label>Pista<select className="inp" value={f.pista} onChange={set('pista')}><option value="">Nenhuma</option>{pistas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
        </div>
        <label>Situação
          <select className="inp" value={f.sit} onChange={set('sit')}>{Object.entries(SIT_EQ).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
        </label>
      </form>
    </Modal>
  );
}

function ManutForm({ pistas, equip, onClose }) {
  const [busy, save] = useSave(onClose, 'Manutenção registrada.');
  const [f, setF] = useState({ alvo: 'equip', id: '', data: ymd(), obs: '', acao: 'manter' });
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const lista = f.alvo === 'equip' ? equip.map(e => [e.id, e.descricao]) : pistas.map(p => [p.id, p.nome]);
  const submit = e => {
    e.preventDefault();
    save(async () => {
      const db = getClient();
      if (!f.id) throw new Error('Selecione o item em manutenção.');
      await q(db.from('manutencao').insert({
        equipamento_id: f.alvo === 'equip' ? +f.id : null, pista_id: f.alvo === 'pista' ? +f.id : null,
        data_manutencao: f.data, observacoes: f.obs.trim() || null,
      }));
      if (f.acao !== 'manter') {
        const bloquear = f.acao === 'bloquear';
        if (f.alvo === 'equip') await q(db.from('equipamento').update({ situacao: bloquear ? 'em_manutencao' : 'operacional' }).eq('id', +f.id));
        else await q(db.from('pista').update({ situacao: bloquear ? 'em_manutencao' : 'ativa' }).eq('id', +f.id));
      }
    });
  };
  return (
    <Modal title="Registrar manutenção" sub="O histórico fica salvo e a disponibilidade pode ser atualizada." onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit" form="f-man" disabled={busy}>Registrar</button></>}>
      <form id="f-man" className="fg" onSubmit={submit}>
        <Seg options={[['equip', 'Equipamento'], ['pista', 'Pista']]} value={f.alvo} onChange={v => setF(s => ({ ...s, alvo: v, id: '' }))} />
        <label>{f.alvo === 'equip' ? 'Equipamento' : 'Pista'}
          <select className="inp" required value={f.id} onChange={set('id')}><option value="">Selecione</option>{lista.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label>Data<input className="inp" type="date" required value={f.data} onChange={set('data')} /></label>
        <label>Observações<input className="inp" value={f.obs} onChange={set('obs')} placeholder="O que foi feito / problema encontrado" /></label>
        <label>Disponibilidade
          <select className="inp" value={f.acao} onChange={set('acao')}>
            <option value="manter">Manter como está</option>
            <option value="bloquear">Colocar em manutenção (bloqueia uso)</option>
            <option value="liberar">Liberar para uso</option>
          </select>
        </label>
      </form>
    </Modal>
  );
}
