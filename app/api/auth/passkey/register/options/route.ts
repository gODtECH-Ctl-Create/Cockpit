import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { challengeCookie, challengeCookieName, createChallengeToken, getRp, hasSession, readPasskeys } from "@/lib/auth";

export const runtime="nodejs";

export async function GET(){
  if(!await hasSession()) return NextResponse.json({error:"Authentication required."},{status:401});
  const passkeys=await readPasskeys();
  const {rpName,rpID}=getRp();
  const userID=new TextEncoder().encode("godtech-aria-owner");
  const options=await generateRegistrationOptions({
    rpName,
    rpID,
    userName:"gODtECH",
    userDisplayName:"gODtECH — ARIA Owner",
    userID,
    attestationType:"none",
    userVerification:"required",
    authenticatorSelection:{
      residentKey:"required",
      userVerification:"required",
    },
    excludeCredentials:passkeys.map(passkey=>({id:passkey.id,transports:passkey.transports})),
  });
  const response=NextResponse.json({options});
  response.cookies.set(challengeCookieName,createChallengeToken(options.challenge,"registration"),challengeCookie());
  return response;
}
