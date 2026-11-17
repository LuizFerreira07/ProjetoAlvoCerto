import React, { useState, useMemo } from "react";
import { P,money,TODAY,dt,iso,lab,ini,CL0,PR0,AG0,USERS,PISTAS,REV,addMin } from "../data";
import { I, Badge } from "./ui";

function NovoAg({cl,ag,date,onSave,close}){
  const [f,setF]=useState({cli:"",data:date,hora:"18:00",pista:1,dur:60,inst:"",own:false});const [err,setErr]=useState("");
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const price=f.dur===30?45:f.dur===60?80:115;
  const save=()=>{
    const c=cl.find(x=>x.cod===f.cli);
    if(!c)return setErr("Selecione um cliente.");
    if(c.pend)return setErr("Documentação pendente. Regularize o cadastro antes de reservar.");
    if(f.pista===4)return setErr("A Pista 04 está em manutenção. Escolha outra pista.");
    const s=f.hora,e=addMin(f.hora,f.dur);
    if(ag.some(a=>a.data===f.data&&a.pista===+f.pista&&s<addMin(a.hora,a.dur)&&a.hora<e))return setErr("Esta pista já está reservada nesse horário.");
    onSave({id:Date.now(),cli:c.nome,tipo:c.tipo,data:f.data,hora:s,pista:+f.pista,dur:+f.dur,st:"next",inst:!!f.inst});
  };
  return <div className="md"><div className="row" style={{alignItems:"flex-start"}}><div><h2>Novo agendamento</h2><p className="mu" style={{margin:"0 0 8px"}}>Reserve uma pista ou uma aula. A documentação é conferida antes da confirmação.</p></div><button className="ib" onClick={close}><I n="x"/></button></div><hr/>
    <div className="f"><label>Cliente</label><select value={f.cli} onChange={e=>{set("cli",e.target.value);setErr("")}}><option value="">Selecione o cliente</option>{cl.map(c=><option key={c.cod} value={c.cod}>{c.nome}</option>)}</select></div>
    <div className="g2 f"><div><label>Data</label><input type="date" value={f.data} onChange={e=>set("data",e.target.value)}/></div><div><label>Horário</label><input type="time" value={f.hora} onChange={e=>set("hora",e.target.value)}/><div className="mu">Horário de Brasília</div></div></div>
    <div className="g2 f"><div><label>Pista</label><select value={f.pista} onChange={e=>set("pista",+e.target.value)}>{PISTAS.map(p=><option key={p[0]} value={p[0]}>Pista {String(p[0]).padStart(2,"0")}</option>)}</select></div><div><label>Duração</label><select value={f.dur} onChange={e=>set("dur",+e.target.value)}>{[30,60,90].map(d=><option key={d} value={d}>{d} minutos</option>)}</select></div></div>
    <div className="f"><label>Instrutor (opcional)</label><select value={f.inst} onChange={e=>set("inst",e.target.value)}><option value="">Sem instrutor</option><option>Carlos Menezes</option><option>Renata Dias</option></select></div>
    <div className="row f"><div><b>Arma ou munição própria</b><div className="mu">Exige CR ativo e válido na data da reserva.</div></div><button className={"sw"+(f.own?" on":"")} onClick={()=>set("own",!f.own)}><i/></button></div>
    <div className="est"><div className="row"><span className="mu">Estimativa de uso da pista</span><b>{money(f.own?price:price)}</b></div><div className="row" style={{marginTop:10}}><span className="mu">Taxa de reserva</span><b style={{color:"var(--pr)"}}>R$ 25,00</b></div><div className="mu" style={{marginTop:8}}>Cancelamentos com menos de 2h de antecedência perdem a taxa.</div></div>
    {err&&<div className="badge b-er" style={{display:"block",padding:10,marginBottom:12,whiteSpace:"normal"}}>{err}</div>}
    <div className="row"><button className="btn" onClick={close}>Voltar</button><button className="btn p" style={{flex:1,justifyContent:"center"}} onClick={save}><I n="cal"/>Confirmar agendamento</button></div></div>;
}

export default NovoAg;
