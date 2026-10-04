import { trackedProjects, type ProjectState } from "./projects";
import { parse } from "yaml";

type GitHubRepo = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  pushed_at: string | null;
  stargazers_count: number;
  open_issues_count: number;
  archived: boolean;
};

type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: { message: string; committer: { date: string | null } | null };
};

type GitHubIssue = { number: number; title: string; html_url: string; labels: Array<{ name: string }> };

type GitHubRun = { status: string; conclusion: string | null; html_url: string; name: string; created_at: string };

export type ProjectSnapshot = {
  name: string;
  fullName: string;
  group: "core" | "professional";
  access: "ok" | "private-unavailable" | "error";
  visibility: "public" | "private" | "unknown";
  url: string;
  description: string;
  defaultBranch: string;
  archived: boolean;
  lastCommit: { sha: string; message: string; date: string | null; url: string } | null;
  openIssues: number;
  criticalIssues: number;
  openPullRequests: number;
  ci: { status: string; conclusion: string | null; url: string } | null;
  projectState: ProjectState;
  priority: string;
  currentFocus: string;
  nextStep: string;
  blockers: string[];
  statusNote: string;
  stateSource: "project.yml" | "derived";
  staleDays: number | null;
};

const OWNER = process.env.GITHUB_OWNER ?? "gODtECH-Ctl-Create";
const TOKEN = process.env.GITHUB_TOKEN;

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      "X-GitHub-Api-Version": "2022-11-28"
    },
    next: { revalidate: 120 }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

function daysSince(value: string | null) {
  if (!value) return null;
  const ms = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function labelPriority(labels: GitHubIssue["labels"]) {
  return labels.some((l) => /critical|priority:critical|p0/i.test(l.name));
}

async function readProjectState(repo: string) {
  try {
    const data = await gh<{ content: string }>("/repos/" + repo + "/contents/.godtech/project.yml");
    const yamlText = Buffer.from(data.content, "base64").toString("utf8");
    const parsed = parse(yamlText) as Record<string, any>;
    const project = parsed?.project ?? {};
    return {
      projectState: (project.state ?? "unknown") as ProjectState,
      priority: String(project.priority ?? "normal"),
      currentFocus: String(project.current_focus ?? ""),
      nextStep: String(project.next_step ?? ""),
      blockers: Array.isArray(project.blockers) ? project.blockers.map(String) : [],
      statusNote: String(project.status_note ?? ""),
      source: "project.yml" as const,
      lastWorkedOn: typeof project.last_worked_on === "string" && project.last_worked_on ? project.last_worked_on : null
    };
  } catch {
    return {
      projectState: "unknown" as ProjectState,
      priority: "normal",
      currentFocus: "",
      nextStep: "",
      blockers: [],
      statusNote: "",
      source: "derived" as const,
      lastWorkedOn: null
    };
  }
}

async function snapshot(project: typeof trackedProjects[number]): Promise<ProjectSnapshot> {
  try {
    const repo = await gh<GitHubRepo>("/repos/" + project.fullName);
    const [commits, issues, prs, runs, state] = await Promise.all([
      gh<GitHubCommit[]>(`/repos/${project.fullName}/commits?per_page=1`),
      gh<GitHubIssue[]>(`/repos/${project.fullName}/issues?state=open&per_page=100`),
      gh<GitHubIssue[]>(`/repos/${project.fullName}/pulls?state=open&per_page=100`),
      gh<{ workflow_runs: GitHubRun[] }>(`/repos/${project.fullName}/actions/runs?per_page=1`).catch(() => ({ workflow_runs: [] })),
      readProjectState(project.fullName)
    ]);

    const last = commits[0] ?? null;
    const criticalIssues = issues.filter((x) => !("pull_request" in x) && labelPriority(x.labels)).length;
    const lastDate = last?.commit.committer?.date ?? repo.pushed_at;
    const derivedState: ProjectState =
      repo.archived ? "archived" :
      state.projectState !== "unknown" ? state.projectState :
      criticalIssues > 0 ? "active" :
      daysSince(lastDate) !== null && (daysSince(lastDate) as number) > 30 ? "dormant" :
      "active";

    return {
      name: project.name,
      fullName: project.fullName,
      group: project.group,
      access: "ok",
      visibility: repo.private ? "private" : "public",
      url: repo.html_url,
      description: repo.description ?? "",
      defaultBranch: repo.default_branch,
      archived: repo.archived,
      lastCommit: last ? {
        sha: last.sha,
        message: last.commit.message.split("\n")[0],
        date: last.commit.committer?.date ?? null,
        url: last.html_url
      } : null,
      openIssues: issues.filter((x) => !("pull_request" in x)).length,
      criticalIssues,
      openPullRequests: prs.length,
      ci: runs.workflow_runs[0] ? {
        status: runs.workflow_runs[0].status,
        conclusion: runs.workflow_runs[0].conclusion,
        url: runs.workflow_runs[0].html_url
      } : null,
      projectState: derivedState,
      priority: state.priority,
      currentFocus: state.currentFocus,
      nextStep: state.nextStep,
      blockers: state.blockers,
      statusNote: state.statusNote,
      stateSource: state.source,
      lastWorkedOn: state.lastWorkedOn,
      staleDays: state.source === "project.yml"
        ? daysSince(state.lastWorkedOn ?? lastDate)
        : daysSince(lastDate)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read repository";
    return {
      name: project.name,
      fullName: project.fullName,
      group: project.group,
      access: /GitHub 401|GitHub 403|GitHub 404/i.test(message) ? "private-unavailable" : "error",
      visibility: "unknown",
      url: `https://github.com/${project.fullName}`,
      description: TOKEN ? "Repository data could not be loaded." : "Set GITHUB_TOKEN to include private repositories.",
      defaultBranch: "unknown",
      archived: false,
      lastCommit: null,
      openIssues: 0,
      criticalIssues: 0,
      openPullRequests: 0,
      ci: null,
      projectState: "unknown",
      priority: "unknown",
      currentFocus: "",
      nextStep: "",
      blockers: [],
      statusNote: message,
      stateSource: "derived",
      lastWorkedOn: null,
      staleDays: null
    };
  }
}

export async function getProjectSnapshots() {
  const results = await Promise.all(trackedProjects.map(snapshot));
  return results.sort((a, b) => {
    const priority = (value: string) => ({ critical: 0, high: 1, medium: 2, normal: 3, low: 4 }[value.toLowerCase()] ?? 5);
    return priority(a.priority) - priority(b.priority) || a.name.localeCompare(b.name);
  });
}

export { OWNER };
