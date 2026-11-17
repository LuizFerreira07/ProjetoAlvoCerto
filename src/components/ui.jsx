import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { errMsg } from '../lib/supabase';
import { initials } from '../lib/utils';

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.01"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18v.01"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-8 8l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 8-8z"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  down: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2z"/><path d="M8 8h8M8 12h8"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};

export function Icon({ name, size }) {
  return (
    <svg
      className="i"
      viewBox="0 0 24 24"
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }}
    />
  );
}

export function Logo() {
  return (
    <div className="brand">
      <div className="logo"><Icon name="target" size={24} /></div>
      <div>
        <div className="bn">alvo certo.</div>
        <div className="bs">ESTANDE DE TIRO</div>
      </div>
    </div>
  );
}

export const Avatar = ({ nome }) => <span className="av">{initials(nome)}</span>;

export const Tag = ({ tone = '', children }) => <span className={'tag ' + tone}>{children}</span>;

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export function Skeleton() {
  return (
    <>
      <div className="sk" /><div className="sk" /><div className="sk" />
    </>
  );
}

export function ErrorCard({ error, onRetry }) {
  return (
    <div className="card">
      <h3>Não foi possível carregar</h3>
      <p className="sub" style={{ marginTop: 6 }}>{errMsg(error)}</p>
      <p className="sub" style={{ marginTop: 8 }}>Confira se os dois scripts SQL foram executados no Supabase.</p>
      <button className="btn pri" style={{ marginTop: 12 }} onClick={() => onRetry()}>Tentar de novo</button>
    </div>
  );
}

/** <Load st={useAsync(...)}>{data => ...}</Load> */
export function Load({ st, children }) {
  if (st.error && !st.data) return <ErrorCard error={st.error} onRetry={st.reload} />;
  if (!st.data) return <Skeleton />;
  return children(st.data);
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(([k, l]) => (
        <button type="button" key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange }) {
  return (
    <span className="sw">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <i />
    </span>
  );
}

export function Search({ value, onChange, placeholder }) {
  return (
    <div className="srch">
      <Icon name="search" />
      <input className="inp" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function PageTitle({ title, sub, eyebrow }) {
  return (
    <div>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1 style={eyebrow ? { marginTop: 6 } : undefined}>{title}</h1>
      {sub && <p className="sub" style={{ marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

export function Modal({ title, sub, onClose, children, foot }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    const key = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(r);
      document.removeEventListener('keydown', key);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className={'ov' + (on ? ' on' : '')} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <button className="x" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        <h3>{title}</h3>
        {sub && <p className="sub">{sub}</p>}
        <div className="sb">{children}</div>
        {foot && <div className="sf">{foot}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Toasts({ list }) {
  return (
    <div className="toasts" aria-live="polite">
      {list.map(t => <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>)}
    </div>
  );
}

/** Gráfico de barras simples (receita por dia). */
export function BarChart({ series, fmt, labelOf }) {
  const max = Math.max(...series.map(s => s.v), 1);
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / p) * p;
  return (
    <div className="chart">
      <div className="yl"><span>{fmt(top)}</span><span>{fmt(top / 2)}</span><span>{fmt(0)}</span></div>
      <div className="bars">
        {series.map((s, i) => (
          <div className="bc" key={s.d}>
            <div className={'b' + (i === series.length - 1 ? ' cur' : '')} style={{ height: Math.max((s.v / top) * 100, 2) + '%' }} title={fmt(s.v)} />
            <small>{series.length > 14 && i % 5 ? '' : labelOf(s.d)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
