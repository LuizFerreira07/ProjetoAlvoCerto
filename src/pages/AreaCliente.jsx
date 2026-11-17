import { useState } from 'react';
import { Empty, Icon, Load, PageTitle, Seg, Tag } from '../components/ui';
import AgRow from '../components/AgRow';
import AgDetail from '../components/AgDetail';
import NovoAgendamento from '../components/NovoAgendamento';
import { useApp } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { getClient, q } from '../lib/supabase';
import { brl, cod, dmy, hm, maskCpf, monthLabel, ymd } from '../lib/utils';

/** Área do cliente: agenda própria, status da documentação e benefícios. */
export function MinhaAgenda({ cli, asClient }) {
  const [sel, setSel] = useState(null);
  const [novo, setNovo] = useState(false);
  const [aba, setAba] = useState('prox');

  const st = useAsync(async () => {
    const db = getClient();
    const [ags, status] = await Promise.all([
      q(db.from('agendamento').select('*,cliente(id,nome,tipo),pista(nome),instrutor:usuario(nome)').eq('cliente_id', cli.id).order('inicio', { ascending: false }).limit(40)),
      q(db.from('vw_clientes_situacao').select('motivo,situacao,tipo').eq('id', cli.id).maybeSingle()),
    ]);
    return { ags, status };
  }, [cli.id]);

  return (
    <Load st={st}>
      {({ ags, status }) => {
        const agora = new Date();
        const prox = ags.filter(a => a.situacao === 'agendado' && new Date(a.fim) > agora).reverse();
        const hist = ags.filter(a => !(a.situacao === 'agendado' && new Date(a.fim) > agora));
        const lista = aba === 'prox' ? prox : hist;
        const primeiro = prox[0];
        return (
          <>
            <PageTitle eyebrow={`Olá, ${cli.nome.split(' ')[0]}`} title="Minha agenda" sub="Reserve sua pista e acompanhe seus horários." />

            {status?.situacao !== 'ativo' ? (
              <div className="box warn"><b>Cadastro {status?.situacao || 'inativo'}</b><span>Procure a recepção do estande para regularizar.</span></div>
            ) : status?.motivo ? (
              <div className="box bad"><b>Documentação pendente</b><span>{status.motivo}. Leve o documento à recepção para liberar seus agendamentos.</span></div>
            ) : (
              <div className="box ok"><span><Icon name="check" size={18} /> Documentação em dia. Você já pode agendar.</span></div>
            )}

            <button className="btn pri start" onClick={() => setNovo(true)}><Icon name="plus" />Novo agendamento</button>

            {primeiro && (
              <div className="card hero">
                <div className="eyebrow" style={{ color: '#fff', opacity: 0.8 }}>Próximo horário</div>
                <div className="big" style={{ color: '#fff' }}>{dmy(primeiro.inicio)} · {hm(primeiro.inicio)}</div>
                <p className="sub">{primeiro.pista?.nome} · {Math.round((new Date(primeiro.fim) - new Date(primeiro.inicio)) / 60000)} min</p>
                <button className="btn sm" style={{ marginTop: 12 }} onClick={() => setSel(primeiro)}>Ver detalhes</button>
              </div>
            )}

            <div className="card stackc">
              <Seg options={[['prox', `Próximos (${prox.length})`], ['hist', 'Histórico']]} value={aba} onChange={setAba} />
              <div className="list">
                {lista.map(a => <AgRow key={a.id} a={a} showStatus showDate onOpen={setSel} />)}
                {!lista.length && <Empty>{aba === 'prox' ? 'Nenhum horário marcado. Que tal agendar?' : 'Sem histórico ainda.'}</Empty>}
              </div>
            </div>

            {sel && <AgDetail ag={sel} asClient onClose={() => setSel(null)} />}
            {novo && <NovoAgendamento asClient cliente={cli} onClose={() => setNovo(false)} />}
          </>
        );
      }}
    </Load>
  );
}

