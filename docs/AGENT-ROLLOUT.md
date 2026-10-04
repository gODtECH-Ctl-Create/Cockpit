# Repository Agent Contract Rollout

## Selected repositories

The initial rollout covers the repositories explicitly selected for the Cockpit project graph.

### Core / serious

ABE-TechLab-Operations, A-B-E-TechLab-website, ABE-invoice-Gen, commitmeplanner, lead-engine, Cloud-Infrastructure-Platform, MortgageOps, gODtECH-FORGE, RepoOps, gODtECH-Steward, HUSTLEVERSE, gODtECH-Bot, gODtECH-CLI-Identity, Content-OS, Att, School-LN-CM, NOT-HEALTH-OS, StackPilot, SAYRR, THE-BLACK-CROWN, techtrack.

### Professional / company work

ABEmail-Mail, waste2light_web, Waste2Work, wast2work-test-enviroment-742d69aa, cyfamod-sms-landing, nanoclick-platform, proqurement.

## Exclusions

Do not add the Cockpit contract to external, reference, team/HNG/Zedu or security-vault repositories that were explicitly excluded.

## Personalization

Existing `AGENTS.md` files must be preserved and extended rather than replaced. Where a repository has no agent file, add a lightweight local contract suited to that project’s maturity and risk.

Serious production-oriented projects receive stronger verification and delivery instructions. Experimental or supporting projects receive a smaller contract.

## State synchronization

Each selected repository receives `.godtech/project.yml` with a concise initial state. The state should be updated by the working AI after meaningful development work.

## Automation

The reusable GitHub Actions workflow belongs in the Cockpit repository. It performs pull-request inspection/check-only work, trusted post-push state synchronization, optional NVIDIA reasoning, deterministic validation of the returned state, and minimal write-back to `.godtech/project.yml`.

The workflow must not merge pull requests, modify repository permissions or weaken repository security rules.