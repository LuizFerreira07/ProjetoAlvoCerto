import { useEffect, useState } from 'react';
import { Icon, Logo, Modal } from './ui';
import { useApp, ADM, ATD, CLI, INS } from '../lib/ctx';
import { useAsync } from '../lib/hooks';
import { go, useRoute } from '../lib/router';
import { getClient, q } from '../lib/supabase';
import { ROLE, initials } from '../lib/utils';

import Home from '../pages/Home';
import Agenda from '../pages/Agenda';
import Clientes from '../pages/Clientes';
import Caixa from '../pages/Caixa';
import Catalogo from '../pages/Catalogo';
import Estoque from '../pages/Estoque';
import Pistas from '../pages/Pistas';
import Filiados from '../pages/Filiados';
import Relatorios from '../pages/Relatorios';
import Config from '../pages/Config';
import { MinhaAgendaPage, MeuPerfilPage, Preview } from '../pages/AreaCliente';

const MENU = [
  { k: 'home', t: 'Visão geral', i: 'grid', r: [ADM, ATD], C: Home },
  { k: 'agenda', t: 'Agendamentos', i: 'cal', r: [ADM, ATD, INS], C: Agenda },
  { k: 'clientes', t: 'Clientes', i: 'users', r: [ADM, ATD, INS], C: Clientes },
  { k: 'caixa', t: 'Caixa e vendas', i: 'bag', r: [ADM, ATD], C: Caixa },
  { k: 'catalogo', t: 'Catálogo', i: 'layers', r: [ADM, ATD], g: 'gestao', C: Catalogo },
  { k: 'estoque', t: 'Estoque', i: 'box', r: [ADM, ATD], g: 'gestao', C: Estoque },
  { k: 'pistas', t: 'Pistas e equipamentos', i: 'target', r: [ADM, ATD], g: 'gestao', C: Pistas },
  { k: 'filiados', t: 'Filiados', i: 'check', r: [ADM, ATD], g: 'gestao', C: Filiados },
  { k: 'relatorios', t: 'Relatórios', i: 'chart', r: [ADM], g: 'gestao', C: Relatorios },
  { k: 'config', t: 'Configurações', i: 'sliders', r: [ADM], g: 'sistema', C: Config },
  { k: 'preview', t: 'Área do cliente', i: 'phone', r: [ADM, ATD], g: 'sistema', C: Preview },
  { k: 'minha', t: 'Minha agenda', i: 'cal', r: [CLI], C: MinhaAgendaPage },
  { k: 'perfil', t: 'Meu perfil', i: 'user', r: [CLI], C: MeuPerfilPage },
];
const BOTTOM = {
  [ADM]: ['home', 'agenda', 'clientes', 'caixa', '#mais'],
  [ATD]: ['home', 'agenda', 'clientes', 'caixa', '#mais'],
  [INS]: ['agenda', 'clientes', '#mais'],
  [CLI]: ['minha', '#novo', 'perfil'],
};
const SHORT = { home: 'Início', agenda: 'Agenda', clientes: 'Clientes', caixa: 'Caixa', minha: 'Agenda', perfil: 'Perfil' };

