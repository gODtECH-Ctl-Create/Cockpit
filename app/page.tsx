"use client";

import Link from "next/link";
import NeuralActionConsole from "@/components/NeuralActionConsole";
import { hasNeuralAudioSupport, isNeuralAmbientRunning, playAlienCue, startNeuralAmbient, stopNeuralAmbient } from "@/lib/neural-sound";
import { useEffect, useMemo, useState } from "react";

type Project = {
  name:string; fullName:string; url:string; description:string;
  lastCommit:{sha:string;message:string;date:string|null;url:string}|null;
  openIssues:number; criticalIssues:number; openPullRequests:number;
  ci:{status:string;conclusion:string|null;url:string}|null;
  projectState:string; priority:string; currentFocus:string; nextStep?:string;
  statusNote:string; access:string; visibility?:string; staleDays:number|null;
};
type ResponseData={projects:Project[];generatedAt:string;hasGitHubToken:boolean};
type SessionData={authenticated:boolean};
type Entity={id:string;label:string;status:string;summary:string;x:number;y:number;accent:"green"|"blue"};

const systems:Entity[]=[
 {id:"github",label:"GitHub",status:"CONNECTED",accent:"green",x:9,y:30,summary:"Source of truth for repositories, commits, issues, pull requests, and workflow signals."},
 {id:"vercel",label:"Vercel",status:"READY",accent:"blue",x:91,y:30,summary:"Deployment surface shown in the public topology. Private deployment telemetry is available after login."},
 {id:"supabase",label:"Supabase",status:"READY",accent:"blue",x:9,y:70,summary:"Data infrastructure surface shown in the operation map."},
 {id:"neon",label:"Neon",status:"READY",accent:"blue",x:91,y:70,summary:"Postgres infrastructure surface shown in the operation map."},
];
const rank:Record<string,number>={critical:0,high:1,medium:2,normal:3,low:4};
function needsAttention(p:Project){return p.access!=="ok"||p.projectState==="blocked"||p.criticalIssues>0||p.ci?.conclusion==="failure"||(p.staleDays??0)>30;}
function statusText(p:Project){if(p.projectState==="blocked")return"Blocked";if(p.criticalIssues>0)return p.criticalIssues+" critical issue"+(p.criticalIssues===1?"":"s");if(p.ci?.conclusion==="failure")return"Latest workflow failed";if((p.staleDays??0)>30)return"Inactive for "+p.staleDays+" days";return p.projectState;}
function curve(x:number,y:number,bend:number){const mx=(50+x)/2,my=(50+y)/2,dx=x-50,dy=y-50,len=Math.max(1,Math.hypot(dx,dy)),amount=bend*Math.min(6,len/5),nx=-dy/len,ny=dx/len;return "M50 50 Q"+(mx+nx*amount).toFixed(2)+" "+(my+ny*amount).toFixed(2)+" "+x.toFixed(2)+" "+y.toFixed(2);}

