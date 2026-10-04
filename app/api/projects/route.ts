import { NextResponse } from "next/server";
import { getProjectSnapshots, OWNER } from "@/lib/github";

export const runtime = "nodejs";

export async function GET() {
  const projects = await getProjectSnapshots();
  return NextResponse.json({
    owner: OWNER,
    hasGitHubToken: Boolean(process.env.GITHUB_TOKEN),
    projects,
    generatedAt: new Date().toISOString()
  });
}
