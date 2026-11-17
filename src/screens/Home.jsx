import React, { useState, useMemo } from "react";
import { P,money,TODAY,dt,iso,lab,ini,CL0,PR0,AG0,USERS,PISTAS,REV,addMin } from "../data";
import { I, Badge } from "../components/ui";

function Home({go,open,ag,prods}){
  const low=prods.filter(p=>p.est<p.min);const tot=REV.reduce((a,b)=>a+b,0);const [per,setPer]=useState(7);
  const mx=3787,days=[24,25,26,27,28,29,30];
  return <>
    <div className="mu" style={{letterSpacing:".12em",fontSize:10,color:"var(--pr)"}}>SEU ESTANDE, SOB CONTROLE</div>
    <h1>Visão geral</h1><p className="sub">Tudo o que você precisa para um dia na direção certa.</p>
    <div className="row" style={{justifyContent:"flex-start",marginBottom:16}}><button className="btn" onClick={()=>go("caixa")}><I n="bag"/>Abrir caixa</button><button className="btn p" onClick={()=>open("novo")}><I n="plus"/>Novo agendamento</button></div>
    <div className="g2 k4" style={{marginBottom:12}}>
      <div className="card"><div className="mu">Receita de hoje</div><div className="big">R$ 3.209,50</div><div className="mu">R$ 65.739,00 recebidos neste mês</div></div>
      <div className="card"><div className="row"><span className="mu">Ocupação das pistas</span></div><div className="big">67%</div><div className="mu">2 de 3 pistas ativas em uso</div></div>
      <div className="card"><div className="mu">Agendamentos de hoje</div><div className="big">{String(3+ag.filter(a=>a.data===TODAY).length).padStart(2,"0")}</div><div className="mu">3 aguardando atendimento</div></div>
      <div className="card"><div className="mu">Filiados ativos</div><div className="big">06</div><div className="mu">Pista gratuita e benefícios no consumo</div></div>
    </div>
    <div className="hcols">
    <div className="card"><div className="row" style={{alignItems:"flex-start"}}><div><b style={{fontSize:16}}>Receita do estande</b><div className="mu">Vendas, reservas e mensalidades recebidas</div></div>
      <div className="tabs" style={{margin:0}}>{[7,30].map(d=><button key={d} className={per===d?"on":""} onClick={()=>setPer(d)}>{d} dias</button>)}</div></div>
      <div className="big" style={{fontSize:28}}>{money(per===7?tot:65739)}</div><div className="mu">Total nos últimos {per} dias</div>
      <div className="chart" style={{marginBottom:24}}>{REV.map((v,i)=><div key={i} className={i===6?"last":""} style={{height:v/mx*100+"%"}}><span>{days[i]} out</span></div>)}</div></div>
    <div className="live"><div className="row"><b style={{fontSize:16}}>Pistas em tempo real</b></div><div className="mu" style={{color:"#fffa"}}>Operação de demonstração</div>
      <div className="row" style={{margin:"16px 0"}}><div className="ring" style={{"--v":"67%"}}>67%</div><div style={{flex:1,paddingLeft:20,lineHeight:2}}><div className="row"><span>Em atendimento</span><b>02</b></div><div className="row"><span>Pistas disponíveis</span><b>01</b></div><div className="row"><span>Em manutenção</span><b>01</b></div></div></div>
      <div className="pg" style={{gridTemplateColumns:"repeat(4,1fr)"}}>{PISTAS.map(p=><div className="pc" key={p[0]}><b>Pista {String(p[0]).padStart(2,"0")}</b><div>{p[1]==="Livre agora"?"Disponível":p[1]==="Em uso"?"Em uso":"Manutenção"}</div></div>)}</div></div>
    <div className="card"><div className="row" style={{marginBottom:8}}><b style={{fontSize:16}}>Agenda de hoje</b><button className="tag" style={{border:0}} onClick={()=>go("agenda")}>Ver tudo</button></div>
      {ag.filter(a=>a.data===TODAY).map(a=><div className="li" key={a.id} style={{cursor:"default"}}><span className="av">{ini(a.cli)}</span><div className="grow"><b>{a.cli}</b><span className="mu">{a.tipo}{a.inst&&" · Com instrutor"}</span></div><div style={{textAlign:"right"}}><b>{a.hora} — {addMin(a.hora,a.dur)}</b><div className="mu">{a.dur} min · Pista {String(a.pista).padStart(2,"0")}</div></div></div>)}
      <div className="mu" style={{marginTop:8,color:"var(--ok)"}}>Documentação conferida em cada check-in.</div></div>
    <div className="card"><div className="row"><div><b style={{fontSize:16}}>Atenção ao estoque</b><div className="mu">Reposição para manter a operação</div></div><Badge k="wa">{low.length} alertas</Badge></div>
      {low.map(p=><div key={p.id} style={{padding:"12px 0"}}><div className="row"><span className="row" style={{gap:10}}><span style={{color:"var(--wa)"}}><I n={p.ic}/></span><div><b>{p.nome}</b><div className="mu">Mínimo: {p.min} un.</div></div></span><b style={{color:"var(--wa)"}}>{p.est} un.</b></div><div className="bar"><i style={{width:Math.min(100,p.est/p.min*100)+"%"}}/></div></div>)}</div>
    </div>
    <div className="mu" style={{textAlign:"center"}}>Alvo Certo · Uma gestão. Todos os alvos.</div>
  </>;
}

export default Home;
