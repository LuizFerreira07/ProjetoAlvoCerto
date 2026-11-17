import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppCtx } from './lib/ctx';
import { errMsg, getCfg, getClient, q } from './lib/supabase';
import { Toasts } from './components/ui';
import Shell from './components/Shell';
import NovoAgendamento from './components/NovoAgendamento';
import { AuthScreen, MessageScreen, ProfileScreen, SetupScreen } from './pages/Access';

const EMPTY_COMANDA = { items: [], cliente: '', ag: null, arma: false, forma: 'pix', seedHoras: null };
const initialTheme = () =>
  localStorage.getItem('ac_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export default function App() {
  const [phase, setPhase] = useState('boot'); // boot | setup | auth | profile | inactive | error | ready
  const [bootError, setBootError] = useState(null);
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [cfg, setCfg] = useState({});
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(initialTheme);
  const [comanda, setComanda] = useState(EMPTY_COMANDA);
  const [novoAg, setNovoAg] = useState(null);
  const uidRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ac_theme', theme);
  }, [theme]);

  const toast = useCallback((msg, type = '') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const loadCfg = useCallback(async () => {
    const rows = await q(getClient().from('configuracao').select('*'));
    setCfg(Object.fromEntries(rows.map(r => [r.chave, Number(r.valor)])));
  }, []);

  const load = useCallback(async () => {
    if (!getCfg()) return setPhase('setup');
    const db = getClient();
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) { uidRef.current = null; setUser(null); setMe(null); setCliente(null); return setPhase('auth'); }
      uidRef.current = session.user.id;
      setUser(session.user);

      const { data: u, error } = await db.from('usuario').select('*').eq('id', session.user.id).maybeSingle();
      if (error) throw error;
      if (u) {
        if (!u.ativo) return setPhase('inactive');
        setMe({ id: u.id, nome: u.nome, role: u.perfil });
        setCliente(null);
      } else {
        try { await db.rpc('vincular_cliente'); } catch { /* sem cadastro prévio */ }
        const { data: c } = await db.from('cliente').select('*').eq('auth_user_id', session.user.id).maybeSingle();
        if (!c) return setPhase('profile');
        setCliente(c);
        setMe({ id: session.user.id, nome: c.nome, role: 'cliente' });
      }
      await loadCfg();
      setPhase('ready');
    } catch (e) {
      console.error(e);
      setBootError(errMsg(e));
      setPhase('error');
    }
  }, [loadCfg]);

  useEffect(() => {
    load();
    const db = getClient();
    if (!db) return;
    const { data } = db.auth.onAuthStateChange(ev => {
      // não chamar o supabase de dentro do callback (evita deadlock)
      if (ev === 'SIGNED_OUT') setTimeout(() => { setComanda(EMPTY_COMANDA); load(); }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const signOut = useCallback(async () => { await getClient().auth.signOut(); }, []);

  const value = useMemo(
    () => ({
      user, me, cliente, cfg, tick, theme, comanda, setComanda,
      toast, refresh, signOut, reloadCfg: loadCfg,
      resetComanda: () => setComanda(EMPTY_COMANDA),
      toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
      openNovoAg: (opts = {}) => setNovoAg(opts),
    }),
    [user, me, cliente, cfg, tick, theme, comanda, toast, refresh, signOut, loadCfg]
  );

  let body;
  if (phase === 'boot') body = <div className="auth"><div className="sk" style={{ width: 280 }} /></div>;
  else if (phase === 'setup') body = <SetupScreen />;
  else if (phase === 'auth') body = <AuthScreen onAuthed={load} toast={toast} />;
  else if (phase === 'profile') body = <ProfileScreen onDone={load} onLogout={signOut} toast={toast} />;
  else if (phase === 'inactive')
    body = <MessageScreen title="Acesso desativado" text="Seu usuário foi desativado pelo administrador." onLogout={signOut} />;
  else if (phase === 'error')
    body = (
      <MessageScreen
        title="Não foi possível carregar"
        text={`${bootError} — confira se os dois scripts SQL foram executados no Supabase.`}
        onRetry={load}
        onLogout={signOut}
      />
    );
  else
    body = (
      <AppCtx.Provider value={value}>
        <Shell />
        {novoAg && <NovoAgendamento clienteId={novoAg.clienteId} onClose={() => setNovoAg(null)} />}
      </AppCtx.Provider>
    );

  return (
    <>
      {body}
      <Toasts list={toasts} />
    </>
  );
}
