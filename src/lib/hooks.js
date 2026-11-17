import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './ctx';

/**
 * Carrega dados assíncronos. Recarrega quando `deps` mudam e quando o app
 * dispara `refresh()` (depois de qualquer gravação).
 * reload(true) = recarga silenciosa (sem tela de carregamento).
 */
export function useAsync(fn, deps = []) {
  const { tick } = useApp();
  const [st, setSt] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async silent => {
    const id = ++seq.current;
    if (!silent) setSt(s => ({ data: s.data, error: null, loading: true }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setSt({ data, error: null, loading: false });
    } catch (e) {
      console.error(e);
      if (id === seq.current) setSt(s => ({ data: silent ? s.data : null, error: silent ? null : e, loading: false }));
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [...deps, tick]);

  return { ...st, reload: load };
}

export function useInterval(fn, ms) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) ref.current(); }, ms);
    return () => clearInterval(id);
  }, [ms]);
}
