"use client";

import { useState } from "react";

type Project = { fullName:string; name:string; projectState:string; priority:string; currentFocus:string; nextStep?:string; statusNote:string };
type Action = {
  id:string;
  actionId:string;
  repo:string;
  risk:"normal"|"high"|"destructive";
  status:string;
  preview:string[];
  result?:{message:string;url?:string;commitSha?:string};
  error?:string;
};

type Props = { project:Project; onClose:()=>void; onCompleted:()=>void };

const states=["active","paused","blocked","partial","shipped","dormant","archived"];

export default function NeuralActionConsole({project,onClose,onCompleted}:Props){
  const [actionId,setActionId]=useState<Action["actionId"]>("github.create_issue");
  const [title,setTitle]=useState("");
  const [body,setBody]=useState("");
  const [branchName,setBranchName]=useState("");
  const [state,setState]=useState(project.projectState);
  const [focus,setFocus]=useState(project.currentFocus);
  const [nextStep,setNextStep]=useState(project.nextStep??"");
  const [statusNote,setStatusNote]=useState(project.statusNote);
  const [proposed,setProposed]=useState<Action|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function propose(){
    setBusy(true);setMessage("");
    try{
      const payload:any={actionId,repo:project.fullName};
      if(actionId==="github.create_issue")Object.assign(payload,{title,body});
      if(actionId==="github.create_branch")Object.assign(payload,{branchName});
      if(actionId==="github.update_project_state")Object.assign(payload,{state,currentFocus:focus,nextStep,statusNote});
      const response=await fetch("/api/actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Could not propose action.");
      setProposed(result.action);
    }catch(e){setMessage(e instanceof Error?e.message:"Could not propose action.");}
    finally{setBusy(false)}
  }

  async function decide(decision:"approve"|"reject"){
    if(!proposed)return;
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/actions/"+proposed.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Could not process action.");
      setProposed(result.action);
      if(result.action.status==="succeeded"){setMessage(result.action.result?.message||"Action executed.");onCompleted();}
      if(result.action.status==="rejected")setMessage("Action rejected and recorded in the audit trail.");
    }catch(e){setMessage(e instanceof Error?e.message:"Could not process action.");}
    finally{setBusy(false)}
  }

  return <div className="action-console">
    <div className="action-console-head">
      <div><span className="eyebrow">ARIA ACTION ENGINE</span><h3>{project.name}</h3><small>Every mutation is previewed before execution.</small></div>
      <button className="inspector-close" type="button" onClick={onClose} aria-label="Close action console">×</button>
    </div>

    {!proposed?<>
      <label className="action-field"><span>ACTION</span><select value={actionId} onChange={e=>setActionId(e.target.value as Action["actionId"])}>
        <option value="github.create_issue">Create GitHub issue</option>
        <option value="github.update_project_state">Update project state</option>
        <option value="github.create_branch">Create GitHub branch</option>
      </select></label>

      {actionId==="github.create_issue"?<>
        <label className="action-field"><span>TITLE</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What should ARIA create?" /></label>
        <label className="action-field"><span>BODY</span><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Context, acceptance criteria, or notes." rows={5}/></label>
      </>:null}

      {actionId==="github.create_branch"?<label className="action-field"><span>BRANCH</span><input value={branchName} onChange={e=>setBranchName(e.target.value)} placeholder="feature/aria-task" /></label>:null}

      {actionId==="github.update_project_state"?<>
        <label className="action-field"><span>STATE</span><select value={state} onChange={e=>setState(e.target.value)}>{states.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
        <label className="action-field"><span>CURRENT FOCUS</span><input value={focus} onChange={e=>setFocus(e.target.value)} /></label>
        <label className="action-field"><span>NEXT STEP</span><input value={nextStep} onChange={e=>setNextStep(e.target.value)} /></label>
        <label className="action-field"><span>STATUS NOTE</span><textarea value={statusNote} onChange={e=>setStatusNote(e.target.value)} rows={3}/></label>
      </>:null}

      <button className="action-propose" type="button" onClick={()=>void propose()} disabled={busy}>
        {busy?"Preparing preview…":"Preview action →"}
      </button>
    </>:<div className="action-preview">
      <div className="action-risk"><span>PROPOSED</span><b>{proposed.risk.toUpperCase()} RISK</b></div>
      <div className="action-preview-list">{proposed.preview.map((line,i)=><div key={i}>{line}</div>)}</div>
      {proposed.status==="proposed"?<>
        <p>Nothing has changed on GitHub yet. Approve this exact action to execute it.</p>
        <div className="action-decision"><button type="button" onClick={()=>void decide("reject")} disabled={busy}>Reject</button><button type="button" onClick={()=>void decide("approve")} disabled={busy}>Approve & execute</button></div>
      </>:<div className={proposed.status==="succeeded"?"action-result":"action-error"}>{proposed.result?.message||proposed.error||"Action "+proposed.status+"."}</div>}
      <button className="action-reset" type="button" onClick={()=>setProposed(null)}>← Build another action</button>
    </div>}
    {message?<div className="action-message" role="status">{message}</div>:null}
  </div>;
}
