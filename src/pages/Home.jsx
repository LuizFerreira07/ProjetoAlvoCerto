import { useState } from 'react';
import { BarChart, Icon, Load, PageTitle, Seg, Tag } from '../components/ui';
import AgRow from '../components/AgRow';
import AgDetail from '../components/AgDetail';
import { useApp } from '../lib/ctx';
import { useAsync, useInterval } from '../lib/hooks';
import { go } from '../lib/router';
import { getClient, q } from '../lib/supabase';
import { addDays, brl, brl0, dayEnd, dayStart, num, pad, shortDay, ymd } from '../lib/utils';

function Ring({ p }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="ring">
      <circle cx="50" cy="50" r={r} className="rb" />
      <circle cx="50" cy="50" r={r} className="rf" strokeDasharray={`${(c * p) / 100} ${c}`} transform="rotate(-90 50 50)" />
      <text x="50" y="56" textAnchor="middle">{p}%</text>
    </svg>
  );
}

export default function Home() {
  const { openNovoAg } = useApp();
  const [range, setRange] = useState(7);
  const [sel, setSel] = useState(null);

  const st = useAsync(async () => {
    const db = getClient();
    const today = ymd();
    const [pag, pistas, ags, cli, low] = await Promise.all([
      q(db.from('pagamento').select('valor,pago_em').gte('pago_em', dayStart(addDays(today, -31)).toISOString())),
      q(db.from('pista').select('*').order('id')),
      q(db.from('agendamento').select('*,cliente(id,nome,tipo),pista(nome),instrutor:usuario(nome)')
        .gte('inicio', dayStart(today).toISOString()).lt('inicio', dayEnd(today).toISOString()).order('inicio')),
      q(db.from('vw_clientes_situacao').select('id,tipo,situacao,motivo')),
      q(db.from('vw_estoque_baixo').select('*').order('estoque_atual')),
    ]);
    return { pag, pistas, ags, cli, low };
  }, []);
  useInterval(() => st.reload(true), 60000);

  return (
    <Load st={st}>
      {({ pag, pistas, ags, cli, low }) => {
        const today = ymd(), now = new Date();
        const byDay = {};
        pag.forEach(p => { const d = ymd(new Date(p.pago_em)); byDay[d] = (byDay[d] || 0) + Number(p.valor); });
        const recHoje = byDay[today] || 0;
        const recMes = Object.entries(byDay).filter(([d]) => d.slice(0, 7) === today.slice(0, 7)).reduce((s, [, v]) => s + v, 0);
        const series = Array.from({ length: range }, (_, i) => { const d = addDays(today, i - range + 1); return { d, v: byDay[d] || 0 }; });
        const totN = series.reduce((s, x) => s + x.v, 0);

        const emUso = new Set(ags.filter(a => a.situacao === 'agendado' && new Date(a.inicio) <= now && new Date(a.fim) > now).map(a => a.pista_id));
        const ativas = pistas.filter(p => p.situacao === 'ativa');
        const manut = pistas.length - ativas.length;
        const uso = ativas.filter(p => emUso.has(p.id)).length;
        const pct = ativas.length ? Math.round((uso / ativas.length) * 100) : 0;
        const validos = ags.filter(a => a.situacao !== 'cancelado');
        const aguard = ags.filter(a => a.situacao === 'agendado' && !a.checkin_em && new Date(a.fim) > now).length;
        const fil = cli.filter(c => c.tipo === 'filiado' && c.situacao === 'ativo').length;
        const stPista = p => (p.situacao !== 'ativa' ? ['Manutenção', 'wrench'] : emUso.has(p.id) ? ['Em uso', 'user'] : ['Disponível', 'target']);

        return (
          <>
            <PageTitle eyebrow="Seu estande, sob controle" title="Visão geral" sub="Tudo o que você precisa para um dia na direção certa." />
            <div className="btns">
              <button className="btn" onClick={() => go('caixa')}><Icon name="bag" />Abrir caixa</button>
              <button className="btn pri" onClick={() => openNovoAg()}><Icon name="plus" />Novo agendamento</button>
            </div>

            <div className="kpis">
              <div className="kpi"><div className="t">Receita de hoje<span className="ico"><Icon name="bag" size={18} /></span></div><b>{brl(recHoje)}</b><small>{brl(recMes)} recebidos neste mês</small></div>
              <div className="kpi"><div className="t">Ocupação das pistas<span className="ico ok"><Icon name="target" size={18} /></span></div><b>{pct}%</b><small>{uso} de {ativas.length} pistas ativas em uso</small></div>
              <div className="kpi"><div className="t">Agendamentos de hoje<span className="ico"><Icon name="cal" size={18} /></span></div><b>{pad(validos.length)}</b><small>{aguard} aguardando atendimento</small></div>
              <div className="kpi"><div className="t">Filiados ativos<span className="ico"><Icon name="users" size={18} /></span></div><b>{pad(fil)}</b><small>Pista gratuita e benefícios no consumo</small></div>
            </div>

            <div className="cols">
              <div className="stack">
                <div className="card">
                  <div className="hd">
                    <div><h3>Receita do estande</h3><p className="sub">Vendas, reservas e mensalidades recebidas</p></div>
                    <Seg options={[[7, '7 dias'], [30, '30 dias']]} value={range} onChange={setRange} />
                  </div>
                  <div className="big">{brl(totN)}</div>
                  <p className="sub">Total nos últimos {range} dias</p>
                  <BarChart series={series} fmt={brl0} labelOf={shortDay} />
                </div>

                <div className="card">
                  <div className="hd">
                    <div><h3>Agenda de hoje</h3><p className="sub">{validos.length ? 'Documentação conferida em cada check-in.' : ''}</p></div>
                    <button className="btn sm" onClick={() => go('agenda')}>Ver agenda</button>
                  </div>
                  <div className="list">
                    {validos.slice(0, 6).map(a => <AgRow key={a.id} a={a} onOpen={setSel} />)}
                    {!validos.length && <div className="empty">Nenhum agendamento para hoje.</div>}
                  </div>
                </div>
              </div>

              <div className="stack">
                <div className="card hero">
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Ring p={pct} />
                    <div style={{ flex: 1 }}>
                      <h3>Pistas em tempo real</h3>
                      <p className="sub" style={{ marginBottom: 8 }}>Atualiza a cada minuto</p>
                      <div className="box" style={{ background: 'transparent', padding: 0, gap: 4 }}>
                        <div className="l"><span>Em atendimento</span><b>{pad(uso)}</b></div>
                        <div className="l"><span>Pistas disponíveis</span><b>{pad(ativas.length - uso)}</b></div>
                        <div className="l"><span>Em manutenção</span><b>{pad(manut)}</b></div>
                      </div>
                    </div>
                  </div>
                  <div className="pg">
                    {pistas.map(p => {
                      const [t, i] = stPista(p);
                      return <div key={p.id}><Icon name={i} size={18} /><b style={{ display: 'block', marginTop: 4 }}>{p.nome}</b><small>{t}</small></div>;
                    })}
                  </div>
                </div>

                <div className="card">
                  <div className="hd">
                    <div><h3>Atenção ao estoque</h3><p className="sub">Reposição para manter a operação</p></div>
                    {low.length > 0 && <Tag tone="warn">{low.length} alertas</Tag>}
                  </div>
                  {low.length ? (
                    <>
                      {low.slice(0, 5).map(p => (
                        <div key={p.id} style={{ marginBottom: 12 }}>
                          <div className="between">
                            <div><b>{p.nome}</b><div className="sub" style={{ fontSize: 12 }}>Mínimo: {num(p.estoque_minimo)} un.</div></div>
                            <b style={{ color: 'var(--warn)' }}>{num(p.estoque_atual)} un.</b>
                          </div>
                          <div className="prog"><i style={{ width: Math.min(100, p.estoque_minimo ? (p.estoque_atual / p.estoque_minimo) * 100 : 0) + '%' }} /></div>
                        </div>
                      ))}
                      <button className="btn sm blk" onClick={() => go('estoque')}>Ir para o estoque</button>
                    </>
                  ) : (
                    <div className="empty">Nenhum item abaixo do estoque mínimo.</div>
                  )}
                </div>
              </div>
            </div>
            {sel && <AgDetail ag={sel} onClose={() => setSel(null)} />}
          </>
        );
      }}
    </Load>
  );
}
