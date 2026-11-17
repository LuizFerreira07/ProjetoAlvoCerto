import { useState } from 'react';
import { BarChart, Empty, Icon, Load, PageTitle, Seg } from '../components/ui';
import { useAsync } from '../lib/hooks';
import { getClient, q } from '../lib/supabase';
import { CAT, FORMAS, addDays, brl, brl0, dayEnd, dayStart, dmy, downloadCSV, hm, num, shortDay, ymd } from '../lib/utils';

const ORIGEM = { venda: 'Vendas', reserva: 'Taxas de reserva', mensalidade: 'Mensalidades' };

function intervalo(range, de, ate) {
  const hoje = ymd();
  if (range === 'hoje') return [hoje, hoje];
  if (range === '7d') return [addDays(hoje, -6), hoje];
  if (range === 'mes') return [hoje.slice(0, 7) + '-01', hoje];
  return [de || hoje, ate || hoje];
}

function Barras({ linhas, total }) {
  return (
    <div className="stackc" style={{ gap: 12 }}>
      {linhas.map(([nome, v]) => (
        <div key={nome}>
          <div className="between"><span>{nome}</span><b>{brl(v)}</b></div>
          <div className="hbar"><i style={{ width: (total ? (v / total) * 100 : 0) + '%' }} /></div>
        </div>
      ))}
      {!linhas.length && <Empty>Sem dados no período.</Empty>}
    </div>
  );
}