export function MeuPerfil({ cli }) {
  const { cfg } = useApp();
  const st = useAsync(async () => {
    const db = getClient();
    const [c, mens, vendas] = await Promise.all([
      q(db.from('vw_clientes_situacao').select('*').eq('id', cli.id).single()),
      q(db.from('mensalidade').select('*').eq('cliente_id', cli.id).order('competencia', { ascending: false }).limit(6)),
      q(db.from('venda').select('id,data_hora,total').eq('cliente_id', cli.id).eq('situacao', 'paga').order('data_hora', { ascending: false }).limit(8)),
    ]);
    return { c, mens, vendas };
  }, [cli.id]);

  return (
    <Load st={st}>
      {({ c, mens, vendas }) => (
        <>
          <PageTitle title="Meu perfil" sub={`${cod(c.id)} · ${c.tipo === 'filiado' ? 'Filiado' : 'Cliente avulso'}`} />
          {c.tipo === 'filiado' && (
            <div className="box ok">
              <b>Benefícios de filiado</b>
              <span>Pista gratuita e {cfg.desconto_filiado_pct ?? 15}% de desconto em munição, alvos e acessórios.</span>
            </div>
          )}
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Meus dados</h3>
            <div className="box">
              <div className="l"><span>Nome</span><b>{c.nome}</b></div>
              <div className="l"><span>CPF</span><b>{maskCpf(c.cpf)}</b></div>
              <div className="l"><span>Nascimento</span><b>{dmy(c.data_nascimento)}</b></div>
              <div className="l"><span>Telefone</span><b>{c.telefone || '—'}</b></div>
              <div className="l"><span>E-mail</span><b>{c.email || '—'}</b></div>
            </div>
          </div>
          <div className="card">
            <div className="hd"><h3>Documentação</h3>{c.motivo ? <Tag tone="warn">Pendente</Tag> : <Tag tone="ok">Em dia</Tag>}</div>
            {c.motivo && <div className="box bad" style={{ marginBottom: 12 }}>{c.motivo}</div>}
            <div className="box">
              <div className="l"><span>RG</span><b>{c.rg || 'não informado'}</b></div>
              <div className="l"><span>Certidão de antecedentes</span><b>{c.data_certidao ? `emitida em ${dmy(c.data_certidao)}` : 'não entregue'}</b></div>
              <div className="l"><span>CR</span><b>{c.cr_numero ? `${c.cr_numero} · val. ${c.cr_validade ? dmy(c.cr_validade) : '—'}` : 'não informado'}</b></div>
            </div>
            <p className="sub" style={{ marginTop: 10, fontSize: 12 }}>Documentos são conferidos e atualizados pela recepção.</p>
          </div>
          {c.tipo === 'filiado' && (
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>Mensalidades</h3>
              <div className="list">
                {mens.map(m => {
                  const s = m.situacao === 'paga' ? ['Paga', 'ok'] : m.vencimento < ymd() ? ['Atrasada', 'bad'] : ['Pendente', 'warn'];
                  return (
                    <div className="row" key={m.id}>
                      <span className="grow"><span className="nm" style={{ display: 'block' }}>{monthLabel(m.competencia)}</span><span className="mt">Vence {dmy(m.vencimento)}</span></span>
                      <b>{brl(m.valor)}</b><Tag tone={s[1]}>{s[0]}</Tag>
                    </div>
                  );
                })}
                {!mens.length && <Empty>Nenhuma mensalidade gerada.</Empty>}
              </div>
            </div>
          )}
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Minhas compras</h3>
            <div className="list">
              {vendas.map(v => (
                <div className="row" key={v.id}>
                  <span className="grow"><span className="nm" style={{ display: 'block' }}>Compra #{v.id}</span><span className="mt">{dmy(v.data_hora)} · {hm(v.data_hora)}</span></span>
                  <b>{brl(v.total)}</b>
                </div>
              ))}
              {!vendas.length && <Empty>Nenhuma compra ainda.</Empty>}
            </div>
          </div>
        </>
      )}
    </Load>
  );
}

export const MinhaAgendaPage = () => <MinhaAgenda cli={useApp().cliente} />;
export const MeuPerfilPage = () => <MeuPerfil cli={useApp().cliente} />;

/** Equipe: visualiza o app do cliente exatamente como ele vê. */
export function Preview() {
  const [id, setId] = useState('');
  const [aba, setAba] = useState('agenda');
  const st = useAsync(() => q(getClient().from('cliente').select('id,nome,tipo,situacao').eq('situacao', 'ativo').order('nome')), []);
  return (
    <>
      <PageTitle title="Área do cliente" sub="Veja o aplicativo do cliente como ele enxerga, sem sair da sua conta." />
      <Load st={st}>
        {clientes => {
          const cli = clientes.find(c => String(c.id) === id);
          return (
            <>
              <div className="card stackc">
                <label className="fg">Visualizar como
                  <select className="inp" value={id} onChange={e => setId(e.target.value)}>
                    <option value="">Selecione um cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
                {cli && <Seg options={[['agenda', 'Minha agenda'], ['perfil', 'Meu perfil']]} value={aba} onChange={setAba} />}
              </div>
              {cli ? (
                <div className="preview">
                  {aba === 'agenda' ? <MinhaAgenda key={cli.id} cli={cli} asClient /> : <MeuPerfil key={cli.id} cli={cli} />}
                </div>
              ) : (
                <Empty>Escolha um cliente para ver a área dele.</Empty>
              )}
            </>
          );
        }}
      </Load>
    </>
  );
}
