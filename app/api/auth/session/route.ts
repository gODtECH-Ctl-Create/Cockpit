import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";

export const runtime="nodejs";

export async function GET(){
  return NextResponse.json(
    {authenticated:await hasSession()},
    {headers:{"Cache-Control":"no-store"}}
  );
}
