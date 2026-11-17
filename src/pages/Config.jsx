import { useState } from 'react';
import { Avatar, Empty, Icon, Load, Modal, PageTitle, Switch, Tag } from '../components/ui';
import { useApp } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { getClient, q, errMsg } from '../lib/supabase';
import { ROLE, dmy } from '../lib/utils';

const PARAMS = [
  ['desconto_filiado_pct', 'Desconto do filiado (%)', 'Munição, alvos e acessórios (RN02)', '0.5'],
  ['antecedencia_cancelamento_horas', 'Antecedência para cancelar (horas)', 'Abaixo disso a taxa não é reembolsada (RN03)', '1'],
  ['taxa_reserva_padrao', 'Taxa de reserva (R$)', 'Cobrada em cada agendamento', '0.01'],
  ['valor_mensalidade', 'Mensalidade do filiado (R$)', 'Usada ao gerar as mensalidades', '0.01'],
  ['idade_minima', 'Idade mínima (anos)', 'Exigida para frequentar a pista (RN01)', '1'],
  ['validade_certidao_dias', 'Validade da certidão (dias)', 'Prazo contado a partir da emissão (RN01)', '1'],
];

export default function Config() {
  const { cfg, reloadCfg, toast, me } = useApp();
  const [v, setV] = useState(() => Object.fromEntries(PARAMS.map(([k]) => [k, cfg[k] ?? ''])));
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(null);

  const contas = useAsync(() => q(getClient().rpc('listar_contas')), []);

  async function salvar(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const rows = PARAMS.map(([k, t]) => ({ chave: k, valor: Number(v[k]), descricao: t }));
      if (rows.some(r => !Number.isFinite(r.valor) || r.valor < 0)) throw new Error('Preencha todos os parâmetros com números válidos.');
      await q(getClient().from('configuracao').upsert(rows, { onConflict: 'chave' }));
      await reloadCfg();
      toast('Parâmetros salvos.', 'ok');
    } catch (er) { toast(errMsg(er), 'bad'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageTitle title="Configurações" sub="Regras do estande e acessos da equipe." />

      <form className="card fg" onSubmit={salvar}>
        <div><h3>Regras e valores</h3><p className="sub">Valem imediatamente para novas vendas e agendamentos.</p></div>
        {PARAMS.map(([k, t, d, step]) => (
          <label key={k}>{t}
            <input className="inp" type="number" min="0" step={step} required value={v[k]} onChange={e => setV(s => ({ ...s, [k]: e.target.value }))} />
            <small>{d}</small>
          </label>
        ))}
        <button className="btn pri blk" disabled={busy}><Icon name="check" />Salvar parâmetros</button>
      </form>

      <div className="card stackc">
        <div><h3>Usuários e acessos</h3><p className="sub">Quem criou conta pode ser liberado como equipe. Clientes não precisam de liberação.</p></div>
        <Load st={contas}>
          {lista => (
            <div className="list">
              {lista.map(c => (
                <button key={c.id} className="row" onClick={() => setSel(c)}>
                  <Avatar nome={c.email} />
                  <span className="grow"><span className="nm" style={{ display: 'block' }}>{c.email}</span><span className="mt">Criada em {dmy(c.criado_em)}{c.id === me.id ? ' · você' : ''}</span></span>
                  {c.perfil ? <Tag tone="">{ROLE[c.perfil]}</Tag> : c.eh_cliente ? <Tag tone="gray">Cliente</Tag> : <Tag tone="warn">Sem acesso</Tag>}
                </button>
              ))}
              {!lista.length && <Empty>Nenhuma conta encontrada.</Empty>}
            </div>
          )}
        </Load>
      </div>
      {sel && <ContaModal c={sel} self={sel.id === me.id} onClose={() => setSel(null)} />}
    </>
  );
}

function ContaModal({ c, self, onClose }) {
  const { toast, refresh } = useApp();
  const [f, setF] = useState({ nome: c.email.split('@')[0], perfil: c.perfil || 'atendente', ativo: true });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await q(getClient().rpc('promover_usuario', { p_id: c.id, p_nome: f.nome.trim(), p_perfil: f.perfil, p_ativo: f.ativo }));
      toast('Acesso atualizado.', 'ok');
      refresh();
      onClose();
    } catch (er) { toast(errMsg(er), 'bad'); } finally { setBusy(false); }
  }

  return (
    <Modal title={c.perfil ? 'Editar acesso' : 'Liberar acesso da equipe'} sub={c.email} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit" form="f-conta" disabled={busy}>Salvar</button></>}>
      {self && <div className="box warn" style={{ marginBottom: 12 }}>Esta é a sua conta. Para não perder o acesso de administrador, não altere o perfil nem desative.</div>}
      <form id="f-conta" className="fg" onSubmit={submit}>
        <label>Nome<input className="inp" required value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} /></label>
        <label>Perfil
          <select className="inp" value={f.perfil} disabled={self} onChange={e => setF({ ...f, perfil: e.target.value })}>
            <option value="administrador">Administrador</option><option value="atendente">Atendente</option><option value="instrutor">Instrutor</option>
          </select>
        </label>
        <div className="tg"><b style={{ fontSize: 14 }}>Acesso ativo</b><Switch checked={f.ativo} onChange={v => !self && setF({ ...f, ativo: v })} /></div>
      </form>
    </Modal>
  );
}
