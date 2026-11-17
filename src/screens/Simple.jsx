import React, { useState, useMemo } from "react";
import { P,money,TODAY,dt,iso,lab,ini,CL0,PR0,AG0,USERS,PISTAS,REV,addMin } from "../data";
import { I, Badge } from "../components/ui";

function Simple({id,prods,cl}){
  if(id==="estoque"||id==="catalogo")return <><h1>{id==="estoque"?"Estoque":"Catálogo"}</h1><p className="sub">{id==="estoque"?"Saldos e reposição.":"Itens à venda no estande."}</p><div className="card">{prods.map(p=><div className="li" key={p.id} style={{cursor:"default"}}><span className="pi"><I n={p.ic}/></span><div className="grow"><b>{p.nome}</b><span className="mu">{p.cat} · mínimo {p.min} un.</span></div><div style={{textAlign:"right"}}><b style={{color:p.est<p.min?"var(--wa)":"var(--tx)"}}>{id==="estoque"?p.est+" un.":money(p.preco)}</b></div></div>)}</div></>;
  if(id==="pistas")return <><h1>Pistas e equipamentos</h1><p className="sub">Situação de cada pista agora.</p><div className="card">{PISTAS.map(p=><div className="li" key={p[0]} style={{cursor:"default"}}><span className="pi"><I n="tg"/></span><div className="grow"><b>Pista {String(p[0]).padStart(2,"0")}</b><span className="mu">Indoor · {p[3]}</span></div><Badge k={p[2]}>{p[1]}</Badge></div>)}</div></>;
  if(id==="filiados")return <><h1>Filiados</h1><p className="sub">Pista gratuita e benefícios no consumo.</p><div className="card">{cl.filter(c=>c.tipo==="Filiado").map(c=><div className="li" key={c.cod} style={{cursor:"default"}}><span className="av">{ini(c.nome)}</span><div className="grow"><b>{c.nome}</b><span className="mu">{c.cod}</span></div><Badge k="ok">Ativo</Badge></div>)}</div></>;
  if(id==="relatorios")return <><h1>Relatórios</h1><p className="sub">Receita dos últimos 7 dias.</p><div className="card">{REV.map((v,i)=><div className="li" key={i} style={{cursor:"default"}}><div className="grow"><b>{24+i} out</b></div><b>{money(v)}</b></div>)}<div className="row" style={{marginTop:12}}><b>Total</b><b>{money(REV.reduce((a,b)=>a+b,0))}</b></div></div></>;
  return <><h1>Configurações</h1><p className="sub">Preferências do estande.</p><div className="card mu">Ambiente de demonstração. Use o ícone de sol no topo para alternar o tema.</div></>;
}

export default Simple;