export default function Shell() {
  const { me, user, theme, toggleTheme, signOut, openNovoAg } = useApp();
  const { path, params } = useRoute();
  const [sheet, setSheet] = useState(null); // 'menu' | 'bell' | 'conta'

  const allowed = MENU.filter(m => m.r.includes(me.role));
  const cur = allowed.find(m => m.k === path) || allowed[0];
  useEffect(() => {
    if (cur.k !== path) history.replaceState(null, '', '#/' + cur.k);
    window.scrollTo(0, 0);
  }, [cur.k]); // eslint-disable-line react-hooks/exhaustive-deps

  const showAlerts = me.role === ADM || me.role === ATD;
  const alerts = useAsync(async () => {
    if (!showAlerts) return { low: 0, pend: 0 };
    const db = getClient();
    const [low, pend] = await Promise.all([
      q(db.from('vw_estoque_baixo').select('id')),
      q(db.from('vw_clientes_situacao').select('id').eq('situacao', 'ativo').not('motivo', 'is', null)),
    ]);
    return { low: low.length, pend: pend.length };
  }, [showAlerts]);
  const al = alerts.data || { low: 0, pend: 0 };

  const nav = k => { setSheet(null); go(k); };
  const Page = cur.C;

  return (
    <div className="shell">
      <aside className="side">
        <Logo />
        {allowed.map(m => (
          <button key={m.k} className={'mi' + (cur.k === m.k ? ' on' : '')} onClick={() => nav(m.k)}>
            <Icon name={m.i} />{m.t}
            {m.k === 'estoque' && al.low > 0 && <em>{al.low}</em>}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="mi" onClick={signOut}><Icon name="out" />Sair</button>
      </aside>

      <div className="main">
        <header className="top">
          <Logo />
          <button className="ib" onClick={toggleTheme} aria-label="Alternar tema"><Icon name={theme === 'dark' ? 'moon' : 'sun'} /></button>
          {showAlerts && (
            <button className="ib" onClick={() => setSheet('bell')} aria-label="Alertas">
              <Icon name="bell" />{al.low + al.pend > 0 && <span className="dot" />}
            </button>
          )}
          <button className="av" onClick={() => setSheet('conta')} aria-label="Conta">{initials(me.nome)}</button>
        </header>
        <div className="strip"><span>{cur.t}</span><span className="badge">{ROLE[me.role]}</span></div>
        <main className="view"><Page key={cur.k} params={params} /></main>
      </div>

      <nav className="bottom">
        {BOTTOM[me.role].map(k => {
          if (k === '#mais') return <button key={k} onClick={() => setSheet('menu')}><Icon name="menu" />Mais</button>;
          if (k === '#novo') return <button key={k} onClick={() => openNovoAg()}><Icon name="plus" />Agendar</button>;
          const m = MENU.find(x => x.k === k);
          return <button key={k} className={cur.k === k ? 'on' : ''} onClick={() => nav(k)}><Icon name={m.i} />{SHORT[k]}</button>;
        })}
      </nav>

      {sheet === 'menu' && (
        <Modal title="Alvo Certo" sub="Navegue pelo seu estande." onClose={() => setSheet(null)}>
          <div className="menu">
            {[['Principal', undefined], ['Gestão do estande', 'gestao'], ['Sistema', 'sistema']].map(([t, g]) => {
              const items = allowed.filter(m => m.g === g);
              return items.length ? (
                <div key={t}>
                  <div className="sec">{t}</div>
                  {items.map(m => (
                    <button key={m.k} className={'mi' + (cur.k === m.k ? ' on' : '')} onClick={() => nav(m.k)}>
                      <Icon name={m.i} />{m.t}{m.k === 'estoque' && al.low > 0 && <em>{al.low}</em>}
                    </button>
                  ))}
                </div>
              ) : null;
            })}
            <div className="sec">Conta</div>
            <button className="mi" onClick={() => { setSheet(null); signOut(); }}><Icon name="out" />Sair</button>
          </div>
        </Modal>
      )}

      {sheet === 'bell' && (
        <Modal title="Central de atenção" sub="Pendências que precisam da recepção." onClose={() => setSheet(null)}>
          {al.low > 0 && (
            <button className="row alert warn" onClick={() => nav('estoque')}>
              <span className="ico warn"><Icon name="box" /></span>
              <span className="grow"><b>{al.low} {al.low > 1 ? 'itens' : 'item'} com estoque baixo</b><span className="mt" style={{ display: 'block' }}>Confira os saldos e registre a reposição.</span></span>
              <Icon name="right" />
            </button>
          )}
          {al.pend > 0 && (
            <button className="row alert bad" onClick={() => nav('clientes?f=pend')}>
              <span className="ico bad"><Icon name="alert" /></span>
              <span className="grow"><b>{al.pend} {al.pend > 1 ? 'cadastros' : 'cadastro'} com pendências</b><span className="mt" style={{ display: 'block' }}>O atendimento fica bloqueado até a regularização.</span></span>
              <Icon name="right" />
            </button>
          )}
          {!al.low && !al.pend && <div className="empty">Tudo em dia por aqui. ✔</div>}
        </Modal>
      )}

      {sheet === 'conta' && (
        <Modal title={me.nome} sub={`${ROLE[me.role]} · ${user.email}`} onClose={() => setSheet(null)}>
          <div className="fg">
            <button className="btn blk" onClick={toggleTheme}>Alternar tema claro/escuro</button>
            <button className="btn bad blk" onClick={() => { setSheet(null); signOut(); }}>Sair</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
