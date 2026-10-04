# gODtECH Cockpit Agent Contract

Cockpit is the personal command center for the gODtECH project graph. It must remain a lightweight visibility and prioritization layer, not another project-management system.

## Working rules

- GitHub remains the source of truth for repository facts.
- `.godtech/project.yml` is the compact project-state declaration.
- Forge remains the development-orchestration layer; do not duplicate its framework or policies here.
- AI is optional and must reason only from supplied evidence.
- Keep private GitHub credentials server-side.
- Do not add a database unless a concrete requirement justifies it.

## Before implementation

Inspect the repository, current issue/PR, existing architecture and deployment behavior before changing code. Keep the smallest robust scope and verify the production build for meaningful changes.

## Cockpit synchronization

After meaningful work, reconcile this repository's `.godtech/project.yml`. Keep the state concise and evidence-backed. Do not fabricate progress, blockers or roadmap items.