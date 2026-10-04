import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { getProjectSnapshots, OWNER } from "@/lib/github";

export const runtime = "nodejs";

export async function GET() {
  if (!await hasSession()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const projects = await getProjectSnapshots();
  return NextResponse.json({
    owner: OWNER,
    hasGitHubToken: Boolean(process.env.GITHUB_TOKEN),
    projects,
    generatedAt: new Date().toISOString()
  });
}
