import { NextResponse } from "next/server";
import { hasSession, readPasskeys } from "@/lib/auth";

export const runtime="nodejs";

export async function GET(){
  const authenticated=await hasSession();
  return NextResponse.json({
    authenticated,
    passkeyConfigured:authenticated ? (await readPasskeys()).length>0 : false,
  },{headers:{"Cache-Control":"no-store"}});
}
