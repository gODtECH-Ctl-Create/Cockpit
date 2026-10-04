import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, sessionCookie, sessionCookieName, verifyPin } from "@/lib/auth";

const attempts=new Map<string,{count:number;blockedUntil:number}>();
const MAX_ATTEMPTS=5;
const LOCK_SECONDS=15*60;

function clientKey(){
  return "unknown";
}

export const runtime="nodejs";

export async function POST(request:Request){
  const key=clientKey();
  const now=Date.now();
  const state=attempts.get(key);
  if(state?.blockedUntil&&state.blockedUntil>now){
    return NextResponse.json({error:"Too many attempts. Try again later."},{status:429,headers:{"Retry-After":String(Math.ceil((state.blockedUntil-now)/1000))}});
  }

  try{
    const body=await request.json();
    const pin=String(body?.pin??"");
    if(!/^\d{6}$/.test(pin)) return NextResponse.json({error:"Enter exactly 6 digits."},{status:400});
    if(!process.env.ARIA_LOGIN_PIN_HASH) return NextResponse.json({error:"PIN fallback is not configured yet."},{status:503});
    const valid=await verifyPin(pin);
    if(!valid){
      const next={count:(state?.count??0)+1,blockedUntil:0};
      if(next.count>=MAX_ATTEMPTS) next.blockedUntil=now+LOCK_SECONDS*1000;
      attempts.set(key,next);
      return NextResponse.json({error:next.blockedUntil?"Too many attempts. Try again later.":"Incorrect PIN."},{status:401});
    }
    attempts.delete(key);
    const response=NextResponse.json({ok:true,passkeyConfigured:(await import("@/lib/auth")).readPasskeys().then(items=>items.length>0)});
    response.cookies.set(sessionCookieName,createSessionToken(),sessionCookie());
    return response;
  }catch(error){
    console.error("PIN login failed",error);
    return NextResponse.json({error:"Unable to verify PIN."},{status:400});
  }
}
