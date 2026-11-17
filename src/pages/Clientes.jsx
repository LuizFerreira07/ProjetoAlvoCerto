import { useState } from 'react';
import { Avatar, Empty, Icon, Load, Modal, PageTitle, Search, Seg, Tag } from '../components/ui';
import { useApp, ADM, ATD } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { getClient, q, errMsg } from '../lib/supabase';
import { SIT_AG, brl, cod, dig, dmy, hm, initials, maskCpf } from '../lib/utils';

const RegChip = ({ c }) =>
  c.situacao !== 'ativo' ? <Tag tone="gray">Inativo</Tag> : c.motivo ? <Tag tone="warn">Pendente</Tag> : <Tag tone="ok">Em dia</Tag>;

export default function Clientes({ params }) {
  const { me, openNovoAg } = useApp();
  const [filtro, setFiltro] = useState(params.get('f') || 'todos');
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(null); // null | 'novo' | cliente
  const edit = me.role === ADM || me.role === ATD;

  const st = useAsync(() => q(getClient().from('vw_clientes_situacao').select('*').order('nome')), []);

  return (
    <Load st={st}>
      {list => {
        const ativos = list.filter(c => c.situacao === 'ativo');
        const pend = ativos.filter(c => c.motivo).length;
        const qd = dig(busca);
        const f = list.filter(
          c =>
            (filtro === 'todos' || (filtro === 'fil' && c.tipo === 'filiado') || (filtro === 'avu' && c.tipo === 'avulso') || (filtro === 'pend' && c.situacao === 'ativo' && c.motivo)) &&
            (!busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || cod(c.id).toLowerCase().includes(busca.toLowerCase()) || (qd && c.cpf.includes(qd)))
        );
        return (
          <>
            <PageTitle title="Clientes" sub="Relacionamento próximo. Documentação sempre em dia." />
            {edit && <button className="btn pri start" onClick={() => setForm('novo')}><Icon name="user" />Novo cliente</button>}
            <div className="kpis">
              <div className="kpi"><div className="t">Clientes ativos<span className="ico"><Icon name="users" size={18} /></span></div><b>{ativos.length}</b><small>Avulsos e filiados cadastrados</small></div>
              <div className="kpi"><div className="t">Filiados<span className="ico ok"><Icon name="check" size={18} /></span></div><b>{ativos.filter(c => c.tipo === 'filiado').length}</b><small>Benefícios aplicados automaticamente</small></div>
              <div className="kpi span2"><div className="t">Documentação pendente<span className="ico warn"><Icon name="alert" size={18} /></span></div><b>{pend}</b><small>Acesso bloqueado até regularização</small></div>
            </div>
            <div className="card stackc">
              <Search value={busca} onChange={setBusca} placeholder="Buscar por nome, CPF ou código" />
              <Seg options={[['todos', 'Todos'], ['fil', 'Filiados'], ['avu', 'Avulsos'], ['pend', 'Pendências']]} value={filtro} onChange={setFiltro} />
              <div className="list">
                {f.map(c => (
                  <button key={c.id} className="row" onClick={() => setSel(c)}>
                    <Avatar nome={c.nome} />
                    <span className="grow">
                      <span className="nm" style={{ display: 'block' }}>{c.nome}</span>
                      <span className="mt">{cod(c.id)} · {c.tipo === 'filiado' ? 'Filiado' : 'Avulso'}</span>
                    </span>
                    <RegChip c={c} /><Icon name="right" size={18} />
                  </button>
                ))}
                {!f.length && <Empty>Nenhum cliente encontrado.</Empty>}
              </div>
            </div>
            {sel && (
              <ClienteDetalhe
                c={sel} edit={edit} onClose={() => setSel(null)}
                onEdit={() => { setForm(sel); setSel(null); }}
                onAgendar={() => { openNovoAg({ clienteId: sel.id }); setSel(null); }}
              />
            )}
            {form && <ClienteForm c={form === 'novo' ? null : form} onClose={() => setForm(null)} />}
          </>
        );
      }}
    </Load>
  );
}

