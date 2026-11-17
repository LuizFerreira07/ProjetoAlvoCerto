import { useState } from 'react';
import { Empty, Icon, Load, Modal, PageTitle, Search, Seg, Tag } from '../components/ui';
import { useApp } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { getClient, q, errMsg } from '../lib/supabase';
import { CAT, brl, dmy, hm, num } from '../lib/utils';

export default function Estoque() {
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState(null);

  const st = useAsync(() => q(getClient().from('produto_servico').select('*').eq('tipo', 'produto').order('nome')), []);

  return (
    <Load st={st}>
      {prods => {
        const ativos = prods.filter(p => p.ativo);
        const baixo = p => p.estoque_atual <= p.estoque_minimo;
        const nBaixo = ativos.filter(baixo).length;
        const valor = ativos.reduce((s, p) => s + p.estoque_atual * p.preco, 0);
        const f = prods.filter(p => (filtro === 'todos' || (p.ativo && baixo(p))) && (!busca || p.nome.toLowerCase().includes(busca.toLowerCase())));
        const atual = sel && prods.find(p => p.id === sel);
        return (
          <>
            <PageTitle title="Estoque" sub="Saldos em tempo real. A venda dá baixa automática." />
            <div className="kpis">
              <div className="kpi"><div className="t">Itens controlados<span className="ico"><Icon name="box" size={18} /></span></div><b>{ativos.length}</b><small>Produtos ativos no catálogo</small></div>
              <div className="kpi"><div className="t">Abaixo do mínimo<span className="ico warn"><Icon name="alert" size={18} /></span></div><b>{nBaixo}</b><small>Precisam de reposição</small></div>
              <div className="kpi span2"><div className="t">Valor em estoque<span className="ico ok"><Icon name="bag" size={18} /></span></div><b>{brl(valor)}</b><small>A preço de tabela</small></div>
            </div>
            <div className="card stackc">
              <Search value={busca} onChange={setBusca} placeholder="Buscar produto" />
              <Seg options={[['todos', 'Todos'], ['baixo', 'Estoque baixo']]} value={filtro} onChange={setFiltro} />
              <div className="list">
                {f.map(p => {
                  const b = p.ativo && baixo(p);
                  return (
                    <button key={p.id} className="row" onClick={() => setSel(p.id)}>
                      <span className={'ico' + (b ? ' warn' : '')}><Icon name={CAT[p.categoria][1]} size={18} /></span>
                      <span className="grow">
                        <span className="nm" style={{ display: 'block' }}>{p.nome}</span>
                        <span className="mt">Mínimo: {num(p.estoque_minimo)} {p.unidade}{!p.ativo ? ' · inativo' : ''}</span>
                        <span className="prog"><i style={{ width: Math.min(100, p.estoque_minimo ? (p.estoque_atual / p.estoque_minimo) * 100 : 100) + '%', background: b ? '#d9a066' : 'var(--ok)' }} /></span>
                      </span>
                      <span className="rt" style={{ color: b ? 'var(--warn)' : undefined }}>{num(p.estoque_atual)} {p.unidade}{b && <small>repor</small>}</span>
                    </button>
                  );
                })}
                {!f.length && <Empty>Nenhum produto encontrado.</Empty>}
              </div>
            </div>
            {atual && <Movimentar p={atual} onClose={() => setSel(null)} />}
          </>
        );
      }}
    </Load>
  );
}

function Movimentar({ p, onClose }) {
  const { me, toast, refresh } = useApp();
  const [tipo, setTipo] = useState('entrada');
  const [qtd, setQtd] = useState('');
  const [obs, setObs] = useState('');
  const [busy, setBusy] = useState(false);
  const hist = useAsync(
    () => q(getClient().from('movimentacao_estoque').select('id,tipo,quantidade,data,observacao,venda_id,usuario(nome)').eq('produto_servico_id', p.id).order('data', { ascending: false }).limit(12)),
    [p.id]
  );

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const n = Number(qtd);
      if (!(n > 0)) throw new Error('Informe uma quantidade maior que zero.');
      if (tipo === 'saida' && n > p.estoque_atual) throw new Error('Estoque insuficiente para esta saída.');
      await q(getClient().from('movimentacao_estoque').insert({ produto_servico_id: p.id, tipo, quantidade: n, usuario_id: me.id, observacao: obs.trim() || null }));
      toast(tipo === 'entrada' ? 'Entrada registrada.' : 'Saída registrada.', 'ok');
      setQtd(''); setObs('');
      refresh();
    } catch (er) {
      toast(errMsg(er), 'bad');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={p.nome} sub={`Saldo atual: ${num(p.estoque_atual)} ${p.unidade} · mínimo ${num(p.estoque_minimo)}`} onClose={onClose}>
      <form className="fg" onSubmit={submit}>
        <Seg options={[['entrada', 'Entrada (reposição)'], ['saida', 'Saída / ajuste']]} value={tipo} onChange={setTipo} />
        <div className="g2">
          <label>Quantidade<input className="inp" type="number" min="0" step="1" required value={qtd} onChange={e => setQtd(e.target.value)} /></label>
          <label>Observação<input className="inp" value={obs} onChange={e => setObs(e.target.value)} placeholder={tipo === 'entrada' ? 'Ex.: compra fornecedor' : 'Ex.: perda, avaria'} /></label>
        </div>
        <button className={'btn blk ' + (tipo === 'entrada' ? 'ok' : 'bad')} disabled={busy}>
          {tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída'}
        </button>
      </form>
      <h4 className="sec-t">Últimas movimentações</h4>
      <Load st={hist}>
        {ms => (
          <div className="list">
            {ms.map(m => (
              <div className="row" key={m.id}>
                <span className="grow">
                  <span className="nm" style={{ display: 'block' }}>{m.venda_id ? `Venda #${m.venda_id}` : m.observacao || (m.tipo === 'entrada' ? 'Entrada' : 'Saída')}</span>
                  <span className="mt">{dmy(m.data)} · {hm(m.data)}{m.usuario?.nome ? ` · ${m.usuario.nome}` : ''}</span>
                </span>
                <Tag tone={m.tipo === 'entrada' ? 'ok' : 'warn'}>{m.tipo === 'entrada' ? '+' : '−'}{num(m.quantidade)}</Tag>
              </div>
            ))}
            {!ms.length && <Empty>Sem movimentações.</Empty>}
          </div>
        )}
      </Load>
    </Modal>
  );
}
