import { NextResponse } from "next/server";
import { getProjectSnapshots, OWNER } from "@/lib/github";

export const runtime="nodejs";

export async function GET(){
  const projects=await getProjectSnapshots();
  const publicProjects=projects
    .filter(project=>project.visibility==="public"&&project.access==="ok")
    .map(project=>({
      name:project.name,
      fullName:project.fullName,
      url:project.url,
      description:project.description,
      lastCommit:project.lastCommit,
      openIssues:project.openIssues,
      criticalIssues:project.criticalIssues,
      openPullRequests:project.openPullRequests,
      ci:project.ci?{status:project.ci.status,conclusion:project.ci.conclusion,url:project.ci.url}:null,
      projectState:project.projectState,
      priority:project.priority,
      currentFocus:project.currentFocus,
      statusNote:project.statusNote,
      access:"ok" as const,
      staleDays:project.staleDays,
    }));
  return NextResponse.json({owner:OWNER,projects:publicProjects,generatedAt:new Date().toISOString(),public:true});
}
