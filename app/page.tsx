"use client";

import { useEffect, useMemo, useState } from "react";

type Project = {
  name: string; fullName: string; group: "core" | "professional"; access: string; visibility: string;
  url: string; description: string; defaultBranch: string; archived: boolean;
  lastCommit: { sha: string; message: string; date: string | null; url: string } | null;
  openIssues: number; criticalIssues: number; openPullRequests: number;
  ci: { status: string; conclusion: string | null; url: string } | null;
  projectState: string; priority: string; currentFocus: string; nextStep: string;
  blockers: string[]; statusNote: string; stateSource: string; staleDays: number | null;
};
type ProjectResponse = { owner: string; hasGitHubToken: boolean; projects: Project[]; generatedAt: string };

const stateLabel: Record<string,string> = { active:"ACTIVE", paused:"PAUSED", blocked:"BLOCKED", partial:"PARTIAL", shipped:"SHIPPED", dormant:"DORMANT", archived:"ARCHIVED", unknown:"UNKNOWN" };

function ageText(days: number | null) {
  if (days === null) return "No commit data";
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return days + " days ago";
}

export default function Home() {
  const [data, setData] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      setData(await response.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function ask() {
    if (!data || !question.trim()) return;
    setAsking(true); setAnswer("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, projects: data.projects })
      });
      const result = await response.json();
      setAnswer(result.answer ?? result.error ?? "No response.");
    } finally { setAsking(false); }
  }

  const projects = useMemo(() => {
    if (!data) return [];
    return filter === "all" ? data.projects : data.projects.filter((p) => p.projectState === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    const all = data?.projects ?? [];
    return {
      total: all.length, active: all.filter((p) => p.projectState === "active").length,
      blocked: all.filter((p) => p.projectState === "blocked").length,
      partial: all.filter((p) => p.projectState === "partial").length,
      shipped: all.filter((p) => p.projectState === "shipped").length,
      critical: all.filter((p) => p.priority.toLowerCase() === "critical" || p.criticalIssues > 0).length
    };
  }, [data]);

  const attention = useMemo(() => (data?.projects ?? []).filter(
    (p) => p.access !== "ok" || p.projectState === "blocked" || p.criticalIssues > 0 || (p.staleDays ?? 0) > 30
  ), [data]);

  const recommended = useMemo(() => (data?.projects ?? [])
    .filter((p) => p.access === "ok" && p.projectState !== "shipped" && p.projectState !== "archived")
    .slice(0, 6), [data]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">gODtECH / CONTROL CENTER</div>
          <h1>Cockpit</h1>
          <p className="subtitle">One place to see what you&apos;re building, what needs attention, and what should move next.</p>
        </div>
        <button className="ghost" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </header>

      {!data && loading ? <div className="loading">Reading your project graph…</div> : null}

      {data && !data.hasGitHubToken ? (
        <div className="notice"><strong>Public repository mode.</strong> Set <code>GITHUB_TOKEN</code> on the server to include private repositories.</div>
      ) : null}

      {data ? (
        <>
          <section className="stats">
            <article><span>Tracked</span><strong>{counts.total}</strong></article>
            <article><span>Active</span><strong>{counts.active}</strong></article>
            <article><span>Critical attention</span><strong>{counts.critical}</strong></article>
            <article><span>Blocked</span><strong>{counts.blocked}</strong></article>
            <article><span>Partial</span><strong>{counts.partial}</strong></article>
            <article><span>Shipped</span><strong>{counts.shipped}</strong></article>
          </section>

          <section className="grid two">
            <div className="panel">
              <div className="panel-head"><div><span className="eyebrow">PRIORITY NOW</span><h2>Projects to look at</h2></div></div>
              <div className="stack">
                {recommended.map((p) => (
                  <a className="recommendation" key={p.fullName} href={p.url} target="_blank" rel="noreferrer">
                    <div className="priority-line">
                      <span className={"dot " + p.priority.toLowerCase()} />
                      <strong>{p.name}</strong><span className="badge">{p.priority}</span>
                    </div>
                    <div className="focus">{p.currentFocus || p.description || "No project focus recorded yet."}</div>
                    <div className="muted">{p.nextStep || "Review project state."}</div>
                  </a>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><div><span className="eyebrow">ATTENTION</span><h2>Needs a look</h2></div></div>
              <div className="stack">
                {attention.length === 0 ? <p className="muted">Nothing urgent surfaced.</p> : attention.map((p) => (
                  <a className="attention" key={p.fullName} href={p.url} target="_blank" rel="noreferrer">
                    <div><strong>{p.name}</strong><span>
                      {p.access !== "ok" ? "Private access unavailable" : p.projectState === "blocked" ? "Blocked" : p.criticalIssues > 0 ? p.criticalIssues + " critical issue(s)" : "Inactive for " + p.staleDays + " days"}
                    </span></div><span>↗</span>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="panel ai-panel">
            <div className="panel-head">
              <div><span className="eyebrow">OPTIONAL AI</span><h2>Ask Cockpit</h2></div>
              <span className="muted">NVIDIA reasoning layer</span>
            </div>
            <div className="ask-row">
              <input value={question} onChange={(e)=>setQuestion(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") void ask();}} placeholder="Which project should I prioritize today?" />
              <button className="primary" onClick={() => void ask()} disabled={asking || !question.trim()}>{asking ? "Thinking…" : "Ask"}</button>
            </div>
            {answer ? <div className="answer">{answer}</div> : <p className="muted">AI is only for interpretation. GitHub facts and project state remain the source of truth.</p>}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div><span className="eyebrow">PROJECT GRAPH</span><h2>Tracked repositories</h2></div>
              <div className="filters">
                {["all","active","paused","blocked","partial","shipped","dormant"].map((value) => (
                  <button key={value} className={filter===value ? "filter active" : "filter"} onClick={()=>setFilter(value)}>{value}</button>
                ))}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Project</th><th>State</th><th>Priority</th><th>Focus</th><th>Next</th><th>GitHub</th></tr></thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.fullName}>
                      <td><div className="project-name"><strong>{p.name}</strong><span>{p.group}</span></div></td>
                      <td><span className={"state " + p.projectState}>{stateLabel[p.projectState] ?? p.projectState}</span></td>
                      <td>{p.priority}</td><td>{p.currentFocus || "—"}</td><td>{p.nextStep || "—"}</td>
                      <td><a href={p.url} target="_blank" rel="noreferrer">Open ↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer>Updated {new Date(data.generatedAt).toLocaleString()} · state source is <code>.godtech/project.yml</code> when available.</footer>
        </>
      ) : null}
    </main>
  );
}
