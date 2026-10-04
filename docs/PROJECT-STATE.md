# Project State Contract

Tracked repositories use:

```text
.godtech/project.yml
```

## Schema

```yaml
project:
  state: active | paused | blocked | partial | shipped | dormant | archived
  priority: critical | high | medium | normal | low
  current_focus: "..."
  next_step: "..."
  blockers:
    - "..."
  status_note: "..."
  last_worked_on: "YYYY-MM-DD"
```

Keep it concise. It describes the current position and next move.

## Agent completion rule

After meaningful development work, the agent must:

1. Re-check what actually changed.
2. Reconcile the repository state with the declared state.
3. Update `.godtech/project.yml` when the state, focus, next step, blockers, priority or status materially changed.
4. Never invent a blocker, completion claim, milestone or roadmap item.
5. Keep `next_step` actionable.
6. Preserve real blockers until they are resolved.
7. Leave the file unchanged when no meaningful project-state change occurred.

## Staleness

Cockpit may flag a mismatch such as an `active` project with no meaningful repository activity for a long period. The correct response is reconciliation, not hiding the mismatch.