import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import {
  challengeCookie,
  challengeCookieName,
  getRp,
  hasSession,
  readChallengeToken,
  readPasskeys,
  writePasskeys,
} from "@/lib/auth";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    if(!await hasSession()) return NextResponse.json({error:"Authentication required."},{status:401});
    const challenge=readChallengeToken((await cookies()).get(challengeCookieName)?.value,"registration");
    if(!challenge) return NextResponse.json({error:"The passkey registration challenge expired. Try again."},{status:400});
    const body=await request.json();
    const passkeys=await readPasskeys();
    if(passkeys.length>=10) return NextResponse.json({error:"ARIA already has the maximum number of passkeys."},{status:409});

    const {rpID,origin}=getRp();
    const verification=await verifyRegistrationResponse({
      response:body,
      expectedChallenge:challenge,
      expectedOrigin:origin,
      expectedRPID:rpID,
      requireUserVerification:true,
    });
    if(!verification.verified||!verification.registrationInfo){
      return NextResponse.json({error:"Could not verify this device passkey."},{status:400});
    }

    const {credential}=verification.registrationInfo;
    if(passkeys.some(item=>item.id===credential.id)){
      return NextResponse.json({error:"This passkey is already enrolled."},{status:409});
    }
    passkeys.push({
      id:credential.id,
      publicKey:Buffer.from(credential.publicKey).toString("base64url"),
      counter:credential.counter,
      transports:credential.transports,
      createdAt:new Date().toISOString(),
    });
    await writePasskeys(passkeys);

    const response=NextResponse.json({ok:true});
    response.cookies.delete(challengeCookieName);
    return response;
  }catch(error){
    console.error("Passkey registration failed",error);
    return NextResponse.json({error:"Unable to register this passkey."},{status:400});
  }
}
