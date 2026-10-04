import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { executeAction, getAction, rejectAction } from "@/lib/actions";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!await hasSession()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const action = await getAction(id);
  return action
    ? NextResponse.json({ action }, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "Action not found." }, { status: 404 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await hasSession()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const action = await getAction(id);
  if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.decision === "reject") {
      return NextResponse.json({ action: await rejectAction(action) });
    }
    if (body?.decision !== "approve") {
      return NextResponse.json({ error: "Approval decision required." }, { status: 400 });
    }
    return NextResponse.json({ action: await executeAction(action) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not process action." }, { status: 400 });
  }
}
