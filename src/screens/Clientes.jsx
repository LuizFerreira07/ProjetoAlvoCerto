import React, { useState, useMemo } from "react";
import { P,money,TODAY,dt,iso,lab,ini,CL0,PR0,AG0,USERS,PISTAS,REV,addMin } from "../data";
import { I, Badge } from "../components/ui";

function Clientes({cl,openNew}){
  const [f,setF]=useState("Todos"),[q,setQ]=useState("");
  const list=cl.filter(c=>(f==="Todos"||(f==="Filiados"&&c.tipo==="Filiado")||(f==="Avulsos"&&c.tipo==="Avulso")||(f==="Pendências"&&c.pend))&&(c.nome+c.cod).toLowerCase().includes(q.toLowerCase()));
  return <>
    <h1>Clientes</h1><p className="sub">Relacionamento próximo. Documentação sempre em dia.</p>
    <button className="btn p" onClick={openNew} style={{marginBottom:16}}><I n="users"/>Novo cliente</button>
    <div className="g2 k3" style={{marginBottom:12}}>
      <div className="card"><div className="mu">Clientes ativos</div><div className="big">{cl.length}</div><div className="mu">Avulsos e filiados cadastrados</div></div>
      <div className="card"><div className="mu">Filiados</div><div className="big">{cl.filter(c=>c.tipo==="Filiado").length}</div><div className="mu">Benefícios aplicados automaticamente</div></div>
      <div className="card"><div className="mu">Documentação pendente</div><div className="big">{cl.filter(c=>c.pend).length}</div><div className="mu">Acesso bloqueado até regularização</div></div></div>
    <div className="card"><div className="srch f"><I n="se"/><input placeholder="Buscar por nome, CPF ou código" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="tabs">{["Todos","Filiados","Avulsos","Pendências"].map(k=><button key={k} className={f===k?"on":""} onClick={()=>setF(k)}>{k}</button>)}</div>
      {list.map(c=><div className="li" key={c.cod} style={{cursor:"default"}}><span className="av">{ini(c.nome)}</span><div className="grow"><b>{c.nome}</b><span className="mu">{c.cod} · {c.tipo}</span></div><Badge k={c.pend?"wa":"ok"}>{c.pend?"Pendente":"Em dia"}</Badge><I n="ch"/></div>)}</div></>;
}

export default Clientes;
