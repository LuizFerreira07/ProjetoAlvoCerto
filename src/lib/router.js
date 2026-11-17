import { useEffect, useState } from 'react';

const read = () => {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  return { path, params: new URLSearchParams(qs || '') };
};

export function useRoute() {
  const [r, setR] = useState(read);
  useEffect(() => {
    const f = () => setR(read());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}

/** go('clientes?f=pend') */
export function go(to) {
  const t = '#/' + to;
  if (location.hash === t) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = t;
}
