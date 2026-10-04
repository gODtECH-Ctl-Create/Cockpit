"use client";

import { useEffect, useMemo, useState } from "react";

type Project = {
  name: string;
  fullName: string;
  group: "core" | "professional";
  access: string;
  visibility: string;
  url: string;
  description: string;
  defaultBranch: string;
  archived: boolean;
  lastCommit: { sha: string; message: string; date: string | null; url: string } | null;
  openIssues: number;
  criticalIssues: number;
  openPullRequests: number;
  ci: { status: string; conclusion: string | null; url: string } | null;
  projectState: string;
  priority: string;
  currentFocus: string;
  nextStep: string;
  blockers: string[];
  statusNote: string;
  stateSource: string;
  lastWorkedOn: string | null;
  staleDays: number | null;
};

type ProjectResponse = {
  owner: string;
  hasGitHubToken: boolean;
  projects: Project[];
  generatedAt: string;
};

const stateLabel: Record<string, string> = {
  active: "ACTIVE",
  paused: "PAUSED",
  blocked: "BLOCKED",
  partial: "PARTIAL",
  shipped: "SHIPPED",
  dormant: "DORMANT",
  archived: "ARCHIVED",
  unknown: "UNKNOWN",
};

const priorityRank: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  normal: 3,
  low: 4,
};

function ageText(days: number | null) {
  if (days === null) return "No recent activity";
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return days + " days ago";
}

function priorityTone(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "normal";
}

function projectStatus(p: Project) {
  if (p.access !== "ok") return "Access needs attention";
  if (p.projectState === "blocked") return "Blocked";
  if (p.criticalIssues > 0) return p.criticalIssues + " critical issue(s)";
  if ((p.staleDays ?? 0) > 30) return "Inactive for " + p.staleDays + " days";
  if (p.ci?.conclusion === "failure") return "Latest workflow failed";
  return "Looks healthy";
}

