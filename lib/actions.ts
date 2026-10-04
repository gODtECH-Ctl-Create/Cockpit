import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { parse, stringify } from "yaml";
import { trackedProjects, type ProjectState } from "./projects";

export type ActionRisk = "normal" | "high" | "destructive";
export type ActionId =
  | "github.create_issue"
  | "github.update_project_state"
  | "github.create_branch";

export type ActionInput = {
  actionId: ActionId;
  repo: string;
  title?: string;
  body?: string;
  branchName?: string;
  state?: ProjectState;
  priority?: string;
  currentFocus?: string;
  nextStep?: string;
  statusNote?: string;
};

export type ProposedAction = ActionInput & {
  id: string;
  risk: ActionRisk;
  status: "proposed" | "approved" | "executing" | "succeeded" | "failed" | "rejected";
  createdAt: string;
  updatedAt: string;
  preview: string[];
  result?: { message: string; url?: string; commitSha?: string };
  error?: string;
};

type ActionLog = { actions: ProposedAction[] };
const ACTION_LOG_PATH = "auth/action-log.json";
const OWNER = process.env.GITHUB_OWNER ?? "gODtECH-Ctl-Create";

const registry: Record<ActionId, { label: string; risk: ActionRisk; description: string }> = {
  "github.create_issue": {
    label: "Create GitHub issue",
    risk: "normal",
    description: "Creates a new issue on the selected repository."
  },
  "github.update_project_state": {
    label: "Update project state",
    risk: "normal",
    description: "Updates .godtech/project.yml on the selected repository."
  },
  "github.create_branch": {
    label: "Create GitHub branch",
    risk: "normal",
    description: "Creates a new branch from the repository default branch."
  }
};

function token() {
  if (!process.env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not configured.");
  return process.env.GITHUB_TOKEN;
}

function assertRepo(repo: string) {
  const exists = trackedProjects.some((project) => project.fullName === repo);
  if (!exists) throw new Error("Repository is not tracked by Cockpit.");
}

async function github<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("https://api.github.com" + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token(),
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("GitHub " + response.status + ": " + detail.slice(0, 260));
  }
  return response.json() as Promise<T>;
}

async function readLog(): Promise<ActionLog> {
  try {
    const result = await get(ACTION_LOG_PATH, { access: "private", useCache: false });
    if (!result) return { actions: [] };
    const parsed = JSON.parse(await new Response(result.stream).text()) as ActionLog;
    return { actions: Array.isArray(parsed.actions) ? parsed.actions.slice(-100) : [] };
  } catch {
    return { actions: [] };
  }
}

async function writeLog(log: ActionLog) {
  await put(ACTION_LOG_PATH, JSON.stringify(log), {
    access: "private",
    allowOverwrite: true
  });
}

async function audit(action: ProposedAction) {
  const log = await readLog();
  const index = log.actions.findIndex((item) => item.id === action.id);
  if (index >= 0) log.actions[index] = action;
  else log.actions.push(action);
  await writeLog({ actions: log.actions.slice(-100) });
}

function preview(input: ActionInput): string[] {
  switch (input.actionId) {
    case "github.create_issue":
      return [
        "Create issue on " + input.repo,
        'Title: "' + String(input.title ?? "").trim() + '"',
        input.body?.trim() ? "Body: " + input.body.trim() : "Body: none"
      ];
    case "github.update_project_state":
      return [
        "Update .godtech/project.yml on " + input.repo,
        "State: " + String(input.state ?? "unknown"),
        input.priority ? "Priority: " + input.priority : "Priority: unchanged",
        input.currentFocus ? "Focus: " + input.currentFocus : "Focus: unchanged",
        input.nextStep ? "Next step: " + input.nextStep : "Next step: unchanged",
        input.statusNote ? "Status note: " + input.statusNote : "Status note: unchanged"
      ];
    case "github.create_branch":
      return [
        "Create branch on " + input.repo,
        "Branch: " + String(input.branchName ?? "")
      ];
  }
}

export function getActionRegistry() {
  return Object.entries(registry).map(([id, value]) => ({ id, ...value }));
}

