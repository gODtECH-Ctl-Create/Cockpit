import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { getActionRegistry, proposeAction } from "@/lib/actions";

export const runtime = "nodejs";

export async function GET() {
  if (!await hasSession()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ actions: getActionRegistry() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await hasSession()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const input = await request.json();
    const action = await proposeAction(input);
    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not propose action." }, { status: 400 });
  }
}
