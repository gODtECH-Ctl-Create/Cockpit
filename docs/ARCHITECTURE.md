# Cockpit Architecture

## Purpose

Cockpit is the personal command center for selected gODtECH projects. It shows objective GitHub activity alongside a small declared project-state file and uses optional AI only for interpretation.

## Sources of truth

GitHub is authoritative for objective facts: repository metadata, commits, issues, pull requests, GitHub Actions/CI results, and activity timestamps.

`.godtech/project.yml` is the state declaration:

```yaml
project:
  state: active
  priority: high
  current_focus: "..."
  next_step: "..."
  blockers: []
  status_note: "..."
  last_worked_on: "2026-10-04"
```

It is a state snapshot, not a changelog.

## Layers

### Cockpit
Visibility, attention, filtering, project summaries and prioritization.

### Forge
Development orchestration, repository inspection, planning, governance, verification and delivery discipline.

### Repository contract
```text
AGENTS.md                 local AI operating rules
.godtech/project.yml     current project state
.forge/                   fuller Forge layer where installed
```

Cockpit never replaces `.forge/`.

## AI boundary

NVIDIA is an optional reasoning adapter. AI receives bounded evidence and may summarize, compare, recommend priorities and flag contradictions. It must not invent project facts or silently become the source of truth.

## Deployment

V1 uses Next.js on Vercel because private GitHub data requires a server-side credential. GitHub Pages is suitable for static public-only variants, but is not the primary deployment target.

## Database

None in V1. A database is only warranted when historical snapshots, long-term analytics, user-specific settings, notification state or richer cross-project memory become necessary.

## Security

The GitHub token stays server-side. Pull-request AI checks should be read-only. Automatic state writes should run only in a trusted workflow context with minimal contents permissions.

## Cost

The intended V1 platform cost is zero before optional AI/API usage: GitHub, Vercel Hobby and no database. AI provider usage is the main variable resource.