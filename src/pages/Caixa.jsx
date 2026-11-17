import { useEffect, useState } from 'react';
import { Empty, Icon, Load, Modal, PageTitle, Search, Seg, Switch } from '../components/ui';
import { useApp } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { getClient, q, errMsg } from '../lib/supabase';
import { CAT, FORMAS, brl, dayEnd, dayStart, hm, num, precoItem, ymd } from '../lib/utils';

const CATS = [['todos', 'Todos os itens'], ['municao', 'Munições'], ['alvo', 'Alvos'], ['protecao', 'Proteção'], ['acessorio', 'Acessórios'], ['arma_aluguel', 'Armas'], ['aula', 'Aulas'], ['hora_pista', 'Pista']];
const passo = p => (p.categoria === 'hora_pista' ? 0.5 : 1);

export default function Caixa() {
  const { comanda: C, setComanda, resetComanda, cfg, toast, refresh } = useApp();
  const [tab, setTab] = useState(C.items.length || C.seedHoras ? 'cmd' : 'itens');
  const [cat, setCat] = useState('todos');
  const [busca, setBusca] = useState('');
  const [hoje, setHoje] = useState(false);
  const [busy, setBusy] = useState(false);

  const st = useAsync(async () => {
    const db = getClient();
    const [prods, clientes] = await Promise.all([
      q(db.from('produto_servico').select('*').eq('ativo', true).order('nome')),
      q(db.from('vw_clientes_situacao').select('id,nome,tipo,situacao,motivo').eq('situacao', 'ativo').order('nome')),
    ]);
    return { prods, clientes };
  }, []);

  // vindo da agenda ("Lançar no caixa"): já coloca as horas de pista na comanda
  useEffect(() => {
    if (!st.data || !C.seedHoras) return;
    const h = st.data.prods.find(p => p.categoria === 'hora_pista');
    setComanda(c => ({
      ...c, seedHoras: null,
      items: h && !c.items.some(i => i.id === h.id) ? [...c.items, { id: h.id, qtd: c.seedHoras }] : c.items,
    }));
  }, [st.data, C.seedHoras]); // eslint-disable-line react-hooks/exhaustive-deps

  const setItems = fn => setComanda(c => ({ ...c, items: fn(c.items) }));

  return (
    <Load st={st}>
      {({ prods, clientes }) => {
        const cli = clientes.find(c => String(c.id) === String(C.cliente));
        const tipo = cli?.tipo;
        const prod = id => prods.find(p => p.id === id);

        function add(p) {
          const it = C.items.find(i => i.id === p.id);
          const qtd = (it ? it.qtd : 0) + (it ? passo(p) : 1);
          if (p.tipo === 'produto' && qtd > p.estoque_atual) return toast('Estoque insuficiente para este item.', 'bad');
          setItems(l => (it ? l.map(i => (i.id === p.id ? { ...i, qtd } : i)) : [...l, { id: p.id, qtd: 1 }]));
          toast(`${p.nome} adicionado à comanda.`);
        }
        function alterar(p, d) {
          const it = C.items.find(i => i.id === p.id);
          const qtd = it.qtd + d * passo(p);
          if (qtd <= 0) return setItems(l => l.filter(i => i.id !== p.id));
          if (p.tipo === 'produto' && qtd > p.estoque_atual) return toast('Estoque insuficiente.', 'bad');
          setItems(l => l.map(i => (i.id === p.id ? { ...i, qtd } : i)));
        }

        const linhas = C.items.map(it => ({ it, p: prod(it.id) })).filter(l => l.p).map(l => ({ ...l, pr: precoItem(l.p, tipo, cfg) }));
        const tab$ = linhas.reduce((s, l) => s + l.p.preco * l.it.qtd, 0);
        const tot = linhas.reduce((s, l) => s + l.pr * l.it.qtd, 0);
        const temPista = linhas.some(l => ['hora_pista', 'aula'].includes(l.p.categoria));

        async function finalizar() {
          setBusy(true);
          try {
            if (!C.cliente) throw new Error('Selecione o cliente da venda.');
            const id = await q(getClient().rpc('finalizar_venda', {
              p_cliente: +C.cliente, p_itens: C.items.map(i => ({ id: i.id, qtd: i.qtd })),
              p_forma: C.forma, p_agendamento: C.ag, p_arma_propria: C.arma,
            }));
            toast(`Venda #${id} registrada: ${brl(tot)}`, 'ok');
            resetComanda();
            setTab('itens');
            refresh();
          } catch (e) {
            toast(errMsg(e), 'bad');
          } finally {
            setBusy(false);
          }
        }

        const filtrados = prods.filter(p => (cat === 'todos' || p.categoria === cat) && (!busca || p.nome.toLowerCase().includes(busca.toLowerCase())));

        return (
          <>
            <PageTitle title="Caixa e vendas" sub="Um atendimento ágil, do primeiro item ao pagamento." />
            <button className="btn start" onClick={() => setHoje(true)}><Icon name="receipt" />Vendas de hoje</button>

            <div className="card">
              <div style={{ marginBottom: 14 }}>
                <Seg options={[['itens', 'Produtos e serviços'], ['cmd', `Comanda (${C.items.length})`]]} value={tab} onChange={setTab} />
              </div>

              {tab === 'itens' ? (
                <div className="stackc">
                  <Search value={busca} onChange={setBusca} placeholder="Buscar produtos e serviços" />
                  <div className="chips">
                    {CATS.map(([k, l]) => <button key={k} className={'chip' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>{l}</button>)}
                  </div>
                  <div className="prods">
                    {filtrados.map(p => {
                      const off = p.tipo === 'produto' && p.estoque_atual <= 0;
                      const pr = precoItem(p, tipo, cfg);
                      return (
                        <button key={p.id} className={'prod' + (off ? ' off' : '')} onClick={() => add(p)}>
                          <span className="plus"><Icon name="plus" size={18} /></span>
                          <span className="ico"><Icon name={CAT[p.categoria][1]} size={18} /></span>
                          <b>{p.nome}</b>
                          <small>{p.tipo === 'produto' ? `${num(p.estoque_atual)} un. em estoque` : CAT[p.categoria][0]}</small>
                          <span className="pr">{pr === 0 && tipo === 'filiado' ? 'Isento' : brl(pr)} <small>/{p.unidade}</small></span>
                        </button>
                      );
                    })}
                    {!filtrados.length && <Empty>Nenhum item encontrado.</Empty>}
                  </div>
                </div>
              ) : (
                <div className="fg">
                  <label>Cliente
                    <select className="inp" value={C.cliente} onChange={e => setComanda(c => ({ ...c, cliente: e.target.value }))}>
                      <option value="">Selecione o cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}{c.motivo ? '  (pendência)' : ''}</option>)}
                    </select>
                  </label>
                  {cli?.motivo && <div className="box bad"><b>Serviços de pista bloqueados (RN01)</b><span>{cli.motivo}</span></div>}
                  {tipo === 'filiado' && <div className="box ok">Filiado: pista isenta e desconto em munição, alvos e acessórios.</div>}

                  <div className="list">
                    {linhas.map(({ it, p, pr }) => (
                      <div className="row" key={p.id}>
                        <span className="grow"><span className="nm" style={{ display: 'block' }}>{p.nome}</span><span className="mt">{pr === 0 ? 'Isento' : brl(pr)} / {p.unidade}</span></span>
                        <span className="step">
                          <button onClick={() => alterar(p, -1)} aria-label="Diminuir"><Icon name="minus" size={16} /></button>
                          <span>{num(it.qtd)}</span>
                          <button onClick={() => alterar(p, 1)} aria-label="Aumentar"><Icon name="plus" size={16} /></button>
                        </span>
                        <b style={{ minWidth: 70, textAlign: 'right' }}>{brl(pr * it.qtd)}</b>
                        <button style={{ color: 'var(--bad)' }} onClick={() => setItems(l => l.filter(i => i.id !== p.id))} aria-label="Remover"><Icon name="trash" size={18} /></button>
                      </div>
                    ))}
                    {!linhas.length && <Empty>A comanda está vazia. Volte e adicione itens.</Empty>}
                  </div>

                  {temPista && (
                    <div className="tg">
                      <div><b style={{ fontSize: 14 }}>Arma ou munição própria</b><div className="sub" style={{ fontSize: 12 }}>Exige CR ativo e válido.</div></div>
                      <Switch checked={C.arma} onChange={v => setComanda(c => ({ ...c, arma: v }))} />
                    </div>
                  )}

                  <div className="box">
                    <div className="l"><span>Subtotal (tabela)</span><span>{brl(tab$)}</span></div>
                    <div className="l"><span>Desconto da modalidade</span><span>− {brl(tab$ - tot)}</span></div>
                    <div className="l" style={{ fontSize: 18 }}><b>Total</b><b>{brl(tot)}</b></div>
                  </div>
                  <label>Forma de pagamento
                    <select className="inp" value={C.forma} onChange={e => setComanda(c => ({ ...c, forma: e.target.value }))}>
                      {Object.entries(FORMAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <button className="btn ok blk" disabled={!linhas.length || busy} onClick={finalizar}><Icon name="check" />Finalizar venda</button>
                  {linhas.length > 0 && <button className="btn blk" onClick={resetComanda}>Limpar comanda</button>}
                </div>
              )}
            </div>
            {hoje && <VendasHoje onClose={() => setHoje(false)} />}
          </>
        );
      }}
    </Load>
  );
}

