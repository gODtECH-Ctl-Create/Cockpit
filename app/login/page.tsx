"use client";

import Link from "next/link";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage(){
  const router=useRouter();
  const [mode,setMode]=useState<"passkey"|"pin">("passkey");
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [pinVerified,setPinVerified]=useState(false);
  const [passkeyReady,setPasskeyReady]=useState(false);

  const loginWithPasskey=async()=>{
    setError("");setBusy(true);
    try{
      if(!window.isSecureContext||!navigator.credentials){
        throw new Error("Passkeys require a secure browser connection.");
      }
      const optionsResponse=await fetch("/api/auth/passkey/options",{cache:"no-store"});
      const options=await optionsResponse.json();
      if(optionsResponse.status===404){setMode("pin"); throw new Error(options.error||"No Face ID passkey is enrolled yet. Use your 6-digit PIN once to enable it.");} if(!optionsResponse.ok) throw new Error(options.error||"Face ID verification could not start.");
      const credential=await startAuthentication({optionsJSON:options.options});
      const verifyResponse=await fetch("/api/auth/passkey/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(credential)});
      const result=await verifyResponse.json();
      if(!verifyResponse.ok) throw new Error(result.error||"Face ID verification failed.");
      router.replace("/");
    }catch(e){
      setError(e instanceof Error?e.message:"Passkey login failed.");
    }finally{setBusy(false);}
  };

  const loginWithPin=async()=>{
    setError("");
    if(!/^\d{6}$/.test(pin)){setError("Enter exactly 6 digits.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/auth/pin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"PIN verification failed.");
      setPinVerified(true);
      if(result.passkeyConfigured) setPasskeyReady(true);
    }catch(e){
      setError(e instanceof Error?e.message:"PIN verification failed.");
    }finally{setBusy(false);}
  };

  const enrollPasskey=async()=>{
    setError("");setBusy(true);
    try{
      const optionsResponse=await fetch("/api/auth/passkey/register/options",{cache:"no-store"});
      const options=await optionsResponse.json();
      if(!optionsResponse.ok) throw new Error(options.error||"Could not start Face ID enrollment.");
      const credential=await startRegistration({optionsJSON:options.options});
      const verifyResponse=await fetch("/api/auth/passkey/register/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(credential)});
      const result=await verifyResponse.json();
      if(!verifyResponse.ok) throw new Error(result.error||"Could not enroll this device.");
      router.replace("/workspace");
    }catch(e){
      setError(e instanceof Error?e.message:"Face ID enrollment failed.");
    }finally{setBusy(false);}
  };

  return <main className="login-shell">
    <div className="login-glow"/>
    <section className="login-card">
      <div className="neural-brand-mark">A</div>
      <span className="login-kicker">PRIVATE ARIA ACCESS</span>
      <h1>{pinVerified?"Device unlocked.":"Login to ARIA."}</h1>
      <p>{pinVerified?"This session is authenticated. Return to the neural map, or add Face ID on this device for faster login.":"Use your device passkey for biometric login, or fall back to your 6-digit ARIA PIN."}</p>

      {!pinVerified?<div className="login-methods">
        <button className="login-biometric" type="button" onClick={()=>void loginWithPasskey()} disabled={busy}>
          <span className="face-glyph">◉</span>
          <span><strong>{busy&&mode==="passkey"?"Waiting for device…":"Continue with Face ID"}</strong><small>Passkey / device biometric</small></span>
          <b>→</b>
        </button>
        <div className="login-divider"><span>OR</span></div>
        {mode==="passkey"?<button className="login-alt" type="button" onClick={()=>setMode("pin")}>Use 6-digit PIN instead</button>:<div className="pin-panel">
          <label htmlFor="aria-pin">ARIA PIN</label>
          <div className="pin-field">
            <input id="aria-pin" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={e=>{if(e.key==="Enter")void loginWithPin();}} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" placeholder="••••••" autoFocus aria-label="6 digit ARIA PIN"/>
            <button type="button" onClick={()=>void loginWithPin()} disabled={busy||pin.length!==6}>{busy&&mode==="pin"?"…":"Unlock"}</button>
          </div>
          <button className="login-alt back" type="button" onClick={()=>setMode("passkey")}>← Back to Face ID</button>
        </div>}
      </div>:<div className="login-unlocked">
        <div className="login-status success"><span/>PIN verified</div>
        <button className="login-primary" type="button" onClick={()=>void enrollPasskey()} disabled={busy}>
          {busy?"Waiting for Face ID…":"Enable Face ID on this device"}
        </button>
        {passkeyReady?<small className="login-hint">ARIA already has a passkey. You can add another device passkey.</small>:null}
        <Link className="login-secondary" href="/">Return to neural map →</Link>
      </div>}

      {error?<div className="login-error" role="alert">{error}</div>:null}
      <footer className="login-footer"><Link href="/">← Public operation map</Link><span>Protected by device passkeys + 6-digit fallback</span></footer>
    </section>
  </main>;
}
