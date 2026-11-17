import React, { useState, useMemo } from "react";
import { P,money,TODAY,dt,iso,lab,ini,CL0,PR0,AG0,USERS,PISTAS,REV,addMin } from "../data";
import { I, Badge } from "../components/ui";

function Agenda({ag,open,date,setDate}){
  const [f,setF]=useState("prox"),[q,setQ]=useState(""),[pi,setPi]=useState("0");
  const list=ag.filter(a=>a.data===date&&(f==="todos"||(f==="prox"?a.st!=="done":a.st==="done"))&&a.cli.toLowerCase().includes(q.toLowerCase())&&(pi==="0"||a.pista==pi)).sort((a,b)=>a.hora.localeCompare(b.hora));
  const shift=n=>{const d=dt(date);d.setDate(d.getDate()+n);setDate(iso(d))};
  return <>
    <h1>Agendamentos</h1><p className="sub">Horários organizados. Atendimento sem conflitos.</p>
    <button className="btn p" onClick={()=>open("novo")} style={{marginBottom:16}}><I n="plus"/>Novo agendamento</button>
    <div className="pg p4" style={{marginBottom:12}}>{PISTAS.map(p=><div className="pc" key={p[0]}><div className="row"><b>Pista {String(p[0]).padStart(2,"0")}</b><Badge k={p[2]}>{p[1]}</Badge></div><div className="mu" style={{marginTop:8}}>Pista indoor · {p[3]}</div></div>)}</div>
    <div className="card">
      <div className="row"><button className="ib" onClick={()=>shift(-1)}><I n="back"/></button><b>{lab(date)}</b><button className="ib" onClick={()=>shift(1)}><I n="ch"/></button><button className="btn" onClick={()=>setDate(TODAY)}>Hoje</button></div>
      <div className="tabs">{[["prox","Próximos"],["enc","Encerrados"],["todos","Todos"]].map(([k,l])=><button key={k} className={f===k?"on":""} onClick={()=>setF(k)}>{l}</button>)}</div>
      <div className="srch f"><I n="se"/><input placeholder="Buscar cliente na agenda" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <select value={pi} onChange={e=>setPi(e.target.value)}><option value="0">Todas as pistas</option>{PISTAS.map(p=><option key={p[0]} value={p[0]}>Pista {String(p[0]).padStart(2,"0")}</option>)}</select>
      <div className="row mu" style={{margin:"12px -16px 0",padding:"10px 16px",background:"var(--bg)"}}><span>{list.length} agendamentos neste dia</span><span>Horário de Brasília</span></div>
      {list.length===0&&<p className="mu" style={{textAlign:"center",padding:16}}>Nenhum agendamento. Toque em Novo agendamento para reservar uma pista.</p>}
      {list.map(a=><div className="li" key={a.id} style={{cursor:"default"}}><span className="av">{ini(a.cli)}</span><div className="grow"><b>{a.cli}</b><span className="mu">{a.tipo}{a.inst&&" · Com instrutor"}</span></div><div style={{textAlign:"right"}}><b>{a.hora} — {addMin(a.hora,a.dur)}</b><div className="mu">{a.dur} min · Pista {String(a.pista).padStart(2,"0")}</div></div><span style={{width:8,height:8,borderRadius:"50%",background:a.st==="now"?"var(--ok)":"var(--pr)"}}/></div>)}
    </div></>;
}

export default Agenda;
