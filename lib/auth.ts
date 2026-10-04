import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { get, put } from "@vercel/blob";
import type { WebAuthnCredential } from "@simplewebauthn/server";

const SESSION_COOKIE="aria_session";
const CHALLENGE_COOKIE="aria_webauthn_challenge";
const PASSKEY_PATH="auth/passkeys.json";
const OWNER_ID="godtech-owner";
const SESSION_TTL=8*60*60;
const CHALLENGE_TTL=5*60;

export type StoredPasskey = {
  id:string;
  publicKey:string;
  counter:number;
  transports?:WebAuthnCredential["transports"];
  createdAt:string;
  lastUsedAt?:string;
};

type SignedPayload={exp:number;purpose:string;value:string};

function secret(){
  const value=process.env.ARIA_SESSION_SECRET;
  if(!value) throw new Error("ARIA_SESSION_SECRET is not configured.");
  return value;
}
function encode(value:SignedPayload){
  const body=Buffer.from(JSON.stringify(value)).toString("base64url");
  const sig=createHmac("sha256",secret()).update(body).digest("base64url");
  return body+"."+sig;
}
function decode(raw:string,purpose:string){
  const [body,sig]=raw.split(".");
  if(!body||!sig) return null;
  const expected=createHmac("sha256",secret()).update(body).digest("base64url");
  const a=Buffer.from(sig),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b)) return null;
  try{
    const payload=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as SignedPayload;
    if(payload.purpose!==purpose||payload.exp<Date.now()/1000) return null;
    return payload.value;
  }catch{return null;}
}
export function createSessionToken(){
  return encode({exp:Math.floor(Date.now()/1000)+SESSION_TTL,purpose:"session",value:OWNER_ID});
}
export function createChallengeToken(challenge:string,purpose:"authentication"|"registration"){
  return encode({exp:Math.floor(Date.now()/1000)+CHALLENGE_TTL,purpose:"webauthn:"+purpose,value:challenge});
}
export function readChallengeToken(raw:string|undefined,purpose:"authentication"|"registration"){
  return raw?decode(raw,"webauthn:"+purpose):null;
}
export async function hasSession(){
  try{
    const store=await cookies();
    const token=store.get(SESSION_COOKIE)?.value;
    return Boolean(token&&decode(token,"session"));
  }catch{return false;}
}
export const sessionCookieName=SESSION_COOKIE;
export const challengeCookieName=CHALLENGE_COOKIE;

export function sessionCookie(){
  return {
    name:SESSION_COOKIE,
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax" as const,
    path:"/",
    maxAge:SESSION_TTL
  };
}
export function challengeCookie(){
  return {
    name:CHALLENGE_COOKIE,
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"strict" as const,
    path:"/",
    maxAge:CHALLENGE_TTL
  };
}

function pinConfig(){
  const raw=process.env.ARIA_LOGIN_PIN_HASH;
  if(!raw) throw new Error("ARIA_LOGIN_PIN_HASH is not configured.");
  const [scheme,n,r,p,salt,hash]=raw.split("$");
  if(scheme!=="scrypt"||!n||!r||!p||!salt||!hash) throw new Error("Invalid ARIA_LOGIN_PIN_HASH format.");
  return {N:Number(n),r:Number(r),p:Number(p),salt,hash};
}
export function generatePinHash(pin:string){
  if(!/^\d{6}$/.test(pin)) throw new Error("PIN must contain exactly 6 digits.");
  const salt=randomBytes(16).toString("hex");
  const N=16384,r=8,p=1,keylen=32;
  return new Promise<string>((resolve,reject)=>{
    scryptCallback(pin,salt,keylen,{N,r,p,maxmem:32*1024*1024},(error,derived)=>{
      if(error)return reject(error);
      resolve(`scrypt${N}${r}${p}${salt}${Buffer.from(derived).toString("hex")}`);
    });
  });
}
export async function verifyPin(pin:string){
  if(!/^\d{6}$/.test(pin)) return false;
  const cfg=pinConfig();
  const derived=await new Promise<Buffer>((resolve,reject)=>scryptCallback(pin,cfg.salt,32,{N:cfg.N,r:cfg.r,p:cfg.p,maxmem:32*1024*1024},(error,result)=>{if(error)return reject(error);resolve(Buffer.from(result));}));
  const stored=Buffer.from(cfg.hash,"hex");
  return derived.length===stored.length&&timingSafeEqual(derived,stored);
}

export async function readPasskeys():Promise<StoredPasskey[]>{
  try{
    const result=await get(PASSKEY_PATH,{access:"private",useCache:false});
    if(!result)return [];
    const text=await new Response(result.stream).text();
    const parsed=JSON.parse(text) as {passkeys?:StoredPasskey[]};
    return Array.isArray(parsed.passkeys)?parsed.passkeys:[];
  }catch{
    return [];
  }
}
export async function writePasskeys(passkeys:StoredPasskey[]){
  await put(PASSKEY_PATH,JSON.stringify({passkeys}),{access:"private",allowOverwrite:true});
}

export function getRp(){
  return {
    rpName:"ARIA — gODtECH Command Center",
    rpID:process.env.ARIA_RP_ID??"godtech-cockpit.vercel.app",
    origin:process.env.ARIA_ORIGIN??"https://godtech-cockpit.vercel.app"
  };
}
