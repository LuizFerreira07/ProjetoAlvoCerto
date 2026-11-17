import { P } from "../data";
export const I=({n})=><svg className="ic" viewBox="0 0 24 24"><path d={P[n]}/></svg>;
export const Badge=({k,children})=><span className={"badge b-"+k}>{children}</span>;