function VendasHoje({ onClose }) {
  const st = useAsync(() => {
    const t = ymd();
    return q(getClient().from('venda').select('id,data_hora,total,forma_pagamento,situacao,cliente(nome)')
      .gte('data_hora', dayStart(t).toISOString()).lt('data_hora', dayEnd(t).toISOString()).order('data_hora', { ascending: false }));
  }, []);
  const total = (st.data || []).filter(v => v.situacao === 'paga').reduce((s, v) => s + Number(v.total), 0);
  return (
    <Modal title="Vendas de hoje" sub={st.data ? `${st.data.length} venda${st.data.length === 1 ? '' : 's'} · ${brl(total)}` : ''} onClose={onClose}>
      <Load st={st}>
        {vs => (
          <div className="list">
            {vs.map(v => (
              <div className="row" key={v.id}>
                <span className="grow"><span className="nm" style={{ display: 'block' }}>#{v.id} · {v.cliente?.nome}</span><span className="mt">{hm(v.data_hora)} · {FORMAS[v.forma_pagamento] || '—'} · {v.situacao}</span></span>
                <b>{brl(v.total)}</b>
              </div>
            ))}
            {!vs.length && <Empty>Nenhuma venda hoje.</Empty>}
          </div>
        )}
      </Load>
    </Modal>
  );
}
