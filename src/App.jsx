import React, { useState, useEffect } from "react";
import { P,money,TODAY,dt,iso,lab,ini,CL0,PR0,AG0,USERS,PISTAS,REV,addMin } from "./data";
import { I, Badge } from "./components/ui";
import Home from "./screens/Home";
import Agenda from "./screens/Agenda";
import Clientes from "./screens/Clientes";
import Caixa from "./screens/Caixa";
import Simple from "./screens/Simple";
import NovoAg from "./components/NovoAg";
import NovoCl from "./components/NovoCl";

function App(){
  const [tab,setTab]=useState("home"),[modal,setModal]=useState(""),[theme,setTheme]=useState(null),[user,setUser]=useState(0);
  const [ag,setAg]=useState(AG0),[cl,setCl]=useState(CL0),[prods,setProds]=useState(PR0),[cart,setCart]=useState({}),[date,setDate]=useState(TODAY),[toast,setToast]=useState("");
  useEffect(()=>{if(!modal)return;const h=e=>e.key==="Escape"&&setModal("");addEventListener("keydown",h);return()=>removeEventListener("keydown",h)},[modal]);
  const say=m=>{setToast(m);setTimeout(()=>setToast(""),2600)};
  const go=t=>{setTab(t);setModal("")};
  const toggleTheme=()=>{const dark=theme?theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;const n=dark?"light":"dark";setTheme(n);document.documentElement.setAttribute("data-theme",n)};
  const low=prods.filter(p=>p.est<p.min).length,pend=cl.filter(c=>c.pend).length;
  const main=["home","agenda","clientes","caixa"].includes(tab)?tab:"mais";
  const titles={home:"Visão geral",agenda:"Agendamentos",clientes:"Clientes",caixa:"Caixa e vendas",estoque:"Estoque",catalogo:"Catálogo",pistas:"Pistas e equipamentos",filiados:"Filiados",relatorios:"Relatórios",config:"Configurações"};
  const pay=total=>{setProds(ps=>ps.map(p=>({...p,est:p.est-(cart[p.id]||0)})));setCart({});say("Pagamento de "+money(total)+" recebido.")};
  const menu=[["PRINCIPAL",[["home","grid","Visão geral"],["agenda","cal","Agendamentos"],["clientes","users","Clientes"],["caixa","bag","Caixa e vendas"]]],["GESTÃO DO ESTANDE",[["catalogo","ly","Catálogo"],["estoque","box","Estoque",low],["pistas","tg","Pistas e equipamentos"],["filiados","ok","Filiados"],["relatorios","chart","Relatórios"]]],["SISTEMA",[["config","set","Configurações"]]]];
  const width=tab==="home"||tab==="caixa"?"w-lg":tab==="agenda"||tab==="clientes"?"w-md":"w-sm";
  const brand=<div className="logo"><span className="lg"><I n="tg"/></span><div><b>alvo certo.</b><small>ESTANDE DE TIRO</small></div></div>;
  return <div className="app">
    <aside className="side">{brand}
      {menu.map(([s,items])=><div key={s}><div className="sec">{s}</div>{items.map(([k,i,l,b])=><button key={k} className={"mi"+(tab===k?" on":"")} onClick={()=>go(k)}><I n={i}/><span style={{flex:1}}>{l}</span>{b?<Badge k="wa">{b}</Badge>:null}</button>)}</div>)}
      <div className="sfoot"><button className="mi" onClick={()=>setModal("perfis")}><span className="av">{ini(USERS[user][0])}</span><span style={{flex:1,minWidth:0}}><b style={{display:"block",fontWeight:600}}>{USERS[user][0]}</b><span className="mu">{USERS[user][1]}</span></span></button>
        <button className="mi" onClick={()=>say("Área do cliente: disponível na versão completa.")}><I n="ph"/>Visualizar área do cliente</button></div></aside>
    <div className="top"><div className="logo"><span className="lg"><I n="tg"/></span><div><b>alvo certo.</b><small>ESTANDE DE TIRO</small></div></div>
      <div className="tr"><button className="ib" onClick={toggleTheme} aria-label="Alternar tema"><I n="sun"/></button><button className="ib" onClick={()=>setModal("atencao")} aria-label="Central de atenção"><I n="bell"/><span className="dot"/></button><button className="av" onClick={()=>setModal("perfis")}>{ini(USERS[user][0])}</button></div></div>
    <div className="crumb"><span className="ct">{titles[tab]}</span><span className="tag">Demo data</span></div>
    <main><div className={"page "+width}>
      {tab==="home"&&<Home go={go} open={setModal} ag={ag} prods={prods}/>}
      {tab==="agenda"&&<Agenda ag={ag} open={setModal} date={date} setDate={setDate}/>}
      {tab==="clientes"&&<Clientes cl={cl} openNew={()=>setModal("cliente")}/>}
      {tab==="caixa"&&<Caixa prods={prods} cart={cart} setCart={setCart} pay={pay}/>}
      {main==="mais"&&<Simple id={tab} prods={prods} cl={cl}/>}
    </div></main>
    <nav>{[["home","grid","Início"],["agenda","cal","Agenda"],["clientes","users","Clientes"],["caixa","bag","Caixa"]].map(([k,i,l])=><button key={k} className={main===k?"on":""} onClick={()=>go(k)}><I n={i}/>{l}</button>)}<button className={main==="mais"?"on":""} onClick={()=>setModal("menu")}><I n="menu"/>Mais</button></nav>
    {modal&&<div className="ov" role="dialog" aria-modal="true" onClick={e=>e.target===e.currentTarget&&setModal("")}>
      {modal==="novo"&&<NovoAg cl={cl} ag={ag} date={date} close={()=>setModal("")} onSave={a=>{setAg(x=>[...x,a]);setDate(a.data);setModal("");setTab("agenda");say("Agendamento confirmado.")}}/>}
      {modal==="cliente"&&<NovoCl close={()=>setModal("")} onSave={(n,t)=>{setCl(c=>[...c,{nome:n,tipo:t,cod:"CLI-"+String(c.length+1).padStart(4,"0"),pend:1}]);setModal("");say("Cliente cadastrado com documentação pendente.")}}/>}
      {modal==="menu"&&<div className="md"><div className="row"><div><h2>Alvo Certo</h2><span className="mu">Navegue pelo seu estande.</span></div><button className="ib" onClick={()=>setModal("")}><I n="x"/></button></div><hr/>
        {menu.map(([s,items])=><div key={s}><div className="sec">{s}</div>{items.map(([k,i,l,b])=><button key={k} className={"mi"+(tab===k?" on":"")} onClick={()=>go(k)}><I n={i}/><span style={{flex:1}}>{l}</span>{b?<Badge k="wa">{b}</Badge>:null}</button>)}</div>)}
        <button className="btn" style={{width:"100%",justifyContent:"center",marginTop:16}} onClick={()=>setModal("perfis")}><I n="usr"/>Trocar perfil de demonstração</button>
        <button className="mi" style={{justifyContent:"center"}} onClick={()=>{setModal("");say("Área do cliente: disponível na versão completa.")}}><I n="ph"/>Visualizar área do cliente</button></div>}
      {modal==="perfis"&&<div className="md"><div className="row"><h2>Perfis de demonstração</h2><button className="ib" onClick={()=>setModal("")}><I n="x"/></button></div><p className="mu">Explore os acessos de cada perfil. Este ambiente não tem autenticação real e os dados são fictícios.</p><hr/>
        {USERS.map(([n,r],i)=><button key={n} className="li" style={{border:"1px solid "+(i===user?"var(--pr)":"var(--bd)"),borderRadius:12,padding:12,marginBottom:8,background:i===user?"var(--pl)":"none"}} onClick={()=>{setUser(i);setModal("");say("Perfil: "+n)}}><span className="av">{ini(n)}</span><div className="grow"><b>{n}</b><span className="mu">{r}</span></div>{i===user&&<I n="ok"/>}</button>)}</div>}
      {modal==="atencao"&&<div className="md"><div className="row"><h2>Central de atenção</h2><button className="ib" onClick={()=>setModal("")}><I n="x"/></button></div><p className="mu">Pendências que precisam da recepção.</p><hr/>
        <button className="alert" style={{background:"var(--wab)"}} onClick={()=>go("estoque")}><span style={{color:"var(--wa)"}}><I n="box"/></span><div style={{flex:1}}><b>{low} itens com estoque baixo</b><div className="mu">Confira os saldos e registre a reposição.</div></div><I n="ch"/></button>
        <button className="alert" style={{background:"var(--erb)"}} onClick={()=>go("clientes")}><span style={{color:"var(--er)"}}><I n="al"/></span><div style={{flex:1}}><b>{pend} cadastros com pendências</b><div className="mu">O atendimento fica bloqueado até a regularização.</div></div><I n="ch"/></button></div>}
    </div>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

export default App;
