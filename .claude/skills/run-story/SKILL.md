---
name: run-story
description: Implement one LimpiApp story (E0N/US-NNN) end to end with the story loop of CLAUDE.md - Definition of Ready, implementation, test audit, gates, report, story status update and one local commit.
---

Given a story id like `E03/US-004`:

1. Find it: `$VAULT/Epics/E03-*/F*/US-004.md` (`$VAULT` in CLAUDE.md). Read it, its `FEATURE.md`, its `EPIC.md` and the architecture sections it touches.
2. **Definition of Ready** (Kickstart Lite `02-plantillas.md`): dependencies done (check their `status`), 3-5 testable criteria, prototype screens exist and have a parity-matrix row, no open question without an assumption. If not ready: stop and ask Josep.
3. Set the story `status: in-progress` in its frontmatter and in the EPIC «Historias» table.
4. Run the story loop from CLAUDE.md (read → implement → test audit → gates).
5. At the end of the epic, ask the `qa-reviewer` agent for an independent review with a self-contained prompt (story paths, changed files, gates and log path, screens/states). Fix blockers; max 3 rounds.
6. Write the report (Kickstart Lite `03-ejecucion.md` §7).
7. One local commit, files staged by name, English message `E03/US-004: <summary>`, **no attribution trailer**. Never push.
8. Set the story `status: done` and update the EPIC table. New decisions go to the EPIC as `proposed` unless Josep approved them.

Stop and ask (playbook §5): product question without answer, story bigger than its size, missing dependency, 3 failed review rounds, a gate failing for an unrelated reason, a visual the prototype lacks, or any scope reduction.
