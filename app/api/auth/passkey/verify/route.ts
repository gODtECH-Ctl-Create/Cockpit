import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
  challengeCookie,
  challengeCookieName,
  createSessionToken,
  getRp,
  readChallengeToken,
  readPasskeys,
  sessionCookie,
  sessionCookieName,
  writePasskeys,
} from "@/lib/auth";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json();
    const challenge=readChallengeToken((await (await import("next/headers")).cookies()).get(challengeCookieName)?.value,"authentication");
    if(!challenge) return NextResponse.json({error:"The passkey challenge expired. Try again."},{status:400});

    const passkeys=await readPasskeys();
    const passkey=passkeys.find(item=>item.id===body?.id);
    if(!passkey) return NextResponse.json({error:"That passkey is not registered with ARIA."},{status:401});

    const {rpID,origin}=getRp();
    const verification=await verifyAuthenticationResponse({
      response:body,
      expectedChallenge:challenge,
      expectedOrigin:origin,
      expectedRPID:rpID,
      credential:{
        id:passkey.id,
        publicKey:Buffer.from(passkey.publicKey,"base64url"),
        counter:passkey.counter,
        transports:passkey.transports,
      },
    });
    if(!verification.verified) return NextResponse.json({error:"Face ID verification failed."},{status:401});

    passkey.counter=verification.authenticationInfo.newCounter;
    passkey.lastUsedAt=new Date().toISOString();
    await writePasskeys(passkeys);

    const response=NextResponse.json({ok:true});
    response.cookies.set(sessionCookieName,createSessionToken(),sessionCookie());
    response.cookies.delete(challengeCookieName);
    return response;
  }catch(error){
    console.error("Passkey verification failed",error);
    return NextResponse.json({error:"Unable to verify passkey."},{status:400});
  }
}
