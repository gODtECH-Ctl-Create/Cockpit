"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Project = {
  name:string; fullName:string; group:"core"|"professional"; access:string; visibility:string; url:string;
  description:string; defaultBranch:string; archived:boolean;
  lastCommit:{sha:string;message:string;date:string|null;url:string}|null;
  openIssues:number; criticalIssues:number; openPullRequests:number;
  ci:{status:string;conclusion:string|null;url:string}|null;
  projectState:string; priority:string; currentFocus:string; nextStep:string;
  blockers:string[]; statusNote:string; stateSource:string; lastWorkedOn:string|null; staleDays:number|null;
};
type ResponseData={owner:string;hasGitHubToken:boolean;projects:Project[];generatedAt:string};
type Entity={id:string;label:string;status:string;summary:string;x:number;y:number;accent:"green"|"blue"|"amber"};

const systemEntities:Entity[]=[
 {id:"github",label:"GitHub",status:"CONNECTED",accent:"green",x:9,y:30,summary:"Source of truth for repository state, commits, issues, pull requests, and workflow signals."},
 {id:"vercel",label:"Vercel",status:"READY",accent:"blue",x:91,y:30,summary:"Deployment control plane. Deployment telemetry can be attached here as the connector grows."},
 {id:"supabase",label:"Supabase",status:"READY",accent:"blue",x:9,y:70,summary:"Data and realtime infrastructure surface available for future ARIA system telemetry."},
 {id:"neon",label:"Neon",status:"READY",accent:"blue",x:91,y:70,summary:"Postgres infrastructure surface available for future ARIA system telemetry."},
];

const stateRank:Record<string,number>={critical:0,high:1,medium:2,normal:3,low:4};

