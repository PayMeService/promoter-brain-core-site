# Installation and operations

[Guide index](README.md)

## Guided installer versus setup

`install.sh` requires a system Python 3.10+ to launch the standard-library `tools.installer` package. It normally rejects root execution. It inspects an existing installation, asks for profiling/serving/all scope (or uses flags), collects engine settings, reads the signed-in GitHub identity, and manages an `install/<name>` branch unless disabled. It can add installation-specific documentation and commit those tracked changes locally; it does not push.

The installer delegates actual setup to `tools/setup/setup.sh`. Successful setup is followed by optional tailoring and a separately chosen data step. `--no-data` omits that offer; `--no-tailor` and `--no-branch` disable those respective changes; `--dry-run` and `--check` provide planning/status paths. `--yes` accepts defaults for scripted runs; it is not blanket authorization to access live RDS during engineering work.

Tailoring uses marked, additive blocks in README/governance files, tracks its prior generated content, and preserves unowned text. Installation identity names output tables and the local branch; it is distinct from the detected GitHub account and a database login.

## Eight setup phases

| Order | Phase | Reason |
|---|---|---|
| 1 | Verify/install uv and PATH | Hard prerequisite before setup side effects |
| 2 | Host checks | Supported Linux, architecture and host tools/Docker readiness |
| 3 | Compute installed scope union | Adding one engine preserves the other |
| 4 | Sync root environment | One locked Python 3.11 workspace environment |
| 5 | Prepare requested engine env files | Preserve existing settings and limit configuration scope |
| 6 | Generate/reuse resource settings | One host-wide budget, generated credentials, usable local ports |
| 7 | Start infrastructure and wait for health | Containers ready before installation is recorded |
| 8 | Record installed scopes | Persist completed installation state |

Setup does not start FastAPI, execute a profiling job, score audiences, publish evidence, copy RDS data, or delete volumes/env files. Container startup is its intended side effect. A failure is handled through a preserving rerun, not a global rollback of everything already installed.

`scope_state.py` persists setup state beneath `.promoter_brain/setup/`. Sequential partial setups install the union into the same `.venv`. No package-local environment or lockfile is created. Engine `.env` files and `infra/resources.env` are ignored and created with restrictive modes.

## Infrastructure

| Service | Included for | Image in source | Default host port |
|---|---|---|---|
| PostgreSQL | Every scope | `postgres:16-alpine` | 15432 |
| Neo4j | Serving/all | `neo4j:5.26-community` | HTTP 17474, Bolt 17687 |
| Firecrawl API | Optional profiling backend | `ghcr.io/firecrawl/firecrawl`, configurable tag | 3002 |
| Firecrawl browser service | Firecrawl profile | `ghcr.io/firecrawl/playwright-service`, configurable tag | Internal |
| Redis | Firecrawl profile | `redis:7-alpine` | Internal |

Exposed ports bind loopback. Named PostgreSQL and Neo4j volumes survive container recreation. Default Compose project/container/volume names are fixed `promoter-brain-*`; multiple clones on one host do not automatically get isolated stacks. Setup's selected port overrides are persisted and mirrored into engine settings.

PostgreSQL initialization creates `profiling_engine` and `serving_engine`, each owning its schemas, with cross-engine and PUBLIC schema access revoked. Both can create their own schemas in the database. Initialization is mounted into the container's first-start hook; changing the script does not automatically migrate an already initialized volume.

PostgreSQL is tuned for a local bulk-copy target: minimal WAL, no WAL senders, asynchronous commit, wider checkpoints, configured memory/CPU limits, and data checksums. `synchronous_commit=off` is a durability tradeoff: transaction atomicity is not a promise that a just-acknowledged commit survives host failure. This is not the configuration of a replicated production database.

Resource detection reads CPUs, memory, architecture, and Docker-filesystem free space. Small hosts (<4 CPU or <8 GiB) use a 25% memory budget; large hosts (≥16 CPU and ≥32 GiB) use 45%; others use 35%. `PB_RESOURCE_PROFILE` can override the class. One budget is split across the installed service union, with per-service bounds. Persisted values win on rerun.