export default function Relatorios() {
  const [range, setRange] = useState('mes');
  const [de, setDe] = useState(addDays(ymd(), -30));
  const [ate, setAte] = useState(ymd());
  const [ini, fim] = intervalo(range, de, ate);

  const st = useAsync(async () => {
    const db = getClient();
    const a = dayStart(ini).toISOString(), b = dayEnd(fim).toISOString();
    const [vendas, pags, ags] = await Promise.all([
      q(db.from('venda').select('id,data_hora,total,desconto,forma_pagamento,cliente(nome,tipo),item_venda(quantidade,subtotal,produto_servico(nome,categoria))')
        .eq('situacao', 'paga').gte('data_hora', a).lt('data_hora', b).order('data_hora')),
      q(db.from('pagamento').select('tipo,forma,valor,pago_em').gte('pago_em', a).lt('pago_em', b)),
      q(db.from('agendamento').select('situacao').gte('inicio', a).lt('inicio', b)),
    ]);
    return { vendas, pags, ags };
  }, [ini, fim]);

  return (
    <>
      <PageTitle title="Relatórios" sub="Faturamento por modalidade, categoria e forma de pagamento." />
      <div className="card stackc">
        <Seg options={[['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Mês'], ['custom', 'Período']]} value={range} onChange={setRange} />
        {range === 'custom' && (
          <div className="g2">
            <label className="fg">De<input className="inp" type="date" value={de} max={ate} onChange={e => setDe(e.target.value)} /></label>
            <label className="fg">Até<input className="inp" type="date" value={ate} min={de} max={ymd()} onChange={e => setAte(e.target.value)} /></label>
          </div>
        )}
        <div className="sub" style={{ fontSize: 12 }}>{ini === fim ? dmy(ini) : `${dmy(ini)} a ${dmy(fim)}`}</div>
      </div>

      <Load st={st}>
        {({ vendas, pags, ags }) => {
          const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
          const receita = soma(pags, p => Number(p.valor));
          const totalVendas = soma(vendas, v => Number(v.total));
          const ticket = vendas.length ? totalVendas / vendas.length : 0;
          const descontos = soma(vendas, v => Number(v.desconto));

          const agrupa = (arr, chave, val) => {
            const m = {};
            arr.forEach(x => { const k = chave(x); m[k] = (m[k] || 0) + val(x); });
            return Object.entries(m).sort((a, b) => b[1] - a[1]);
          };
          const itens = vendas.flatMap(v => v.item_venda.map(i => ({ ...i, tipoCli: v.cliente?.tipo })));
          const porTipo = agrupa(vendas, v => (v.cliente?.tipo === 'filiado' ? 'Filiados' : 'Avulsos'), v => Number(v.total));
          const porCat = agrupa(itens, i => CAT[i.produto_servico?.categoria]?.[0] || 'Outros', i => Number(i.subtotal));
          const porForma = agrupa(pags, p => FORMAS[p.forma], p => Number(p.valor));
          const porOrigem = agrupa(pags, p => ORIGEM[p.tipo], p => Number(p.valor));
          const top = agrupa(itens, i => i.produto_servico?.nome || '—', i => Number(i.subtotal)).slice(0, 5);

          const porDia = {};
          pags.forEach(p => { const d = ymd(new Date(p.pago_em)); porDia[d] = (porDia[d] || 0) + Number(p.valor); });
          const dias = [];
          for (let d = ini; d <= fim && dias.length < 92; d = addDays(d, 1)) dias.push({ d, v: porDia[d] || 0 });

          const cont = s => ags.filter(a => a.situacao === s).length;

          const exportar = () =>
            downloadCSV(`vendas_${ini}_a_${fim}.csv`, [
              ['Venda', 'Data', 'Hora', 'Cliente', 'Modalidade', 'Forma de pagamento', 'Desconto', 'Total'],
              ...vendas.map(v => [v.id, dmy(v.data_hora), hm(v.data_hora), v.cliente?.nome, v.cliente?.tipo, FORMAS[v.forma_pagamento], Number(v.desconto).toFixed(2), Number(v.total).toFixed(2)]),
            ]);

          return (
            <>
              <div className="kpis">
                <div className="kpi"><div className="t">Receita recebida<span className="ico"><Icon name="bag" size={18} /></span></div><b>{brl(receita)}</b><small>Vendas, reservas e mensalidades</small></div>
                <div className="kpi"><div className="t">Vendas no caixa<span className="ico ok"><Icon name="receipt" size={18} /></span></div><b>{vendas.length}</b><small>{brl(totalVendas)} faturados</small></div>
                <div className="kpi"><div className="t">Ticket médio<span className="ico"><Icon name="chart" size={18} /></span></div><b>{brl(ticket)}</b><small>Por venda</small></div>
                <div className="kpi"><div className="t">Descontos concedidos<span className="ico warn"><Icon name="users" size={18} /></span></div><b>{brl(descontos)}</b><small>Benefícios de filiados</small></div>
              </div>

              <div className="card">
                <div className="hd"><div><h3>Receita por dia</h3><p className="sub">Pagamentos recebidos no período</p></div></div>
                <BarChart series={dias.length ? dias : [{ d: ini, v: 0 }]} fmt={brl0} labelOf={shortDay} />
              </div>

              <div className="cols2">
                <div className="card"><h3 style={{ marginBottom: 12 }}>Faturamento por modalidade</h3><Barras linhas={porTipo} total={totalVendas} /></div>
                <div className="card"><h3 style={{ marginBottom: 12 }}>Faturamento por categoria</h3><Barras linhas={porCat} total={soma(itens, i => Number(i.subtotal))} /></div>
                <div className="card"><h3 style={{ marginBottom: 12 }}>Recebido por forma de pagamento</h3><Barras linhas={porForma} total={receita} /></div>
                <div className="card"><h3 style={{ marginBottom: 12 }}>Recebido por origem</h3><Barras linhas={porOrigem} total={receita} /></div>
              </div>

              <div className="cols2">
                <div className="card">
                  <h3 style={{ marginBottom: 8 }}>Itens mais vendidos</h3>
                  <table className="tbl"><tbody>
                    {top.map(([n, v], i) => <tr key={n}><td>{i + 1}. {n}</td><td>{brl(v)}</td></tr>)}
                    {!top.length && <tr><td colSpan={2}>Sem vendas no período.</td></tr>}
                  </tbody></table>
                </div>
                <div className="card">
                  <h3 style={{ marginBottom: 8 }}>Agendamentos</h3>
                  <table className="tbl"><tbody>
                    <tr><td>Total</td><td>{num(ags.length)}</td></tr>
                    <tr><td>Concluídos</td><td>{cont('concluido')}</td></tr>
                    <tr><td>Aguardando</td><td>{cont('agendado')}</td></tr>
                    <tr><td>Cancelados</td><td>{cont('cancelado')}</td></tr>
                    <tr><td>No-show</td><td>{cont('no_show')}</td></tr>
                  </tbody></table>
                </div>
              </div>

              <button className="btn start" onClick={exportar} disabled={!vendas.length}><Icon name="down" />Exportar vendas (CSV)</button>
            </>
          );
        }}
      </Load>
    </>
  );
}