export default function PublicNeuralMap(){
 const[data,setData]=useState<ResponseData|null>(null); const[loading,setLoading]=useState(true); const[hovered,setHovered]=useState<string|null>(null); const[selectedProject,setSelectedProject]=useState<Project|null>(null); const[authenticated,setAuthenticated]=useState(false); const[authBusy,setAuthBusy]=useState(false); const[authMessage,setAuthMessage]=useState(""); const[actionOpen,setActionOpen]=useState(false); const[soundEnabled,setSoundEnabled]=useState(true); const[soundSupported,setSoundSupported]=useState(false);
 useEffect(()=>{let enabled=true; try{const saved=localStorage.getItem("aria-neural-sound"); if(saved==="off") enabled=false;}catch{} setSoundEnabled(enabled); setSoundSupported(hasNeuralAudioSupport()); if(enabled){const wake=()=>{void startNeuralAmbient(); document.removeEventListener("pointerdown",wake); document.removeEventListener("keydown",wake); document.removeEventListener("touchstart",wake);}; document.addEventListener("pointerdown",wake,{passive:true,once:true}); document.addEventListener("touchstart",wake,{passive:true,once:true}); document.addEventListener("keydown",wake,{once:true}); return()=>{document.removeEventListener("pointerdown",wake); document.removeEventListener("touchstart",wake); document.removeEventListener("keydown",wake); stopNeuralAmbient();};} return()=>stopNeuralAmbient();},[]);
 useEffect(()=>{let live=true;
  (async()=>{
    try{
      const sessionResponse=await fetch("/api/auth/session",{cache:"no-store"});
      const session=(await sessionResponse.json()) as SessionData;
      if(!live)return;
      setAuthenticated(Boolean(session.authenticated));
      const response=await fetch(session.authenticated?"/api/projects":"/api/public/projects",{cache:"no-store"});
      if(!response.ok)throw new Error("Unable to read the operation map.");
      const value=(await response.json()) as ResponseData;
      if(live)setData(value);
    }catch{if(live)setData(null)}
    finally{if(live)setLoading(false)}
  })();
  return()=>{live=false};
},[]);
 const projects=useMemo(()=>[...(data?.projects??[])].sort((a,b)=>Number(needsAttention(b))-Number(needsAttention(a))||(rank[a.priority.toLowerCase()]??9)-(rank[b.priority.toLowerCase()]??9)||new Date(b.lastCommit?.date??0).getTime()-new Date(a.lastCommit?.date??0).getTime()).slice(0,24),[data]);
 const positioned=useMemo(()=>{const place=(list:Project[],rx:number,ry:number,start:number,phase:number)=>list.map((project,i)=>{const a=phase+(i/Math.max(1,list.length))*Math.PI*2;return{project,index:start+i,x:50+Math.cos(a)*rx,y:50+Math.sin(a)*ry};});return[...place(projects.slice(0,8),24,17,0,-Math.PI/2),...place(projects.slice(8),39,28,8,-Math.PI/2+Math.PI/16)]},[projects]);
 const attention=data?.projects.filter(needsAttention).length??0;
 const openWork=data?.projects.reduce((sum,p)=>sum+p.openIssues+p.openPullRequests,0)??0;
 const latest=useMemo(()=>[...(data?.projects??[])].filter(p=>p.lastCommit).sort((a,b)=>new Date(b.lastCommit?.date??0).getTime()-new Date(a.lastCommit?.date??0).getTime())[0]??null,[data]);
 const active=(id:string)=>!hovered||hovered===id||hovered==="aria";
 const toggleSound=()=>{if(!soundSupported)return;const next=!soundEnabled;setSoundEnabled(next);try{localStorage.setItem("aria-neural-sound",next?"on":"off")}catch{} if(next){void startNeuralAmbient(); void playAlienCue("activate");} else stopNeuralAmbient();};
 const selectProject=(project:Project)=>{if(authenticated){setSelectedProject(project);setActionOpen(false);if(soundEnabled)void playAlienCue("select");}};
 const logout=async()=>{
   setAuthBusy(true);
   try{await fetch("/api/auth/logout",{method:"POST"});window.location.reload();}finally{setAuthBusy(false)}
 };
 return <main className="neural-shell">
  <div className="neural-noise"/><div className="neural-grid"/>
  <header className="neural-header">
   <div className="neural-brand"><div className="neural-brand-mark">A</div><div><div className="neural-brand-name">ARIA</div><div className="neural-brand-sub">gODtECH command intelligence</div></div></div>
   <div className="neural-header-status"><i/><span>{authenticated?"PRIVATE MAP · EDIT ACCESS":"PUBLIC VIEW"}</span>{data?<small>· synced {new Date(data.generatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small>:null}</div>
   {authenticated?<Link className="neural-enter" href="/workspace">Workspace <b>→</b></Link>:<Link className="neural-enter" href="/login">Login <b>→</b></Link>}
  </header>
  <section className="neural-stage" aria-label={authenticated?"Private ARIA neural operation map":"Public ARIA neural operation map"}>
   <div className="neural-hud neural-hud-left"><span>NEURAL ACTIVITY</span><strong>LIVE OPERATION MAP</strong><small>{authenticated?"Private map · authenticated edit access":"View only · public topology · live project signals"}</small></div>
   <div className="neural-hud neural-hud-right"><span>{data?.projects.length??"—"} PROJECTS</span><span>{attention} ATTENTION</span><span>{openWork} OPEN WORK</span><span className="neural-life-status"><i className={isNeuralAmbientRunning()?"":"idle"} /> ARIA {isNeuralAmbientRunning()?"ACTIVE":"READY"}</span></div>
   <svg className="neural-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><filter id="neuralGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    {positioned.map(({project,x,y,index})=>{const id="project:"+project.fullName;return <path key={id} d={curve(x,y,index%2?-.8:.8)} className={`neural-line ${needsAttention(project)?"attention":"project-line"} ${active(id)?"visible":"dim"}`}/>})}
    {systems.map((e,i)=><path key={e.id} d={curve(e.x,e.y,i%2?-1:1)} className={`neural-line system-line ${active(e.id)?"visible":"dim"}`}/>)}
    <path d={curve(27,12,1)} className="neural-line signal-line amber visible"/><path d={curve(73,88,-1)} className="neural-line signal-line blue visible"/>
   </svg>
   <div className="neural-entities">
    {positioned.map(({project,x,y})=>{const id="project:"+project.fullName;return <div key={id} role="status" tabIndex={0} className={`neural-node project-node ${needsAttention(project)?"attention":""} ${selectedProject?.fullName===project.fullName?"selected":""} ${hovered&&!active(id)?"faded":""}`} style={{left:`${x}%`,top:`${y}%`}} onMouseEnter={()=>setHovered(id)} onMouseLeave={()=>setHovered(v=>v===id?null:v)} onFocus={()=>setHovered(id)} onBlur={()=>setHovered(v=>v===id?null:v)} onClick={()=>selectProject(project)} aria-label={`${project.name} ${authenticated?"open private inspector":"view details"}`}><i className="node-core"/><strong>{project.name}</strong><small>{needsAttention(project)?"ATTENTION":project.projectState.toUpperCase()}</small><span className="node-tooltip"><b>{project.name}</b><span>{statusText(project)}</span><em>{project.currentFocus||project.description||"Project state tracked by ARIA."}</em></span></div>})}
    <div className="aria-entity-wrap" onMouseEnter={()=>setHovered("aria")} onMouseLeave={()=>setHovered(v=>v==="aria"?null:v)}><div className="aria-neural-node" role="img" aria-label={authenticated?"ARIA private edit access node":"ARIA public read-only node"}><i className="aria-ripple one"/><i className="aria-ripple two"/><span className="aria-core">A</span><strong>ARIA</strong><small>{authenticated?"PRIVATE · EDIT ACCESS":"PUBLIC · READ ONLY"}</small></div></div>
    <div role="status" tabIndex={0} className={`neural-node signal-node attention-signal ${hovered&&!active("attention")?"faded":""}`} style={{left:"27%",top:"12%"}} onMouseEnter={()=>setHovered("attention")} onMouseLeave={()=>setHovered(v=>v==="attention"?null:v)} onFocus={()=>setHovered("attention")} onBlur={()=>setHovered(v=>v==="attention"?null:v)}><i className="signal-icon">!</i><strong>Attention</strong><small>{attention} SURFACED</small><span className="node-tooltip"><b>Needs attention</b><span>{attention} project signals</span><em>Blockers, critical issues, failed workflows, stale work, and access problems.</em></span></div>
    <div role="status" tabIndex={0} className={`neural-node signal-node work-signal ${hovered&&!active("work")?"faded":""}`} style={{left:"73%",top:"88%"}} onMouseEnter={()=>setHovered("work")} onMouseLeave={()=>setHovered(v=>v==="work"?null:v)} onFocus={()=>setHovered("work")} onBlur={()=>setHovered(v=>v==="work"?null:v)}><i className="signal-icon">↗</i><strong>Open work</strong><small>{openWork} ITEMS</small><span className="node-tooltip"><b>Open work</b><span>{openWork} items</span><em>Open issues and pull requests across the tracked workspace.</em></span></div>
    {systems.map(e=><div key={e.id} role="status" tabIndex={0} className={`neural-node system-node ${e.accent} ${hovered&&!active(e.id)?"faded":""}`} style={{left:`${e.x}%`,top:`${e.y}%`}} onMouseEnter={()=>setHovered(e.id)} onMouseLeave={()=>setHovered(v=>v===e.id?null:v)} onFocus={()=>setHovered(e.id)} onBlur={()=>setHovered(v=>v===e.id?null:v)}><i className="system-core"/><strong>{e.label}</strong><small>{e.status}</small><span className="node-tooltip"><b>{e.label}</b><span>{e.status}</span><em>{e.summary}</em></span></div>)}
   </div>
   {latest?<div className="latest-neural-signal"><span>LATEST SIGNAL</span><b>{latest.name}</b><p>{latest.lastCommit?.message??"Project activity"}</p><small>Recent observable activity</small></div>:null}
   <div className="neural-public-note"><span>{authenticated?"PRIVATE / EDIT ACCESS":"PUBLIC / VIEW ONLY"}</span><p>{authenticated?"Authenticated mode keeps you on the neural map and unlocks project inspection, private telemetry, and device security controls.":"Explore the operation at a glance. Login unlocks the authenticated neural map."}</p></div>
   <div className="neural-stage-footer"><div className="neural-legend"><span><i className="legend-project"/>Projects</span><span><i className="legend-system"/>Systems</span><span><i className="legend-signal"/>Signals</span></div><span>{authenticated?"Click a project node to open its private inspector":"Hover nodes to view current state · no actions available in public mode"}</span><button className="neural-sound-toggle" type="button" onClick={toggleSound} disabled={!soundSupported} aria-pressed={soundEnabled} title={soundSupported?"Toggle ARIA alien audio cues":"Audio cues are not supported in this browser"}><i>{soundEnabled?"◉":"◌"}</i><span>{soundEnabled?"NEURAL AUDIO":"AUDIO OFF"}</span></button></div>
  </section>
  <div className="neural-mobile-enter">{authenticated?<Link className="neural-enter" href="/workspace">Workspace <b>→</b></Link>:<Link className="neural-enter" href="/login">Login <b>→</b></Link>}</div>
  {authMessage?<div className="neural-auth-message" role="status">{authMessage}</div>:null}
  {loading&&!data?<div className="neural-loading"><div className="loader-ring"/><span>Reading operation map…</span></div>:null}
  {authenticated&&selectedProject&&!actionOpen?<aside className="neural-inspector">
    <button className="inspector-close" type="button" onClick={()=>setSelectedProject(null)} aria-label="Close project inspector">×</button>
    <span className="inspector-kicker">EDIT ACCESS</span>
    <h2>{selectedProject.name}</h2>
    <div className="inspector-tags"><b>{selectedProject.projectState}</b><b>{selectedProject.priority}</b><b>{selectedProject.visibility??"repository"}</b></div>
    <section><small>CURRENT FOCUS</small><p>{selectedProject.currentFocus||selectedProject.description||"No focus recorded."}</p></section>
    <section><small>NEXT MOVE</small><p>{selectedProject.nextStep||"Review project state."}</p></section>
    <section><small>STATUS</small><p>{selectedProject.statusNote||statusText(selectedProject)}</p></section>
    <div className="inspector-stats"><div><b>{selectedProject.openIssues}</b><small>issues</small></div><div><b>{selectedProject.openPullRequests}</b><small>open PRs</small></div><div><b>{selectedProject.criticalIssues}</b><small>critical</small></div></div>
    <a className="inspector-link" href={selectedProject.url} target="_blank" rel="noreferrer">Open repository <span>↗</span></a><button className="inspector-action-button" type="button" onClick={()=>setActionOpen(true)}>ARIA Command <span>→</span></button>
  </aside>:null}
 </main>;
}
