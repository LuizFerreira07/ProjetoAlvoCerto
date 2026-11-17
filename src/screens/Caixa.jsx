import React, { useState, useMemo } from "react";
import { P,money,TODAY,dt,iso,lab,ini,CL0,PR0,AG0,USERS,PISTAS,REV,addMin } from "../data";
import { I, Badge } from "../components/ui";

function Caixa({prods,cart,setCart,pay,user}){
  const [t,setT]=useState("prod"),[q,setQ]=useState(""),[cat,setCat]=useState("Todos os itens");
  const cats=["Todos os itens","Munições","Alvos","Proteção"];
  const list=prods.filter(p=>(cat===cats[0]||p.cat===cat)&&p.nome.toLowerCase().includes(q.toLowerCase()));
  const n=Object.values(cart).reduce((a,b)=>a+b,0);const total=prods.reduce((s,p)=>s+(cart[p.id]||0)*p.preco,0);
  const add=(id,d)=>setCart(c=>{const v=(c[id]||0)+d;const r={...c};if(v<=0)delete r[id];else r[id]=v;return r});
  return <>
    <h1>Caixa e vendas</h1><p className="sub">Um atendimento ágil, do primeiro item ao pagamento.</p>
    <div className="tabs no-d"><button className={t==="prod"?"on":""} onClick={()=>setT("prod")}>Produtos e serviços</button><button className={t==="cmd"?"on":""} onClick={()=>setT("cmd")}>Comanda ({n})</button></div>
    <div className="caixa">
    <div className={"pane"+(t==="prod"?"":" off")}><div className="card"><div className="srch"><I n="se"/><input placeholder="Buscar produtos e serviços" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="chips">{cats.map(c=><button key={c} className={"chip"+(cat===c?" on":"")} onClick={()=>setCat(c)}>{c}</button>)}</div>
      <div className="g2 prods">{list.map(p=><button className="prod" key={p.id} onClick={()=>p.est>(cart[p.id]||0)&&add(p.id,1)}><div className="row"><span className="pi"><I n={p.ic}/></span><I n="plus"/></div><b style={{marginTop:6}}>{p.nome}</b><span className="mu">{p.est} un. em estoque</span><b style={{marginTop:"auto",fontSize:16}}>{money(p.preco)}<span className="mu"> /un.</span></b></button>)}</div></div></div>
    <div className={"pane side-pane"+(t==="cmd"?"":" off")}><div className="card"><b style={{fontSize:16}} className="only-d">Comanda ({n})</b>{n===0?<p className="mu" style={{textAlign:"center"}}>Comanda vazia. Escolha itens em Produtos e serviços.</p>:<>
      {prods.filter(p=>cart[p.id]).map(p=><div className="li" key={p.id} style={{cursor:"default"}}><div className="grow"><b>{p.nome}</b><span className="mu">{money(p.preco)} /un.</span></div><button className="btn" onClick={()=>add(p.id,-1)}>−</button><b>{cart[p.id]}</b><button className="btn" onClick={()=>cart[p.id]<p.est&&add(p.id,1)}>+</button></div>)}
      <div className="row" style={{margin:"14px 0"}}><b>Total</b><b style={{fontSize:20}}>{money(total)}</b></div><button className="btn p" style={{width:"100%",justifyContent:"center"}} onClick={()=>pay(total)}>Receber pagamento</button></>}</div></div>
    </div>
  </>;
}

export default Caixa;
