import { useState } from 'react';
import { Icon, Load, PageTitle, Search, Seg, Tag } from '../components/ui';
import AgRow from '../components/AgRow';
import AgDetail from '../components/AgDetail';
import { useApp, ADM, ATD, INS } from '../lib/ctx';
import { useAsync, useInterval } from '../lib/hooks';
import { getClient, q } from '../lib/supabase';
import { addDays, dayEnd, dayStart, longDay, ymd } from '../lib/utils';

export default function Agenda() {
  const { me, openNovoAg } = useApp();
  const [day, setDay] = useState(ymd());
  const [tab, setTab] = useState('prox');
  const [busca, setBusca] = useState('');
  const [pistaF, setPistaF] = useState('');
  const [sel, setSel] = useState(null);
  const edit = me.role === ADM || me.role === ATD;

  const st = useAsync(async () => {
    const db = getClient();
    const now = new Date();
    let query = db.from('agendamento').select('*,cliente(id,nome,tipo),pista(nome,descricao),instrutor:usuario(nome)')
      .gte('inicio', dayStart(day).toISOString()).lt('inicio', dayEnd(day).toISOString()).order('inicio');
    if (me.role === INS) query = query.eq('instrutor_id', me.id);
    const [ags, pistas, agora] = await Promise.all([
      q(query),
      q(db.from('pista').select('*').order('id')),
      q(db.from('agendamento').select('pista_id').eq('situacao', 'agendado').lte('inicio', now.toISOString()).gt('fim', now.toISOString())),
    ]);
    return { ags, pistas, uso: new Set(agora.map(a => a.pista_id)) };
  }, [day]);
  useInterval(() => st.reload(true), 60000);

  return (
    <Load st={st}>
      {({ ags, pistas, uso }) => {
        const now = new Date();
        const aberto = a => a.situacao === 'agendado' && new Date(a.fim) > now;
        const lista = ags.filter(
          a =>
            (!pistaF || String(a.pista_id) === pistaF) &&
            (!busca || (a.cliente?.nome || '').toLowerCase().includes(busca.toLowerCase())) &&
            (tab === 'todos' || (tab === 'prox' ? aberto(a) : !aberto(a)))
        );
        return (
          <>
            <PageTitle title="Agendamentos" sub="Horários organizados. Atendimento sem conflitos." />
            {edit && <button className="btn pri start" onClick={() => openNovoAg()}><Icon name="plus" />Novo agendamento</button>}

            <div className="pcards">
              {pistas.map(p => {
                const t = p.situacao !== 'ativa' ? ['Manutenção', 'warn'] : uso.has(p.id) ? ['Em uso', ''] : ['Livre agora', 'ok'];
                return (
                  <div className="pc" key={p.id}>
                    <div className="between"><b>{p.nome}</b><Tag tone={t[1]}>{t[0]}</Tag></div>
                    <span className="mt">{p.descricao}</span>
                  </div>
                );
              })}
            </div>

            <div className="card stackc">
              <div className="daynav">
                <button className="ib" onClick={() => setDay(addDays(day, -1))} aria-label="Dia anterior"><Icon name="left" /></button>
                <b>{longDay(day)}</b>
                <button className="ib" onClick={() => setDay(addDays(day, 1))} aria-label="Próximo dia"><Icon name="right" /></button>
                <button className="btn sm" onClick={() => setDay(ymd())}>Hoje</button>
              </div>
              <Seg options={[['prox', 'Próximos'], ['enc', 'Encerrados'], ['todos', 'Todos']]} value={tab} onChange={setTab} />
              <Search value={busca} onChange={setBusca} placeholder="Buscar cliente na agenda" />
              <select className="inp" value={pistaF} onChange={e => setPistaF(e.target.value)}>
                <option value="">Todas as pistas</option>
                {pistas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <div className="sub between" style={{ fontSize: 12 }}>
                <span>{ags.length} agendamento{ags.length === 1 ? '' : 's'} neste dia</span><span>Horário de Brasília</span>
              </div>
            </div>

            <div className="card" style={{ padding: '6px 12px' }}>
              <div className="list">
                {lista.map(a => <AgRow key={a.id} a={a} showStatus onOpen={setSel} />)}
                {!lista.length && <div className="empty">Nenhum agendamento encontrado.</div>}
              </div>
            </div>
            {sel && <AgDetail ag={sel} onClose={() => setSel(null)} />}
          </>
        );
      }}
    </Load>
  );
}
