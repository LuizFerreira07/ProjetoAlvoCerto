import { createContext, useContext } from 'react';

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const ADM = 'administrador';
export const ATD = 'atendente';
export const INS = 'instrutor';
export const CLI = 'cliente';
