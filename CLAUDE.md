# CLAUDE.md — LimpiApp

Shared household cleaning app: rooms, recurring tasks, today's list, marking tasks done (points, streaks, photos), history, stats, ranking and invites. Angular 22 web + ASP.NET Core 10 Minimal API (vertical slices, EF Core 10, PostgreSQL 17) in Docker; login with Google or an email magic link.

## Where things are

Vault root: `~/GoogleDrive/JosepVault/Josep/01_Proyectos/04_LimpiApp` (call it `$VAULT`).

| What | Where |
|---|---|
| Vision and architecture (data model, business rules, endpoints, auth) | `$VAULT/Architecture/00-vision.md`, `$VAULT/Architecture/01-arquitectura.md` |
| Epics, features, stories (Spanish) | `$VAULT/Epics/E0N-*/EPIC.md`, `$VAULT/Epics/E0N-*/F0N-*/US-NNN.md` |
| Screen inventory and epic map | `$VAULT/Epics/00-inventario-pantallas.md`, `$VAULT/Epics/00-mapa-epicas.md` |
| Visual contract and parity matrix | `$VAULT/Design/prototype.html`, `$VAULT/Design/README.md` |
| QA (pyramid, gates, test data) | `$VAULT/QA/00-qa.md` |
| Methodology (Kickstart Lite) | `$VAULT/../_Kickstart/ProjectKickstart-Lite/` (`03-ejecucion.md` is the playbook) |
| Reference implementation of the harness (parity helper, lint, Vitest, Playwright, nginx) | `~/Repos/lazydesk` (read-only) |
| Agent and skill | `.claude/agents/qa-reviewer.md`, `.claude/skills/run-story/SKILL.md` |

## Commands (gates, in order)

| # | Gate | Command | Must pass |
|---|---|---|---|
| 1 | Format BE | `cd backend && dotnet format --verify-no-changes` | no changes |
| 2 | Build BE | `dotnet build -warnaserror` | 0 warnings |
| 3 | Unit BE | `dotnet test tests/LimpiApp.UnitTests` | all green |
| 4 | Integration BE | `dotnet test tests/LimpiApp.IntegrationTests` (Testcontainers, needs Docker) | all green; `LimpiApp.Api` coverage ≥ 70 % over 3 + 4; `dotnet ef migrations has-pending-model-changes` clean |
| 5 | Lint FE | `cd frontend && npm run lint` | 0 warnings |
| 6 | Types FE | `npm run typecheck` | 0 errors |
| 7 | Unit FE | `npm test` (Vitest, coverage thresholds in config) | all green, ≥ 70 % |
| 8 | Build FE | `npm run build` | initial budget < 500 kB |
| 9 | E2E | `npm run e2e` | all green |
| 10 | Parity | `npm run parity` | every matrix row green |
| 11 | Docker | `docker compose build` | builds |

`make qa` (in `backend/`) runs 1-4; `npm run qa` (in `frontend/`) runs 5-10. Both are created by E01/US-001 and E01/US-003. A gate that cannot run here is reported as `NOT RUN` with the reason.

Local run: `cp .env.example .env && docker compose --profile dev up -d` → web and `/api` on `http://127.0.0.1:8090`, API direct on `127.0.0.1:8091`, Mailpit (magic-link emails) on `http://127.0.0.1:8025`.

## Story loop — follow exactly

When asked to implement a story (`E0N/US-NNN`), use the `run-story` skill:

1. **READ** the story, its FEATURE.md, the EPIC (decisions D#, assumptions A#, open questions Q#) and the architecture sections it touches. Open the prototype screen(s) it lists (`prototype.html?bare&state=…#screen-…`). Check Definition of Ready; if it fails, stop and ask.
2. **IMPLEMENT** only that story, and everything its prototype screen shows for it. Same `data-testid`s, same texts, same order.
3. **TEST AUDIT**: every acceptance criterion maps to the test named in the story's «Pruebas» table; every changed file is covered.
4. **GATES** in order; on failure fix the root cause and re-run from the failed gate, then all.
5. **REVIEW** with the `qa-reviewer` agent once per epic, at the end. Fix blockers; the rest is noted in the stories.
6. **REPORT** (files, one line per gate, parity per screen, criterion → test, decisions/assumptions, open questions) and **one local COMMIT** with files staged by name. Update the story `status` and the EPIC table in the vault.

## NEVER

- Skip the test audit, add `[Fact(Skip=…)]`/`#pragma warning disable`/`eslint-disable`/`skip`/`only` without written justification, or lower thresholds.
- Report a gate as passed without running it.
- Change the UI without changing the prototype first (with Josep's approval), ignore a `data-testid` or skip a parity row.
- Reduce a story's scope, drop acceptance criteria, or record a decision as approved by Josep without his explicit approval in the conversation (otherwise it stays `proposed`).
- Push, deploy, edit git config, `git add -A` / `git add .`, or touch working-tree files that are not part of the story.
- Add `Co-Authored-By` or any attribution line to commits or PRs (Josep's global rule).
- Put secrets in the repo or the frontend; call real Google or a real SMTP server from tests.
- Return data of a household the user is not a member of (always 404).

## Conventions

- **Backend**: one project `src/LimpiApp.Api`, one folder per slice in `Features/<Slice>/` (`<Slice>Endpoints.cs` with `MapGroup`, `<Slice>Dtos.cs` records, `<Slice>Service.cs` / `*Rules.cs` for pure logic). EF Core used directly in handlers (no repositories, no MediatR). `TimeProvider` injected, never `DateTime.Now`. Calendar dates as `DateOnly` in the household time zone. Errors as `ProblemDetails`. Every schema change is an EF migration. Nullable on, warnings are errors. `ILogger`, not `Console`.
- **Frontend**: standalone components, OnPush, zoneless, signals (`input()`, `output()`, signal stores), `inject()`, typed Reactive Forms, selector prefix `la-`, SCSS with the prototype tokens only (no raw colors), `data-testid` exactly as in the prototype. Requests send `X-Requested-With: limpiapp`.
- **Both**: code, files and commit messages in English; UI copy in Spanish exactly as in the prototype. Test date: Wednesday 14 Oct 2026 09:00 Europe/Madrid. Comments only for a non-obvious why.
