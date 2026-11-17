import { useState } from 'react';
import { Empty, Icon, Load, Modal, PageTitle, Search, Switch, Tag } from '../components/ui';
import { useApp } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { getClient, q, errMsg } from '../lib/supabase';
import { CAT, TIPO_DE, brl, num } from '../lib/utils';

const CATS = [['todos', 'Todos'], ...Object.entries(CAT).map(([k, v]) => [k, v[0]])];

export default function Catalogo() {
  const [cat, setCat] = useState('todos');
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(null); // null | 'novo' | item

  const st = useAsync(async () => {
    const db = getClient();
    const [itens, equip] = await Promise.all([
      q(db.from('produto_servico').select('*').order('nome')),
      q(db.from('equipamento').select('id,descricao,tipo').order('descricao')),
    ]);
    return { itens, equip };
  }, []);

  return (
    <Load st={st}>
      {({ itens, equip }) => {
        const f = itens.filter(i => (cat === 'todos' || i.categoria === cat) && (!busca || i.nome.toLowerCase().includes(busca.toLowerCase())));
        return (
          <>
            <PageTitle title="Catálogo" sub="Produtos e serviços vendidos no estande." />
            <button className="btn pri start" onClick={() => setForm('novo')}><Icon name="plus" />Novo item</button>
            <div className="card stackc">
              <Search value={busca} onChange={setBusca} placeholder="Buscar item do catálogo" />
              <div className="chips">
                {CATS.map(([k, l]) => <button key={k} className={'chip' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>{l}</button>)}
              </div>
              <div className="list">
                {f.map(i => (
                  <button key={i.id} className="row" onClick={() => setForm(i)}>
                    <span className="ico"><Icon name={CAT[i.categoria][1]} size={18} /></span>
                    <span className="grow">
                      <span className="nm" style={{ display: 'block' }}>{i.nome}</span>
                      <span className="mt">{CAT[i.categoria][0]} · {i.tipo === 'produto' ? `${num(i.estoque_atual)} em estoque` : 'Serviço'}</span>
                    </span>
                    {!i.ativo && <Tag tone="gray">Inativo</Tag>}
                    <span className="rt">{brl(i.preco)}<small>/{i.unidade}</small></span>
                  </button>
                ))}
                {!f.length && <Empty>Nenhum item encontrado.</Empty>}
              </div>
            </div>
            {form && <ItemForm item={form === 'novo' ? null : form} equip={equip} onClose={() => setForm(null)} />}
          </>
        );
      }}
    </Load>
  );
}

function ItemForm({ item, equip, onClose }) {
  const { me, toast, refresh } = useApp();
  const novo = !item;
  const [f, setF] = useState({
    nome: item?.nome || '', categoria: item?.categoria || 'municao', preco: item?.preco ?? '', unidade: item?.unidade || 'un',
    minimo: item?.estoque_minimo ?? 0, inicial: '', equip: item?.equipamento_id || '', ativo: item?.ativo ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const tipo = TIPO_DE[f.categoria];

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const db = getClient();
      const row = {
        nome: f.nome.trim(), categoria: f.categoria, tipo, preco: Number(f.preco), unidade: f.unidade.trim() || 'un',
        estoque_minimo: tipo === 'produto' ? Number(f.minimo) || 0 : 0,
        equipamento_id: f.categoria === 'arma_aluguel' && f.equip ? +f.equip : null, ativo: f.ativo,
      };
      if (novo) {
        const criado = await q(db.from('produto_servico').insert(row).select().single());
        const ini = Number(f.inicial);
        if (tipo === 'produto' && ini > 0)
          await q(db.from('movimentacao_estoque').insert({ produto_servico_id: criado.id, tipo: 'entrada', quantidade: ini, usuario_id: me.id, observacao: 'Estoque inicial' }));
      } else {
        await q(db.from('produto_servico').update(row).eq('id', item.id));
      }
      toast('Item salvo.', 'ok');
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
      title={novo ? 'Novo item' : 'Editar item'}
      sub="Itens inativos deixam de aparecer no caixa, mas o histórico é mantido."
      onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit" form="f-item" disabled={busy}>Salvar</button></>}
    >
      <form id="f-item" className="fg" onSubmit={submit}>
        <label>Nome<input className="inp" required value={f.nome} onChange={set('nome')} /></label>
        <div className="g2">
          <label>Categoria
            <select className="inp" value={f.categoria} onChange={set('categoria')}>
              {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
            </select>
          </label>
          <label>Tipo<input className="inp" disabled value={tipo === 'produto' ? 'Produto (com estoque)' : 'Serviço'} /></label>
        </div>
        <div className="g2">
          <label>Preço (R$)<input className="inp" type="number" step="0.01" min="0" required value={f.preco} onChange={set('preco')} /></label>
          <label>Unidade<input className="inp" value={f.unidade} onChange={set('unidade')} placeholder="un, cx, h…" /></label>
        </div>
        {tipo === 'produto' && (
          <div className="g2">
            <label>Estoque mínimo<input className="inp" type="number" min="0" step="1" value={f.minimo} onChange={set('minimo')} /></label>
            {novo && <label>Estoque inicial<input className="inp" type="number" min="0" step="1" value={f.inicial} onChange={set('inicial')} placeholder="0" /></label>}
          </div>
        )}
        {f.categoria === 'arma_aluguel' && (
          <label>Equipamento vinculado
            <select className="inp" value={f.equip} onChange={set('equip')}>
              <option value="">Nenhum</option>
              {equip.map(e => <option key={e.id} value={e.id}>{e.descricao} ({e.tipo})</option>)}
            </select>
            <small>Se o equipamento entrar em manutenção, o aluguel é bloqueado automaticamente.</small>
          </label>
        )}
        <div className="tg"><b style={{ fontSize: 14 }}>Item ativo</b><Switch checked={f.ativo} onChange={v => setF(s => ({ ...s, ativo: v }))} /></div>
      </form>
    </Modal>
  );
}