function needsAttention(p:Project){
 return p.access!=="ok"||p.projectState==="blocked"||p.criticalIssues>0||p.ci?.conclusion==="failure"||(p.staleDays??0)>30;
}
function relative(date:string|null){
 if(!date)return "No recent activity";
 const days=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/86400000));
 return days===0?"Today":days===1?"1 day ago":days+" days ago";
}
function statusText(p:Project){
 if(p.projectState==="blocked")return "Blocked";
 if(p.criticalIssues>0)return p.criticalIssues+" critical issue"+(p.criticalIssues===1?"":"s");
 if(p.ci?.conclusion==="failure")return "Latest workflow failed";
 if((p.staleDays??0)>30)return "Inactive for "+p.staleDays+" days";
 return p.projectState;
}
function curve(x:number,y:number,bend:number){
 const mx=(50+x)/2,my=(50+y)/2,dx=x-50,dy=y-50,len=Math.max(1,Math.hypot(dx,dy));
 const nx=-dy/len,ny=dx/len,amount=bend*Math.min(6,len/5);
 return `M50 50 Q${(mx+nx*amount).toFixed(2)} ${(my+ny*amount).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
}

export default function NeuralHome(){
 const [data,setData]=useState<ResponseData|null>(null);
 const [loading,setLoading]=useState(true);
 const [hovered,setHovered]=useState<string|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [briefOpen,setBriefOpen]=useState(false);
 const [brief,setBrief]=useState("");
 const [asking,setAsking]=useState(false);

 useEffect(()=>{
  let live=true;
  fetch("/api/projects",{cache:"no-store"})
   .then(r=>r.json())
   .then((result:ResponseData)=>{if(live)setData(result)})
   .catch(()=>{if(live)setData(null)})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[]);

 const projects=useMemo(()=>[...(data?.projects??[])].sort((a,b)=>{
  const att=Number(needsAttention(b))-Number(needsAttention(a));
  if(att)return att;
  return (stateRank[a.priority.toLowerCase()]??9)-(stateRank[b.priority.toLowerCase()]??9)
    ||new Date(b.lastCommit?.date??0).getTime()-new Date(a.lastCommit?.date??0).getTime();
 }).slice(0,24),[data]);

 const positioned=useMemo(()=>{
  const place=(list:Project[],rx:number,ry:number,start:number,phase:number)=>list.map((project,i)=>{
   const a=phase+(i/Math.max(1,list.length))*Math.PI*2;
   return {project,index:start+i,x:50+Math.cos(a)*rx,y:50+Math.sin(a)*ry};
  });
  return [...place(projects.slice(0,8),24,17,0,-Math.PI/2),...place(projects.slice(8),39,28,8,-Math.PI/2+Math.PI/16)];
 },[projects]);

 const attention=useMemo(()=>data?.projects.filter(needsAttention).length??0,[data]);
 const openWork=useMemo(()=>data?.projects.reduce((n,p)=>n+p.openIssues+p.openPullRequests,0)??0,[data]);
 const latest=useMemo(()=>[...(data?.projects??[])].filter(p=>p.lastCommit).sort((a,b)=>new Date(b.lastCommit?.date??0).getTime()-new Date(a.lastCommit?.date??0).getTime())[0]??null,[data]);

 async function ask(prompt:string){
  if(!data)return;
  setAsking(true);setBrief("");setBriefOpen(true);
  try{
   const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:prompt,projects:data.projects})});
   const result=await r.json();setBrief(result.answer??result.error??"ARIA returned no response.");
  }catch{setBrief("ARIA could not reach the intelligence service right now.");}
  finally{setAsking(false);}
 }

 const selectedProject=selected?.startsWith("project:")?(data?.projects??[]).find(p=>`project:${p.fullName}`===selected)??null:null;
 const selectedSystem=systemEntities.find(e=>e.id===selected)??null;
 const active=(id:string)=>!hovered||hovered==="aria"||hovered===id||hovered===selected;

 return <main className="neural-shell">
  <div className="neural-noise"/><div className="neural-grid"/>
  <header className="neural-header">
   <div className="neural-brand"><div className="neural-brand-mark">A</div><div><div className="neural-brand-name">ARIA</div><div className="neural-brand-sub">gODtECH command intelligence</div></div></div>
   <div className="neural-header-status"><i/><span>SYSTEM ONLINE</span>{data?<small>· synced {new Date(data.generatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small>:null}</div>
   <Link className="neural-enter" href="/workspace">Enter workspace <b>→</b></Link>
  </header>

  <section className="neural-stage">
   <div className="neural-hud neural-hud-left"><span>NEURAL ACTIVITY</span><strong>LIVE OPERATION MAP</strong><small>Real project state · live GitHub signals</small></div>
   <div className="neural-hud neural-hud-right"><span>{data?.projects.length??"—"} PROJECTS</span><span>{attention} ATTENTION</span><span>{openWork} OPEN WORK</span></div>

   <svg className="neural-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><filter id="neuralGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    {positioned.map(({project,x,y,index})=>{
      const id="project:"+project.fullName;
      return <path key={id} d={curve(x,y,index%2?-.8:.8)} className={`neural-line ${needsAttention(project)?"attention":"project-line"} ${active(id)?"visible":"dim"}`}/>;
    })}
    {systemEntities.map((e,i)=><path key={e.id} d={curve(e.x,e.y,i%2?-1:1)} className={`neural-line system-line ${active(e.id)?"visible":"dim"}`}/>)}
    <path d={curve(27,12,1)} className={`neural-line signal-line amber ${active("attention")?"visible":"dim"}`}/>
    <path d={curve(73,88,-1)} className={`neural-line signal-line blue ${active("work")?"visible":"dim"}`}/>
   </svg>

   <div className="neural-entities">
    {positioned.map(({project,x,y})=>{
      const id="project:"+project.fullName;
      return <button key={id} type="button" className={`neural-node project-node ${needsAttention(project)?"attention":""} ${selected===id?"selected":""} ${hovered&&!active(id)?"faded":""}`}
        style={{left:`${x}%`,top:`${y}%`}} onMouseEnter={()=>setHovered(id)} onMouseLeave={()=>setHovered(v=>v===id?null:v)} onFocus={()=>setHovered(id)} onBlur={()=>setHovered(v=>v===id?null:v)} onClick={()=>setSelected(v=>v===id?null:id)}>
        <i className="node-core"/><strong>{project.name}</strong><small>{needsAttention(project)?"ATTENTION":project.projectState.toUpperCase()}</small>
        <span className="node-tooltip"><b>{project.name}</b><span>{statusText(project)}</span><em>{project.currentFocus||project.description||"Project state tracked by ARIA."}</em></span>
      </button>;
    })}

    <div className="aria-entity-wrap" onMouseEnter={()=>setHovered("aria")} onMouseLeave={()=>setHovered(v=>v==="aria"?null:v)}>
      <button className="aria-neural-node" type="button" aria-label="ARIA controls" onClick={()=>setSelected(v=>v==="aria"?null:"aria")}>
       <i className="aria-ripple one"/><i className="aria-ripple two"/><span className="aria-core">A</span><strong>ARIA</strong><small>ONLINE</small>
      </button>
      {hovered==="aria"?<div className="aria-command-orbit">
       <button type="button" onClick={()=>void ask("Give me a concise briefing of what is happening across my workspace right now.")}>◉ Brief me</button>
       <button type="button" onClick={()=>void ask("What are the most important things that need my attention right now?")}>! Attention</button>
       <button type="button" onClick={()=>void ask("What changed most recently across my workspace?")}>↗ What changed</button>
      </div>:null}
    </div>

    <button type="button" className="neural-node signal-node attention-signal" style={{left:"27%",top:"12%"}} onMouseEnter={()=>setHovered("attention")} onMouseLeave={()=>setHovered(v=>v==="attention"?null:v)} onClick={()=>setSelected(v=>v==="attention"?null:"attention")}>
      <i className="signal-icon">!</i><strong>Attention</strong><small>{attention} SURFACED</small>
      <span className="node-tooltip"><b>Needs attention</b><span>{attention} project signals</span><em>Blockers, critical issues, failed workflows, stale work, and access problems.</em></span>
    </button>

    <button type="button" className="neural-node signal-node work-signal" style={{left:"73%",top:"88%"}} onMouseEnter={()=>setHovered("work")} onMouseLeave={()=>setHovered(v=>v==="work"?null:v)} onClick={()=>setSelected(v=>v==="work"?null:"work")}>
      <i className="signal-icon">↗</i><strong>Open work</strong><small>{openWork} ITEMS</small>
      <span className="node-tooltip"><b>Open work</b><span>{openWork} items</span><em>Open issues and pull requests across the tracked workspace.</em></span>
    </button>

    {systemEntities.map(e=><button key={e.id} type="button" className={`neural-node system-node ${e.accent}`} style={{left:`${e.x}%`,top:`${e.y}%`}} onMouseEnter={()=>setHovered(e.id)} onMouseLeave={()=>setHovered(v=>v===e.id?null:v)} onFocus={()=>setHovered(e.id)} onBlur={()=>setHovered(v=>v===e.id?null:v)} onClick={()=>setSelected(v=>v===e.id?null:e.id)}>
      <i className="system-core"/><strong>{e.label}</strong><small>{e.status}</small>
      <span className="node-tooltip"><b>{e.label}</b><span>{e.status}</span><em>{e.summary}</em></span>
    </button>)}
   </div>

   {latest?<div className="latest-neural-signal"><span>LATEST SIGNAL</span><b>{latest.name}</b><p>{latest.lastCommit?.message??"Project activity"}</p><small>{relative(latest.lastCommit?.date??null)}</small></div>:null}

   {selectedProject?<aside className="neural-inspector"><button className="inspector-close" onClick={()=>setSelected(null)} aria-label="Close">×</button><span>PROJECT</span><h2>{selectedProject.name}</h2><div className="inspector-tags"><b>{selectedProject.projectState}</b><b>{selectedProject.priority}</b></div><section><small>CURRENT FOCUS</small><p>{selectedProject.currentFocus||"No focus recorded."}</p></section><section><small>NEXT MOVE</small><p>{selectedProject.nextStep||"Review project state."}</p></section><div className="inspector-stats"><div><b>{selectedProject.openIssues}</b><small>issues</small></div><div><b>{selectedProject.openPullRequests}</b><small>PRs</small></div><div><b>{selectedProject.criticalIssues}</b><small>critical</small></div></div><Link className="inspector-link" href={selectedProject.url} target="_blank">Open repository <b>↗</b></Link></aside>:null}

   {selectedSystem?<aside className="neural-inspector"><button className="inspector-close" onClick={()=>setSelected(null)} aria-label="Close">×</button><span>SYSTEM</span><h2>{selectedSystem.label}</h2><div className="inspector-tags"><b>{selectedSystem.status}</b></div><section><small>OVERVIEW</small><p>{selectedSystem.summary}</p></section></aside>:null}

   <div className="neural-stage-footer"><div className="neural-legend"><span><i className="legend-project"/>Projects</span><span><i className="legend-system"/>Systems</span><span><i className="legend-signal"/>Signals</span></div><span>Hover ARIA · inspect the operation · enter workspace when ready</span></div>
  </section>

  <div className="neural-mobile-enter"><Link className="neural-enter" href="/workspace">Enter workspace <b>→</b></Link></div>

  {briefOpen?<div className="brief-overlay" onClick={()=>setBriefOpen(false)}><section className="aria-brief-card" onClick={e=>e.stopPropagation()}>
    <button className="inspector-close" onClick={()=>setBriefOpen(false)} aria-label="Close brief">×</button><span className="inspector-kicker">ARIA INTELLIGENCE</span><h2>{asking?"Reading the operation…":"Here’s the brief."}</h2>
    {asking?<div className="brief-loading"><i/>ARIA is synthesizing the live project graph.</div>:<p>{brief||"No briefing available yet."}</p>}
    <footer>Based on live project state and GitHub activity. <Link href="/workspace">Continue to workspace →</Link></footer>
  </section></div>:null}

  {loading&&!data?<div className="neural-loading"><div className="loader-ring"/><span>Reading the operation…</span></div>:null}
 </main>;
}
