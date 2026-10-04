import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { challengeCookie, challengeCookieName, createChallengeToken, getRp, readPasskeys } from "@/lib/auth";

export const runtime="nodejs";

export async function GET(){
  const passkeys=await readPasskeys();
  if(!passkeys.length){
    return NextResponse.json({error:"No Face ID/passkey is enrolled yet. Use your 6-digit PIN to unlock and enroll this device."},{status:404});
  }
  const {rpID}=getRp();
  const options=await generateAuthenticationOptions({
    rpID,
    userVerification:"required",
    allowCredentials:passkeys.map(passkey=>({id:passkey.id,transports:passkey.transports})),
  });
  const response=NextResponse.json({options});
  response.cookies.set(challengeCookieName,createChallengeToken(options.challenge,"authentication"),challengeCookie());
  return response;
}
