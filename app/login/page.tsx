"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage(){
  const router=useRouter();
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const loginWithPin=async()=>{
    setError("");
    if(!/^\d{6}$/.test(pin)){setError("Enter exactly 6 digits.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/auth/pin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"PIN verification failed.");
      router.replace("/");
    }catch(e){
      setError(e instanceof Error?e.message:"PIN verification failed.");
    }finally{setBusy(false);}
  };

  return <main className="login-shell">
    <div className="login-glow"/>
    <section className="login-card">
      <div className="neural-brand-mark">A</div>
      <span className="login-kicker">PRIVATE ARIA ACCESS</span>
      <h1>Unlock ARIA.</h1>
      <p>Enter your 6-digit ARIA PIN to unlock the private neural map and its command controls.</p>

      <div className="login-methods">
        <div className="pin-panel">
          <label htmlFor="aria-pin">ARIA PIN</label>
          <div className="pin-field">
            <input
              id="aria-pin"
              value={pin}
              onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))}
              onKeyDown={e=>{if(e.key==="Enter")void loginWithPin();}}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              placeholder="••••••"
              autoFocus
              aria-label="6 digit ARIA PIN"
            />
            <button type="button" onClick={()=>void loginWithPin()} disabled={busy||pin.length!==6}>
              {busy?"Unlocking…":"Unlock"}
            </button>
          </div>
        </div>
      </div>

      {error?<div className="login-error" role="alert">{error}</div>:null}
      <footer className="login-footer"><Link href="/">← Public operation map</Link><span>Protected by 6-digit PIN</span></footer>
    </section>
  </main>;
}
