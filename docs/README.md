# Promoter Brain Core: architecture and engineering guide

This documentation explains the implementation in `/home/constantin/promoter-brain-core`, as inspected on **2026-09-10** at commit **`3c8eb0841795b3f0f17fde5aad67a37f73726224`**. The source working tree was clean when inspected. These files live in the separate `promoter-brain-core-site` repository.

Promoter Brain Core is a Python workspace with two independently installable browser applications: **profiling** turns website content into structured audience attributes; **serving** uses purchase relationships and those attributes to select prospective customers and explain the selection. Each engine operates on its own local PostgreSQL data. Shared libraries provide pure contracts and controlled transfer mechanics. There is no parent runtime coordinating both engines.

## Reading order

| Document | What it explains |
|---|---|
| [System architecture](01-system-architecture.md) | Purpose, boundaries, dependencies, ownership, and end-to-end data flow |
| [Contracts and data model](02-contracts-and-data-model.md) | Source inventories, compatibility, manifests, schemas, and workspace naming |
| [Transfer and revision lifecycle](03-transfer-and-revisions.md) | Snapshots, streaming copy, gates, atomic promotion, locks, recovery, rollback |
| [Profiling engine](04-profiling-engine.md) | Workload selection, extraction, lenses, Gemini, registry evolution, jobs, persistence |
| [Serving engine](05-serving-engine.md) | Derived surfaces, purchase graph, warm/cold lanes, guarded selection, exact-k ranking |
| [Handoff, export, and evidence](06-handoff-export-and-evidence.md) | RDS publishing, contact selection, CSV publication, receipts, snapshots, Neo4j |
| [Browser applications and APIs](07-applications-and-apis.md) | UI responsibilities, route inventory, concurrency, state, error semantics |
| [Installation and operations](08-installation-and-operations.md) | Installer, setup phases, infrastructure, configuration, commands, recovery |
| [Engineering rules and verification](09-engineering-and-verification.md) | Design rationale, testing boundaries, CI, historical evidence, limitations |
| [Source reference](10-source-reference.md) | Complete production Python module index, static assets, configuration keys, tests, pinned source links |
| [Source snapshot](11-source-snapshot.md) | SHA-256 fingerprints of the tracked implementation and architecture inputs |

## Evidence and scope

The guide covers the implemented subsystems and their important algorithms, state transitions, and failure boundaries. It is an architectural explanation, not a line-by-line annotation, production-readiness certification, or replacement for the source API definitions.

The review used source code, package metadata, Compose definitions, tests, the migration inventory, and the approved architecture specification. The code takes precedence where older banners or design prose are stale. In particular, current behavior includes profiling refresh/rollback, structured workspaces, explicit RDS result publishing, the serving profiles-source resolver, and the guided installer. The original architecture image predates several of these additions.

No application, setup, data command, database connection, model call, or live integration test was run for this documentation task. Historical integration results are identified as historical in [verification](09-engineering-and-verification.md). Documentation links, source references, and fingerprints are checked separately. No credential files or generated data were copied.

Source links target the inspected commit in the private `PayMeService/promoter-brain-core` repository; they require repository access. The source reference supplies repository-relative paths for local use as well. Defaults in this guide describe that source snapshot, not a promise about installed service state or current external-provider availability.
