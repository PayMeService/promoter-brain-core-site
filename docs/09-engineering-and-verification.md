# Engineering rules and verification

[Guide index](README.md)

## Why the code is divided this way

The source is a selective migration from Topics, not a copy of its whole research workspace. `docs/migration-inventory.md` pins Topics commit `826ce12ed739c40f217374405bb2e2f8ec5e56ba` and records retained behavior, adaptations, exclusions, and evidence per slice. Stable numerical functions and prompts were retained; configuration, local ownership, packaging, and operator workflows were adapted. A ledger row marked done means its retained slice is implemented with owned tests, not that every production scenario has been observed.

Contracts centralize versioned data agreements without coupling engines. Transfer centralizes snapshot, copy, and promotion safety without choosing engine policy. SQL-writing modules make write authority inspectable; pure SQL builders and arithmetic gates can be tested without a database. Injected connections, stores, clients, and event callbacks permit meaningful synthetic failure tests. Typed events give CLI logs and UI operations one shared rendering vocabulary.

The root is workspace infrastructure. Each engine controls its own installation dependencies, data lifecycle, API, persistence, and tests. There is no speculative global coordinator or service bus. Separate schema ownership and read-only runtime paths keep accidental coupling visible.

## Executable architectural rules

`verification/workspace/` tests and the dependency checker cover dependency direction, independent installation, source-access isolation, store write authority, setup boundaries, promotion visibility, migration inventory, governance, and CI routing. Engine suites cover the behavior behind those boundaries.

| Area | Important test responsibilities |
|---|---|
| Contracts | Identifier/model validation, schema compatibility, manifest digest/owner/version, purity |
| Transfer | Source read-only setup, snapshot import, COPY tallies, parallel retry ambiguity, capacity, locks, manifests, healing, publish allowlist |
| Profiling | Workload/registry semantics, extraction, Gemini failures, cancellation, windows, workspace naming, APIs, result handoff, local data lifecycle |
| Serving | Graph/scoring parity, E-space gates, exact-k/ties, warm/cold/guard behavior, revision gates, contacts, receipts, graph checks, snapshots, studio state |
| Setup/installer | Phase order, scope union, env preservation/validation, resource budgeting, forbidden side effects, scripted flows/tailoring |
| Workspace | Cross-package invariants and verification routing |

Default tests use fakes and synthetic inputs. Disposable-service tests are opt-in through `PROMOTER_BRAIN_TEST_LOCAL_DSN` and `PROMOTER_BRAIN_TEST_NEO4J_URI`, marked `local_postgres` and `local_neo4j`. They are not authorization for live RDS.

## Verification commands in the source project

From `/home/constantin/promoter-brain-core`, the documented full non-RDS development workflow is:

```bash
uv sync --locked --all-packages --all-extras --group dev
uv run --package promoter-brain-core-contracts pytest packages/contracts/tests -q
uv run --package promoter-brain-core-data-transfer pytest packages/data-transfer/tests -q
uv run --package promoter-brain-core-profiling pytest engines/profiling/tests -q
uv run --package promoter-brain-core-serving pytest engines/serving/tests -q
uv run pytest tools/setup/tests -q
uv run pytest tools/installer/tests -q
uv run pytest verification/workspace -q
uv run ruff check packages engines tools/setup tools/installer verification
uv run mypy packages/contracts/src packages/data-transfer/src engines/profiling/src engines/serving/src tools/installer --exclude tools/installer/tests
uv lock --check
```

These commands are reference instructions and were not executed for this guide. An existing installation can use its already synchronized environment; documentation work does not require rebuilding it. Tests should use the real project's environment rather than making a scratch uv project and downloading a second dependency graph.

Package-aware CI routes contracts/workspace, transfer, profiling, serving, and setup changes through their appropriate workflows. Contract or root-lock changes fan out to consumers. Transfer changes exercise consumer data paths. Verification workflows have read-only repository permissions and do not start engines, Docker, or RDS. The two Claude review workflows have a distinct, narrowly scoped review-token/comment permission contract; they are not equivalent to secret-free package verification.

The source project's canonical `CLAUDE.md` requires a clean verifier-agent verdict for substantive implementation/documentation changes in that source workspace, and a new supervised direct go for live RDS. This task wrote documentation in the separate site repository and left the source unchanged; no source-project implementation completion or live-access approval is claimed.

## Historical evidence, with limits

The inspected migration ledger and `docs/verification/2026-09-end-to-end-record.md` record real-host work from 2026-09-06 through 2026-09-09: scope setup, disposable PostgreSQL/Neo4j tests, supervised source transfer, rollback pairs, profiling jobs with Gemini, an explicit handoff, serving exports/evidence, graph publication, and browser journeys. These are historical records at their individually recorded commits, not tests rerun against this documentation snapshot.

The same record explicitly leaves gaps: live tier-1 and tier-3 extraction (jobs used stored bodies), the optional Firecrawl stack, observing profiling's very short reader-lock refusal window, the Studio Data page visually during an actual refresh (the operation was exercised by API), stopping Docker as a negative test, and a SIGKILL studio restart mid-run. A claim of complete real-host validation would exceed that evidence.

## Boundaries to preserve when extending the system

- New source requirements belong in the owning inventory and compatibility tests before new queries assume columns exist.
- New profiling lenses belong in lens declarations/registry; they reuse job preparation, analysis, storage, and workspace naming.
- New serving membership policies must preserve E-space eligibility, existing-buyer exclusion, deterministic ties, explicit refusal, and evidence consistency.
- Any new writable store or external operation needs an explicit owner and operation path; normal runtime must not silently become a data-sync scheduler.
- A manifest/file digest is evidence of content identity, not an authenticated signature or remote backup.
- Snapshot rollback protects a local data revision. It is not a coordinated rollback of RDS handoffs, model outputs, CSV, and Neo4j.
- Historical UI views need per-run snapshots and recorded visibility metadata, not reads of latest mutable evidence.

## Documentation verification

This guide is a static source-grounded synthesis. The companion [snapshot](11-source-snapshot.md) fingerprints tracked runtime code, package configuration, tests, infrastructure, and selected architecture/governance inputs. The [reference](10-source-reference.md) enumerates production Python modules without importing them, statically extracts API routes, lists static assets and test modules, and records configuration key names from example files.

Checks for this task cover Markdown local-link targets, pinned source-link paths/lines, balanced code fences, source fingerprints, full production Python index coverage, and the final Git diff. They do not prove runtime correctness, remote source availability, or model quality.

Static documentation check on 2026-09-10: **PASS** — 12 Markdown files, 38 local links, 1,462 pinned source links, all 113 tracked production Python modules indexed, and all 312 input fingerprints matched. Code fences and whitespace passed; the source Git tree remained clean at the inspected commit. No runtime test result is implied.
