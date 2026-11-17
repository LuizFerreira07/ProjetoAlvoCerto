import { useEffect, useState } from 'react';
import { Logo } from '../components/ui';
import { clearCfg, errMsg, getCfg, getClient, q, saveCfg } from '../lib/supabase';
import { dig } from '../lib/utils';

const Frame = ({ children }) => (
  <div className="auth"><div className="card authc"><Logo />{children}</div></div>
);

export function SetupScreen() {
  const c = getCfg() || {};
  const [f, setF] = useState({ url: c.url || '', key: c.key || '' });
  return (
    <Frame>
      <div>
        <h2>Conectar ao Supabase</h2>
        <p className="sub">
          No Supabase: Project Settings → API. Copie a <b>Project URL</b> e a chave <b>anon / publishable</b>.
          Se preferir, coloque os dois valores no arquivo <code>.env</code> (veja <code>.env.example</code>).
        </p>
      </div>
      <form
        className="fg"
        onSubmit={e => {
          e.preventDefault();
          saveCfg({ url: f.url.trim().replace(/\/+$/, ''), key: f.key.trim() });
          window.location.reload();
        }}
      >
        <label>Project URL
          <input className="inp" required inputMode="url" placeholder="https://xxxx.supabase.co" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} />
        </label>
        <label>Chave anon (pública)
          <input className="inp" required value={f.key} onChange={e => setF({ ...f, key: e.target.value })} />
        </label>
        <button className="btn pri blk">Salvar e continuar</button>
      </form>
    </Frame>
  );
}

export function AuthScreen({ onAuthed, toast }) {
  const [up, setUp] = useState(false);
  const [f, setF] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const cfg = getCfg();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const db = getClient();
    try {
      if (!up) {
        const { error } = await db.auth.signInWithPassword(f);
        if (error) throw error;
        onAuthed();
      } else {
        const { data, error } = await db.auth.signUp(f);
        if (error) throw error;
        if (data.session) onAuthed();
        else { toast('Conta criada! Confirme o e-mail e depois entre.', 'ok'); setUp(false); }
      }
    } catch (er) {
      toast(errMsg(er), 'bad');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame>
      <div>
        <h2>{up ? 'Criar conta' : 'Entrar'}</h2>
        <p className="sub">{up ? 'Clientes criam a conta aqui. A equipe é liberada pelo administrador.' : 'Acesse o sistema do estande.'}</p>
      </div>
      <form className="fg" onSubmit={submit}>
        <label>E-mail
          <input className="inp" type="email" required autoComplete="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        </label>
        <label>Senha
          <input className="inp" type="password" required minLength={6} autoComplete={up ? 'new-password' : 'current-password'} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        </label>
        <button className="btn pri blk" disabled={busy}>{up ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <div className="btns" style={{ justifyContent: 'space-between' }}>
        <button className="link" onClick={() => setUp(!up)}>{up ? 'Já tenho conta' : 'Criar conta'}</button>
        {!cfg?.env && (
          <button className="link" onClick={() => { if (window.confirm('Trocar o projeto Supabase conectado?')) { clearCfg(); window.location.reload(); } }}>
            Trocar projeto
          </button>
        )}
      </div>
    </Frame>
  );
}

/** Usuário logado que ainda não é equipe nem cliente: completa o cadastro (ou vira o 1º administrador). */
export function ProfileScreen({ onDone, onLogout, toast }) {
  const db = getClient();
  const [first, setFirst] = useState(false);
  const [f, setF] = useState({ nome: '', cpf: '', nasc: '', tel: '' });
  const [adm, setAdm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { q(db.rpc('precisa_admin_inicial')).then(setFirst).catch(() => {}); }, []); // eslint-disable-line

  async function salvar(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (dig(f.cpf).length !== 11) throw new Error('CPF deve ter 11 números.');
      await q(db.rpc('criar_meu_cadastro', { p_nome: f.nome.trim(), p_cpf: dig(f.cpf), p_nascimento: f.nasc, p_telefone: f.tel || null }));
      onDone();
    } catch (er) { toast(errMsg(er), 'bad'); } finally { setBusy(false); }
  }
  async function virarAdmin(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await q(db.rpc('bootstrap_admin', { p_nome: adm.trim() }));
      onDone();
    } catch (er) { toast(errMsg(er), 'bad'); } finally { setBusy(false); }
  }

  return (
    <Frame>
      <div>
        <h2>Complete seu cadastro</h2>
        <p className="sub">Para agendar horários, precisamos de alguns dados. RG, certidão e CR são conferidos no balcão.</p>
      </div>
      <form className="fg" onSubmit={salvar}>
        <label>Nome completo<input className="inp" required value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} /></label>
        <div className="g2">
          <label>CPF<input className="inp" required inputMode="numeric" placeholder="Somente números" value={f.cpf} onChange={e => setF({ ...f, cpf: e.target.value })} /></label>
          <label>Nascimento<input className="inp" type="date" required value={f.nasc} onChange={e => setF({ ...f, nasc: e.target.value })} /></label>
        </div>
        <label>Telefone<input className="inp" type="tel" value={f.tel} onChange={e => setF({ ...f, tel: e.target.value })} /></label>
        <button className="btn pri blk" disabled={busy}>Salvar cadastro</button>
      </form>
      {first && (
        <form className="box warn" onSubmit={virarAdmin} style={{ gap: 12 }}>
          <b>Primeiro acesso do sistema</b>
          <span>Ainda não há administrador. Se você é o responsável pelo estande, torne esta conta administradora.</span>
          <label className="fg">Seu nome<input className="inp" required value={adm} onChange={e => setAdm(e.target.value)} /></label>
          <button className="btn ok blk" disabled={busy}>Tornar-me administrador</button>
        </form>
      )}
      <button className="link" onClick={onLogout}>Sair</button>
    </Frame>
  );
}

export function MessageScreen({ title, text, onRetry, onLogout }) {
  return (
    <Frame>
      <h2>{title}</h2>
      <p className="sub">{text}</p>
      <div className="btns">
        {onRetry && <button className="btn pri" onClick={onRetry}>Tentar de novo</button>}
        <button className="btn" onClick={onLogout}>Sair</button>
      </div>
    </Frame>
  );
}