function ClienteDetalhe({ c, edit, onClose, onEdit, onAgendar }) {
  const st = useAsync(async () => {
    const db = getClient();
    const [ags, vds] = await Promise.all([
      q(db.from('agendamento').select('*,pista(nome)').eq('cliente_id', c.id).order('inicio', { ascending: false }).limit(8)),
      q(db.from('venda').select('id,data_hora,total,situacao').eq('cliente_id', c.id).order('data_hora', { ascending: false }).limit(8)),
    ]);
    return { ags, vds };
  }, [c.id]);

  return (
    <Modal
      title={c.nome}
      sub={`${cod(c.id)} · ${c.tipo === 'filiado' ? 'Filiado' : 'Avulso'}`}
      onClose={onClose}
      foot={edit && (
        <>
          <button className="btn" onClick={onEdit}><Icon name="edit" />Editar</button>
          <button className="btn pri" onClick={onAgendar}><Icon name="cal" />Agendar</button>
        </>
      )}
    >
      {c.situacao === 'ativo'
        ? c.motivo ? <div className="box bad"><b>Atendimento bloqueado</b><span>{c.motivo}</span></div> : <div className="box ok">Documentação em dia.</div>
        : <div className="box warn">Cadastro inativo.</div>}
      <div className="box" style={{ marginTop: 12 }}>
        <div className="l"><span>CPF</span><b>{maskCpf(c.cpf)}</b></div>
        <div className="l"><span>RG</span><b>{c.rg || '—'}</b></div>
        <div className="l"><span>Nascimento</span><b>{dmy(c.data_nascimento)}</b></div>
        <div className="l"><span>Telefone</span><b>{c.telefone || '—'}</b></div>
        <div className="l"><span>E-mail</span><b>{c.email || '—'}</b></div>
        <div className="l"><span>Certidão emitida em</span><b>{c.data_certidao ? dmy(c.data_certidao) : '—'}</b></div>
        <div className="l"><span>CR</span><b>{c.cr_numero ? `${c.cr_numero} · val. ${c.cr_validade ? dmy(c.cr_validade) : '—'}` : '—'}</b></div>
      </div>
      <h4 className="sec-t">Histórico de agendamentos</h4>
      <Load st={st}>
        {({ ags, vds }) => (
          <>
            <div className="list">
              {ags.map(a => (
                <div className="row" key={a.id}>
                  <span className="grow"><span className="nm" style={{ display: 'block' }}>{dmy(a.inicio)} · {hm(a.inicio)}–{hm(a.fim)}</span><span className="mt">{a.pista?.nome}</span></span>
                  <Tag tone={a.situacao === 'concluido' ? 'gray' : a.situacao === 'agendado' ? '' : 'bad'}>{SIT_AG[a.situacao]}</Tag>
                </div>
              ))}
              {!ags.length && <Empty>Sem agendamentos.</Empty>}
            </div>
            <h4 className="sec-t">Histórico de compras</h4>
            <div className="list">
              {vds.map(v => (
                <div className="row" key={v.id}>
                  <span className="grow"><span className="nm" style={{ display: 'block' }}>Venda #{v.id}</span><span className="mt">{dmy(v.data_hora)} · {hm(v.data_hora)}</span></span>
                  <b>{brl(v.total)}</b>
                </div>
              ))}
              {!vds.length && <Empty>Sem compras.</Empty>}
            </div>
          </>
        )}
      </Load>
    </Modal>
  );
}

function ClienteForm({ c, onClose }) {
  const { toast, refresh } = useApp();
  const e0 = !!c;
  const [f, setF] = useState({
    nome: c?.nome || '', cpf: c?.cpf || '', rg: c?.rg || '', nasc: c?.data_nascimento || '', tel: c?.telefone || '',
    email: c?.email || '', tipo: c?.tipo || 'avulso', sit: c?.situacao || 'ativo', cert: c?.data_certidao || '',
    crn: c?.cr_numero || '', crv: c?.cr_validade || '',
  });
  const [busy, setBusy] = useState(false);
  const set = k => ev => setF(s => ({ ...s, [k]: ev.target.value }));

  async function submit(ev) {
    ev.preventDefault();
    setBusy(true);
    try {
      if (dig(f.cpf).length !== 11) throw new Error('CPF deve ter 11 números.');
      const row = {
        nome: f.nome.trim(), cpf: dig(f.cpf), rg: f.rg.trim() || null, data_nascimento: f.nasc, telefone: f.tel || null,
        email: f.email.trim() || null, tipo: f.tipo, situacao: f.sit, data_certidao: f.cert || null,
        cr_numero: f.crn.trim() || null, cr_validade: f.crv || null,
      };
      const db = getClient();
      if (e0) await q(db.from('cliente').update(row).eq('id', c.id));
      else await q(db.from('cliente').insert(row));
      toast('Cliente salvo.', 'ok');
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
      title={e0 ? 'Editar cliente' : 'Novo cliente'}
      sub="RG, CPF, certidão e CR (quando aplicável) liberam o acesso à pista."
      onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit" form="f-cli" disabled={busy}>Salvar</button></>}
    >
      <form id="f-cli" className="fg" onSubmit={submit}>
        <label>Nome completo<input className="inp" required value={f.nome} onChange={set('nome')} /></label>
        <div className="g2">
          <label>CPF<input className="inp" required inputMode="numeric" value={f.cpf} onChange={set('cpf')} /></label>
          <label>RG<input className="inp" value={f.rg} onChange={set('rg')} /></label>
        </div>
        <div className="g2">
          <label>Nascimento<input className="inp" type="date" required value={f.nasc} onChange={set('nasc')} /></label>
          <label>Telefone<input className="inp" type="tel" value={f.tel} onChange={set('tel')} /></label>
        </div>
        <label>E-mail<input className="inp" type="email" value={f.email} onChange={set('email')} /><small>O cliente usa o mesmo e-mail para acessar o app.</small></label>
        <div className="g2">
          <label>Modalidade
            <select className="inp" value={f.tipo} onChange={set('tipo')}><option value="avulso">Avulso</option><option value="filiado">Filiado</option></select>
          </label>
          <label>Situação
            <select className="inp" value={f.sit} onChange={set('sit')}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="bloqueado">Bloqueado</option></select>
          </label>
        </div>
        <label>Certidão de antecedentes — data de emissão<input className="inp" type="date" value={f.cert} onChange={set('cert')} /></label>
        <div className="g2">
          <label>CR — número<input className="inp" value={f.crn} onChange={set('crn')} /></label>
          <label>CR — validade<input className="inp" type="date" value={f.crv} onChange={set('crv')} /></label>
        </div>
      </form>
    </Modal>
  );
}