export async function proposeAction(input: ActionInput): Promise<ProposedAction> {
  assertRepo(input.repo);
  const definition = registry[input.actionId];
  if (!definition) throw new Error("Unknown ARIA action.");
  if (input.actionId === "github.create_issue" && !input.title?.trim()) {
    throw new Error("Issue title is required.");
  }
  if (input.actionId === "github.create_branch" && !/^[A-Za-z0-9._/-]{1,80}$/.test(input.branchName ?? "")) {
    throw new Error("Enter a valid branch name.");
  }
  if (input.actionId === "github.update_project_state" && !input.state) {
    throw new Error("Project state is required.");
  }

  const now = new Date().toISOString();
  const action: ProposedAction = {
    ...input,
    id: randomUUID(),
    risk: definition.risk,
    status: "proposed",
    createdAt: now,
    updatedAt: now,
    preview: preview(input)
  };
  await audit(action);
  return action;
}

async function createIssue(input: ActionInput) {
  const result = await github<{ html_url: string; number: number }>(
    "/repos/" + input.repo + "/issues",
    {
      method: "POST",
      body: JSON.stringify({ title: input.title?.trim(), body: input.body?.trim() || undefined })
    }
  );
  return { message: "GitHub issue #" + result.number + " created.", url: result.html_url };
}

async function createBranch(input: ActionInput) {
  const repository = await github<{ default_branch: string }>("/repos/" + input.repo);
  const reference = await github<{ object: { sha: string } }>(
    "/repos/" + input.repo + "/git/ref/heads/" + encodeURIComponent(repository.default_branch)
  );
  const result = await github<{ ref: string }>("/repos/" + input.repo + "/git/refs", {
    method: "POST",
    body: JSON.stringify({ ref: "refs/heads/" + input.branchName, sha: reference.object.sha })
  });
  return { message: "Branch " + input.branchName + " created.", url: "https://github.com/" + input.repo + "/tree/" + encodeURIComponent(input.branchName ?? ""), commitSha: reference.object.sha };
}

async function updateProjectState(input: ActionInput) {
  const path = "/repos/" + input.repo + "/contents/.godtech/project.yml";
  const current = await github<{ content: string; sha: string }>(path);
  const raw = Buffer.from(current.content.replace(/\n/g, ""), "base64").toString("utf8");
  const doc = (parse(raw) ?? {}) as Record<string, unknown>;
  const project = (doc.project ?? {}) as Record<string, unknown>;
  project.state = input.state;
  if (input.priority) project.priority = input.priority;
  if (input.currentFocus) project.current_focus = input.currentFocus;
  if (input.nextStep) project.next_step = input.nextStep;
  if (input.statusNote) project.status_note = input.statusNote;
  project.last_worked_on = new Date().toISOString().slice(0, 10);
  doc.project = project;
  const updated = stringify(doc);
  const result = await github<{ commit: { sha: string } }>(path, {
    method: "PUT",
    body: JSON.stringify({
      message: "chore: update project state via ARIA",
      content: Buffer.from(updated).toString("base64"),
      sha: current.sha
    })
  });
  const repository = await github<{ default_branch: string }>("/repos/" + input.repo); return { message: "Project state updated on GitHub.", url: "https://github.com/" + input.repo + "/blob/" + encodeURIComponent(repository.default_branch) + "/.godtech/project.yml", commitSha: result.commit.sha };
}

export async function executeAction(action: ProposedAction): Promise<ProposedAction> {
  if (action.status !== "proposed") throw new Error("This action is no longer awaiting approval.");
  const executing = { ...action, status: "executing" as const, updatedAt: new Date().toISOString() };
  await audit(executing);

  try {
    let result: ProposedAction["result"];
    switch (action.actionId) {
      case "github.create_issue":
        result = await createIssue(action);
        break;
      case "github.create_branch":
        result = await createBranch(action);
        break;
      case "github.update_project_state":
        result = await updateProjectState(action);
        break;
    }
    const succeeded = { ...executing, status: "succeeded" as const, updatedAt: new Date().toISOString(), result };
    await audit(succeeded);
    return succeeded;
  } catch (error) {
    const failed = {
      ...executing,
      status: "failed" as const,
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Action failed."
    };
    await audit(failed);
    return failed;
  }
}

export async function rejectAction(action: ProposedAction) {
  if (action.status !== "proposed") throw new Error("This action is no longer awaiting approval.");
  const rejected = { ...action, status: "rejected" as const, updatedAt: new Date().toISOString() };
  await audit(rejected);
  return rejected;
}

export async function getAction(id: string) {
  const log = await readLog();
  return log.actions.find((item) => item.id === id) ?? null;
}

export const ACTION_OWNER = OWNER;
