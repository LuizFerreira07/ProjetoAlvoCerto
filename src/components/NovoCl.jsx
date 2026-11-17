import React, { useState, useMemo } from "react";
import { P,money,TODAY,dt,iso,lab,ini,CL0,PR0,AG0,USERS,PISTAS,REV,addMin } from "../data";
import { I, Badge } from "./ui";

function NovoCl({close,onSave}){
  const [n,setN]=useState(""),[t,setT]=useState("Avulso");
  return <div className="md"><div className="row"><h2>Novo cliente</h2><button className="ib" onClick={close}><I n="x"/></button></div><hr/>
    <div className="f"><label>Nome completo</label><input value={n} onChange={e=>setN(e.target.value)}/></div>
    <div className="f"><label>Tipo</label><select value={t} onChange={e=>setT(e.target.value)}><option>Avulso</option><option>Filiado</option></select></div>
    <button className="btn p" disabled={!n.trim()} style={{width:"100%",justifyContent:"center"}} onClick={()=>onSave(n.trim(),t)}>Salvar cliente</button></div>;
}

export default NovoCl;
