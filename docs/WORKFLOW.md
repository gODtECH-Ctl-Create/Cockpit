# gODtECH Cockpit Workflow

The Cockpit repository contains a reusable workflow at `.github/workflows/project-state.yml`.

Selected repositories can call it from a small local workflow. The caller should trigger it on pull requests and pushes to trusted branches.

## Pull request

1. Check out the change.
2. Require `AGENTS.md`.
3. Check `.godtech/project.yml` shape when present.
4. Do not execute repository code during contract preflight.

The pull-request path is inspection-oriented and does not write project state.

## Trusted push

1. Re-read `AGENTS.md`.
2. Read project state.
3. Collect latest commit and changed-file evidence.
4. Send bounded evidence to NVIDIA when configured.
5. Validate the returned state.
6. Write `.godtech/project.yml`.
7. Commit only the state file.

## Security

- Do not execute untrusted repository scripts during preflight.
- Do not use the AI workflow to merge pull requests.
- Do not use the AI workflow to change permissions.
- Do not expose credentials to prompts or browser clients.
- Keep pull-request runs read-only with respect to project-state writes.