export default function Home() {
  const [data, setData] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [filter, setFilter] = useState("all");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      setData(await response.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setSelectedProject(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function ask() {
    if (!data || !question.trim()) return;
    setAsking(true);
    setAnswer("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, projects: data.projects }),
      });
      const result = await response.json();
      setAnswer(result.answer ?? result.error ?? "No response.");
    } finally {
      setAsking(false);
    }
  }

  const projects = useMemo(() => {
    if (!data) return [];
    return filter === "all"
      ? data.projects
      : data.projects.filter((p) => p.projectState === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    const all = data?.projects ?? [];
    return {
      total: all.length,
      active: all.filter((p) => p.projectState === "active").length,
      blocked: all.filter((p) => p.projectState === "blocked").length,
      partial: all.filter((p) => p.projectState === "partial").length,
      shipped: all.filter((p) => p.projectState === "shipped").length,
      critical: all.filter(
        (p) =>
          p.priority.toLowerCase() === "critical" || p.criticalIssues > 0
      ).length,
      openIssues: all.reduce((sum, p) => sum + p.openIssues, 0),
      openPrs: all.reduce((sum, p) => sum + p.openPullRequests, 0),
    };
  }, [data]);

  const attention = useMemo(
    () =>
      (data?.projects ?? [])
        .filter(
          (p) =>
            p.access !== "ok" ||
            p.projectState === "blocked" ||
            p.criticalIssues > 0 ||
            p.ci?.conclusion === "failure" ||
            (p.staleDays ?? 0) > 30
        )
        .sort(
          (a, b) =>
            priorityRank[a.priority.toLowerCase()] -
              priorityRank[b.priority.toLowerCase()] ||
            b.criticalIssues - a.criticalIssues
        ),
    [data]
  );

  const recommended = useMemo(
    () =>
      (data?.projects ?? [])
        .filter(
          (p) =>
            p.access === "ok" &&
            p.projectState !== "shipped" &&
            p.projectState !== "archived"
        )
        .sort(
          (a, b) =>
            priorityRank[a.priority.toLowerCase()] -
              priorityRank[b.priority.toLowerCase()] ||
            (a.staleDays ?? 999) - (b.staleDays ?? 999)
        )
        .slice(0, 6),
    [data]
  );

  const activeProjects = useMemo(
    () => (data?.projects ?? []).filter((p) => p.projectState === "active"),
    [data]
  );

  const latestActivity = useMemo(
    () =>
      [...(data?.projects ?? [])]
        .filter((p) => p.lastCommit)
        .sort(
          (a, b) =>
            new Date(b.lastCommit?.date ?? 0).getTime() -
            new Date(a.lastCommit?.date ?? 0).getTime()
        )
        .slice(0, 5),
    [data]
  );

  const workspacePulse = useMemo(
    () =>
      [...(data?.projects ?? [])]
        .filter((p) => p.lastWorkedOn)
        .sort(
          (a, b) =>
            new Date(b.lastWorkedOn ?? 0).getTime() -
            new Date(a.lastWorkedOn ?? 0).getTime()
        )
        .slice(0, 4),
    [data]
  );

  const pulseSummary = useMemo(() => {
    if (!data) return "";
    const latest = workspacePulse.slice(0, 3).map((p) => p.name).join(", ");
    const focus = latest
      ? `Recent work is centered on ${latest}.`
      : "No recent project work has been recorded yet.";
    const attentionText =
      attention.length === 0
        ? "Nothing urgent is currently surfaced."
        : `${attention.length} project signal${attention.length === 1 ? "" : "s"} need attention.`;
    const openText = `${counts.openIssues + counts.openPrs} open work item${counts.openIssues + counts.openPrs === 1 ? "" : "s"}`;
    return `${focus} ${attentionText} There are ${openText} across the workspace.`;
  }, [data, workspacePulse, attention.length, counts.openIssues, counts.openPrs]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-name">ARIA</div>
            <div className="brand-sub">gODtECH command center</div>
          </div>
        </div>

        <nav className="nav-group" aria-label="Main navigation">
          <div className="nav-label">COMMAND</div>
          {[
            ["overview", "Overview", "⌂"],
            ["projects", "Projects", "◫"],
            ["tasks", "Tasks", "✓"],
            ["activity", "Activity", "◌"],
            ["diary", "Diary", "☷"],
          ].map(([key, label, icon]) => (
            <button
              className={key === "overview" ? "nav-item active" : "nav-item"}
              key={key}
              onClick={() => {
                if (key === "projects") document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
                if (key === "activity") document.getElementById("activity")?.scrollIntoView({ behavior: "smooth" });
                if (key === "tasks") setQuestion("What should I work on next?");
                if (key === "diary") setQuestion("Summarize my latest project activity as a diary entry.");
              }}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <nav className="nav-group service-nav" aria-label="Connected services">
          <div className="nav-label">SYSTEMS</div>
          {["GitHub", "Vercel", "Supabase", "Neon"].map((service) => (
            <button className="nav-item subdued" key={service} onClick={() => setQuestion(`Give me the current status of ${service}.`)}>
              <span className="service-dot" />
              <span>{service}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="command-shortcut" onClick={() => setPaletteOpen(true)}>
            <span>Open command</span>
            <span className="keycap">⌘ K</span>
          </button>
          <a className="portfolio-link" href="https://ayoabe.com" target="_blank" rel="noreferrer">
            <span>Public portfolio</span>
            <span>↗</span>
          </a>
        </div>
      </aside>

      <section className="workspace">
        <header className="mobile-topbar">
          <div className="brand compact">
            <div className="brand-mark">A</div>
            <div>
              <div className="brand-name">ARIA</div>
              <div className="brand-sub">command center</div>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">⌘</button>
            <button className="avatar" aria-label="Account">g</button>
          </div>
        </header>

        <header className="workspace-head">
          <div>
            <div className="system-line">
              <span className="online-pulse" /> SYSTEM ONLINE
              {data ? <span className="last-sync">• synced {new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> : null}
            </div>
            <h1>Good morning, <span>gODtECH</span></h1>
            <p className="subtitle">
              Your work, projects, signals, and priorities — brought into one operating view.
            </p>
          </div>
          <div className="top-actions desktop-actions">
            <button className="secondary-button" onClick={() => setPaletteOpen(true)}>
              <span>Ask / Command</span>
              <span className="keycap">⌘ K</span>
            </button>
            <button className="avatar" aria-label="Account">g</button>
          </div>
        </header>

        {!data && loading ? (
          <div className="loading-state">
            <div className="loader-ring" />
            <div>
              <strong>Reading your project graph</strong>
              <span>Pulling the latest signals from GitHub…</span>
            </div>
          </div>
        ) : null}

        {data && !data.hasGitHubToken ? (
          <div className="notice">
            <div>
              <strong>Public repository mode</strong>
              <span>Set <code>GITHUB_TOKEN</code> on the server to include private repositories.</span>
            </div>
            <span className="notice-dot" />
          </div>
        ) : null}

        {data ? (
          <>
            <section className="hero-grid">
              <article className="aria-card">
                <div className="aria-orbit orbit-one" />
                <div className="aria-orbit orbit-two" />
                <div className="aria-card-top">
                  <span className="eyebrow">WORKSPACE PULSE</span>
                  <span className="live-badge"><i /> LIVE</span>
                </div>
                <div className="aria-avatar">A</div>
                <div className="aria-copy">
                  <h2>Here’s what’s happening.</h2>
                  <p>{pulseSummary}</p>
                </div>
                <div className="pulse-list">
                  {workspacePulse.map((p) => (
                    <button className="pulse-row" key={p.fullName} onClick={() => setSelectedProject(p)}>
                      <span className="pulse-date">
                        {p.lastWorkedOn
                          ? new Date(p.lastWorkedOn + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })
                          : "—"}
                      </span>
                      <span className="pulse-dot" />
                      <span className="pulse-copy">
                        <strong>{p.name}</strong>
                        <span>{p.currentFocus || p.statusNote || "Project activity recorded."}</span>
                      </span>
                      <span className="row-arrow">→</span>
                    </button>
                  ))}
                </div>
                <div className="aria-actions">
                  <button className="primary-button" onClick={() => { setQuestion("Give me a full workspace briefing."); setTimeout(() => document.getElementById("ask-aria")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); }}>
                    Brief me
                  </button>
                  <button className="text-button" onClick={() => document.getElementById("activity")?.scrollIntoView({ behavior: "smooth" })}>
                    View activity <span>→</span>
                  </button>
                </div>
              </article>

              <div className="signal-grid">
                <article className="metric-card">
                  <span className="metric-label">Active</span>
                  <strong>{counts.active}</strong>
                  <span className="metric-detail">{counts.total} tracked projects</span>
                </article>
                <article className="metric-card attention-metric">
                  <span className="metric-label">Needs attention</span>
                  <strong>{attention.length}</strong>
                  <span className="metric-detail">{counts.critical} critical signals</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">Open work</span>
                  <strong>{counts.openIssues + counts.openPrs}</strong>
                  <span className="metric-detail">{counts.openIssues} issues · {counts.openPrs} PRs</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">Shipped</span>
                  <strong>{counts.shipped}</strong>
                  <span className="metric-detail">completed states</span>
                </article>
              </div>
            </section>

            <section className="section-grid" id="activity">
              <div className="section-panel priority-panel">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">PRIORITY NOW</span>
                    <h2>Where your attention should go</h2>
                  </div>
                  <span className="section-count">{recommended.length} signals</span>
                </div>
                <div className="priority-list">
                  {recommended.map((p, index) => (
                    <button className="priority-row" key={p.fullName} onClick={() => setSelectedProject(p)}>
                      <span className={`priority-number ${index === 0 ? "first" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={`priority-dot ${priorityTone(p.priority)}`} />
                      <span className="priority-main">
                        <span className="priority-name">{p.name}</span>
                        <span className="priority-focus">{p.currentFocus || p.description || "No project focus recorded yet."}</span>
                      </span>
                      <span className="priority-next">{p.nextStep || "Review project state"}</span>
                      <span className="row-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="section-panel attention-panel">
                <div className="section-head">
                  <div>
                    <span className="eyebrow danger-label">WATCH</span>
                    <h2>Needs a look</h2>
                  </div>
                  <span className="section-count">{attention.length}</span>
                </div>
                <div className="attention-list">
                  {attention.length === 0 ? (
                    <div className="empty-state"><span>✓</span><p>Nothing urgent surfaced.</p></div>
                  ) : (
                    attention.slice(0, 6).map((p) => (
                      <button className="watch-row" key={p.fullName} onClick={() => setSelectedProject(p)}>
                        <span className={`watch-icon ${p.criticalIssues > 0 || p.projectState === "blocked" ? "danger" : "warn"}`}>
                          {p.criticalIssues > 0 || p.projectState === "blocked" ? "!" : "•"}
                        </span>
                        <span>
                          <strong>{p.name}</strong>
                          <small>{projectStatus(p)}</small>
                        </span>
                        <span className="row-arrow">↗</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="section-panel activity-panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">LIVE SIGNALS</span>
                  <h2>Latest activity</h2>
                </div>
                <span className="section-count">{activeProjects.length} active</span>
              </div>
              <div className="activity-feed">
                {latestActivity.map((p) => (
                  <button className="activity-row" key={p.fullName} onClick={() => setSelectedProject(p)}>
                    <span className="activity-time">{ageText(p.staleDays)}</span>
                    <span className="activity-marker" />
                    <span className="activity-content">
                      <strong>{p.name}</strong>
                      <span>{p.lastCommit?.message ?? "Project activity"}</span>
                    </span>
                    <span className="activity-state">{stateLabel[p.projectState] ?? p.projectState}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="section-panel aria-ask" id="ask-aria">
              <div className="aria-ask-copy">
                <div className="aria-mini">A</div>
                <div>
                  <span className="eyebrow">ARIA INTELLIGENCE</span>
                  <h2>Talk to your project graph.</h2>
                  <p>
                    Ask about priorities, blockers, project state, or what changed. ARIA interprets your live GitHub signals; it does not replace your source of truth.
                  </p>
                </div>
              </div>
              <div className="ask-interface">
                <div className="ask-input-wrap">
                  <span className="prompt-glyph">›</span>
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void ask();
                    }}
                    placeholder="What should I work on next?"
                    aria-label="Ask ARIA"
                  />
                  <button className="send-button" onClick={() => void ask()} disabled={asking || !question.trim()}>
                    {asking ? "…" : "↑"}
                  </button>
                </div>
                {answer ? (
                  <div className="answer-box">
                    <span className="answer-label">ARIA</span>
                    <div>{answer}</div>
                  </div>
                ) : (
                  <div className="suggestion-row">
                    {["What needs attention?", "What changed today?", "What should I work on next?"].map((suggestion) => (
                      <button key={suggestion} onClick={() => setQuestion(suggestion)}>
                        {suggestion} <span>↗</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="section-panel projects-panel" id="projects">
              <div className="section-head projects-head">
                <div>
                  <span className="eyebrow">PROJECT GRAPH</span>
                  <h2>Tracked repositories</h2>
                </div>
                <div className="filter-bar">
                  {["all", "active", "paused", "blocked", "partial", "shipped", "dormant"].map((value) => (
                    <button
                      key={value}
                      className={filter === value ? "filter-pill active" : "filter-pill"}
                      onClick={() => setFilter(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="project-cards">
                {projects.map((p) => (
                  <button className="project-card-mobile" key={p.fullName} onClick={() => setSelectedProject(p)}>
                    <span className={`state-dot ${p.projectState}`} />
                    <span className="project-card-copy">
                      <strong>{p.name}</strong>
                      <small>{p.currentFocus || p.description || "No focus recorded."}</small>
                    </span>
                    <span className="priority-chip">{p.priority}</span>
                  </button>
                ))}
              </div>

              <div className="table-wrap desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>State</th>
                      <th>Priority</th>
                      <th>Current focus</th>
                      <th>Next move</th>
                      <th>Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.fullName}>
                        <td>
                          <button className="table-project" onClick={() => setSelectedProject(p)}>
                            <span className="table-project-name">{p.name}</span>
                            <span>{p.group}</span>
                          </button>
                        </td>
                        <td><span className={`state ${p.projectState}`}>{stateLabel[p.projectState] ?? p.projectState}</span></td>
                        <td><span className={`priority-text ${priorityTone(p.priority)}`}>{p.priority}</span></td>
                        <td>{p.currentFocus || "—"}</td>
                        <td>{p.nextStep || "—"}</td>
                        <td><span className="signal-copy">{ageText(p.staleDays)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <footer className="workspace-footer">
              <span>ARIA command center · GitHub remains the source of truth</span>
              <span>Updated {new Date(data.generatedAt).toLocaleString()}</span>
            </footer>
          </>
        ) : null}
      </section>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className="active"><span>⌂</span><small>Home</small></button>
        <button onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })}><span>◫</span><small>Projects</small></button>
        <button onClick={() => setPaletteOpen(true)}><span className="bottom-aria">A</span><small>ARIA</small></button>
        <button onClick={() => document.getElementById("activity")?.scrollIntoView({ behavior: "smooth" })}><span>◌</span><small>Activity</small></button>
        <button onClick={() => setQuestion("What should I work on next?")}><span>✓</span><small>Tasks</small></button>
      </nav>

      {paletteOpen ? (
        <div className="modal-backdrop" onClick={() => setPaletteOpen(false)}>
          <div className="command-palette" onClick={(event) => event.stopPropagation()}>
            <div className="palette-search">
              <span>⌕</span>
              <input
                autoFocus
                placeholder="Search projects or run a command…"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setPaletteOpen(false);
                  if (e.key === "Enter") {
                    setQuestion(e.currentTarget.value);
                    setPaletteOpen(false);
                    setTimeout(() => document.getElementById("ask-aria")?.scrollIntoView({ behavior: "smooth" }), 50);
                  }
                }}
              />
              <span className="keycap">esc</span>
            </div>
            <div className="palette-section">
              <span className="palette-label">QUICK COMMANDS</span>
              {[
                ["Ask ARIA", "What should I work on next?"],
                ["Show blockers", "What is currently blocked?"],
                ["What changed today?", "What changed today?"],
                ["Project health", "Give me a health summary of my projects."],
              ].map(([label, prompt]) => (
                <button key={label} className="palette-item" onClick={() => { setQuestion(prompt); setPaletteOpen(false); setTimeout(() => document.getElementById("ask-aria")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); }}>
                  <span className="palette-icon">→</span>
                  <span>{label}</span>
                  <span className="palette-hint">ARIA</span>
                </button>
              ))}
            </div>
            <div className="palette-section">
              <span className="palette-label">JUMP TO</span>
              <button className="palette-item" onClick={() => { setPaletteOpen(false); document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="palette-icon">◫</span><span>Projects</span><span className="palette-hint">{counts.total}</span>
              </button>
              <button className="palette-item" onClick={() => { setPaletteOpen(false); document.getElementById("activity")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="palette-icon">◌</span><span>Activity</span><span className="palette-hint">{latestActivity.length}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedProject ? (
        <div className="modal-backdrop" onClick={() => setSelectedProject(null)}>
          <aside className="project-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <span className="eyebrow">PROJECT</span>
                <h2>{selectedProject.name}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedProject(null)} aria-label="Close project details">×</button>
            </div>
            <div className="drawer-status">
              <span className={`state ${selectedProject.projectState}`}>{stateLabel[selectedProject.projectState] ?? selectedProject.projectState}</span>
              <span className={`priority-chip ${priorityTone(selectedProject.priority)}`}>{selectedProject.priority}</span>
            </div>
            <div className="drawer-block">
              <span className="drawer-label">CURRENT FOCUS</span>
              <p>{selectedProject.currentFocus || "No focus recorded."}</p>
            </div>
            <div className="drawer-block">
              <span className="drawer-label">NEXT MOVE</span>
              <p>{selectedProject.nextStep || "Review project state."}</p>
            </div>
            <div className="drawer-block">
              <span className="drawer-label">STATUS</span>
              <p>{selectedProject.statusNote || projectStatus(selectedProject)}</p>
            </div>
            <div className="drawer-block">
              <span className="drawer-label">SIGNALS</span>
              <div className="drawer-stats">
                <div><strong>{selectedProject.openIssues}</strong><span>issues</span></div>
                <div><strong>{selectedProject.openPullRequests}</strong><span>open PRs</span></div>
                <div><strong>{selectedProject.criticalIssues}</strong><span>critical</span></div>
              </div>
            </div>
            <a className="drawer-link" href={selectedProject.url} target="_blank" rel="noreferrer">
              Open repository <span>↗</span>
            </a>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