Trafilatura needs no extra container. Firecrawl is enabled through a Compose profile, with API, Redis, and its own browser service. Its default tag floats and this small service topology must match the chosen upstream release; the historical end-to-end record did not validate this optional stack. Neo4j's configured line is 5.26; its patch version also floats within the image tag.

## Configuration and state

Each engine loads its `.env` through the transfer package's parser, with process environment values taking precedence. Connection settings are typed and purpose-specific. Source keys, local keys, publish keys, model/extractor keys, and UI ports have different consumers; a local status call does not need source credentials.

| Key family | Purpose |
|---|---|
| `PROMOTER_BRAIN_STATE_DIR` | Root for local JSON records, manifests, logs, exports |
| `PROMOTER_BRAIN_USER_NAME` | Profiling table identity and serving published-table resolution |
| `PROFILING_LOCAL_PG_*`, `SERVING_LOCAL_PG_*` | Engine-local database access |
| `PROFILING_SOURCE_PG_*`, `SERVING_SOURCE_PG_*` | Read-only source transfer connections |
| `PROFILING_PUBLISH_PG_*` | Explicit write-scoped profiling handoff |
| `GEMINI_*`, `PROFILING_*` tunables | Model, pricing, analysis, extraction, API, transfer options |
| `FIRECRAWL_*` | Optional extractor endpoint and bounds |
| `SERVING_PROFILING_TABLE`, `SERVING_PROFILING_SELECTION` | Profiles source pin/selection |
| `SERVING_SELECTOR_BUNDLE_DIR` | Guarded selector location or `off` |
| `SERVING_NEO4J_*` | Local evidence graph |
| `SERVING_EXPORT_DIR`, `SERVING_STUDIO_*` | Output path and browser service |

The [source reference](10-source-reference.md) lists every key from tracked example files without copying values. Generated local state includes engine manifests/pointers, setup state, profiling job records/settings/handoff milestones, serving run and operation records, salts, audit logs, audience JSON, and CSV. Database state and file state have different authority rules described in the lifecycle chapters.

## Command surface

Run commands below from `/home/constantin/promoter-brain-core`. These are documented commands, **not commands executed by this documentation task**.

```bash
./install.sh --scope profiling --no-data
./install.sh --scope serving --no-data
./install.sh --scope all --no-data
./install.sh --check
bash tools/setup/setup.sh all --dry-run
bash tools/setup/setup.sh status
```

Explicit data verbs on each engine are `preflight`, `bootstrap`, `refresh`, `status`, and `rollback`. Preflight/bootstrap/refresh can contact RDS; status and rollback are local. The source project's governance requires a supervised direct go for new live-RDS engineering runs, after the non-RDS suite and an exact bounded proposal. This guide grants no live-access permission.

```bash
uv run promoter-brain-profiling data status
uv run promoter-brain-profiling api serve
uv run promoter-brain-profiling worker run --lens purchase --limit 10
uv run promoter-brain-serving data status
uv run promoter-brain-serving studio serve
```

Profiling worker commands can call Gemini/extraction APIs and incur cost. Serving CLI forms are `serve <seller_id ...> --salt <int> [--out ...]`, `export <seller_id ...> --salt <int> [--evidence] [--publish]`, and `evidence publish`. Placeholders must be replaced deliberately; this guide invents no deployment salt. API handoff is a browser operation, not a profiling CLI subcommand.

## Operational recovery

Use engine `data status` to inspect readiness; container health alone does not mean data was bootstrapped. Fix incomplete configuration by the named keys. If capacity/contract/census gates abort, inspect the recorded stage and preserve the active snapshot. If a reader blocks promotion, finish or cancel it before retrying. After a committed promotion/file crash, use the resolver's healing path rather than manually editing active pointers. A missing previous stamp means rollback is unavailable.

A missing optional profiles source can still permit data promotion while leaving cold/guarded lanes unusable. Resolve that at the profiling/handoff/source-selection boundary, or explicitly choose the documented unguarded serving configuration where appropriate; do not relabel missing evidence as a successful guarded run.

Source: `install.sh`, `tools/installer/`, `tools/setup/`, `infra/`, engine config/CLI modules in [source reference](10-source-reference.md).
