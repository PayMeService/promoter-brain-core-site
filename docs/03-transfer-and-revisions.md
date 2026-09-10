# Transfer and revision lifecycle

[Guide index](README.md)

## Policy belongs to engines; mechanics are shared

Profiling `data.py` and serving `datarev/refresh.py` choose inventories, modes, schemas, preparation, and acceptance gates. The shared transfer package copies and verifies data but does not decide to activate it. Its `TransferPlan` contains owner, inventory, destination mapping, staging/state/live/previous schemas, state directory, volume, worker count, and verification settings.

`SourceConnection`, `LocalConnection`, and `PublishConnection` are different types. Local writable connections must be loopback. `source.open_source_session` owns RDS source access and establishes read-only behavior. Source commands use a consistent exported snapshot; normal scoring and profiling workloads read local data. `publish.py` is the separate write-scoped exception described in [handoff](06-handoff-export-and-evidence.md).

## Common ladder

```mermaid
flowchart LR
    P[Preflight] --> S[Export snapshot]
    S --> C[Copy to staging]
    C --> V[Verify receipts]
    V --> E[Engine preparation and gates]
    E --> M[Seal verified manifest]
    M --> A[Atomic local promotion and DB stamp]
    A --> F[Finalize files from stamp]
```

Preflight inspects the catalog and checks contracts and disk capacity. The standalone preflight commands do not copy data. During a real transfer, stale staging/progress artifacts are handled by the staging path. Required table failures abort; absent or failed optional copies are disclosed and cannot masquerade as successful copies.

Capacity is estimated against the local Docker volume filesystem, with a fallback path if the mountpoint cannot be resolved. Required headroom is 2.2 times estimated transfer bytes, implemented with integer arithmetic (`total * 11 > free * 5`). Unknown size estimates proceed; this is an estimate, not a guarantee against disk exhaustion. Keeping active and previous vintages also consumes space while a third staging copy is being built.

## Snapshot and copy mechanics

The pipeline exports one PostgreSQL snapshot for the operation. Every source worker imports that snapshot at the beginning of its transaction. The exporting transaction stays alive until copying finishes. `SnapshotKeepalive` periodically issues `SELECT 1` while it exclusively owns that otherwise idle connection. Its bounded stop handles a blocked driver call by abandoning the tick and closing the connection without queueing another statement behind it.

Tables copy smallest first. Serial copy streams psycopg `COPY TO STDOUT` chunks into `COPY FROM STDIN`, without buffering a complete table or writing a temporary data file. Creation, copying, row verification, and per-table promotion to the staging destination share a local transaction. Tallies use the two `COPY n` tags, a destination count fallback, and optional paranoid source counting.

Large tables can use `parallel_copy.py`: physical `ctid` page ranges of approximately 256 MiB, at most 512 chunks, with an open-ended last range. Worker count is bounded by chunks and source connection headroom, retaining a five-connection reserve. Workers fill a common staging table with separate chunk transactions against the same source snapshot. If the plan offers no useful parallelism, it falls back to serial copy.

A failed chunk can be retried only when the commit outcome is known. If COMMIT acknowledgement is lost, the chunk may already be durable; it must not be retried and duplicated. Failure discards the staged result rather than exposing a partial vintage.

Streaming COPY is bounded-memory; that statement does not imply every later application algorithm is streaming. Profiling freezes a shared workload in memory, and serving materializes sparse graph structures.

## Engine-specific steps

Profiling builds source indexes and runs ANALYZE in staging before sealing its manifest. URL indexes use hash indexing where long URL values would exceed btree entry limits. Bootstrap is idempotent if a compatible active revision already exists; refresh requires an existing active revision.

Serving bootstrap requires **no** active vintage, and refresh requires one. After transfer it performs tally gates, SQL derivations, census comparisons, and metadata assembly. All optional inputs and derived surfaces belong to the same vintage. The active record supplies the comparison baseline; there is no separate research baseline database required at runtime. [Serving logic](05-serving-engine.md) describes the gates and derived data.

Serving first checks whether an earlier database promotion committed but file finalization crashed. A successful healing ends that invocation without generating and promoting another revision. A further refresh is a separate deliberate operation.

## Promotion and visibility

The verified manifest is written before visibility changes. JSON writes use temporary files, fsync, and same-directory replacement. Revision identifiers use `rev_YYYYMMDD` with collision suffixes and a filename-safe whitelist.

Under the exclusive swap lock, promotion performs one PostgreSQL transaction:

1. Drop the older previous tables.
2. Move current live tables into the previous schema.
3. Move staged tables into the live schema.
4. Create the authoritative stamp binding that live revision to its verified digest.

Tables move with `ALTER TABLE ... SET SCHEMA`; schema names and grants remain fixed. Lock timeout/retry bounds prevent an indefinitely blocked swap. ANALYZE follows commit and lock release. File finalization and the active pointer are then reconciled from the database stamp.

This is atomic **database** visibility, not a transaction spanning PostgreSQL and the filesystem. A crash after the database commit can leave stale files; the resolver verifies and repairs them. Digest, owner, version, receipt, or stamp disagreements fail closed. A manifest alone cannot activate tables.

## Reader and writer locks

Each engine has two advisory keys: an exclusive data-operation mutex and a shared-reader/exclusive-swap key. Data operations serialize within an engine. Staging can be built while readers use live data, but promotion cannot move those tables during a protected read.

Serving holds a session-level shared reader lock for its complete serving/export operation on a dedicated connection. Profiling uses a transaction-scoped shared lock for the workload stream on a pooled connection. Returning a session lock to a pool would strand the hold and block future swaps, so those two lock lifetimes intentionally differ. Once a profiling workload is frozen, its subsequent model analysis does not need to retain the source-table lock.

Cancellation is cooperative at stage boundaries. Serving stops honoring cancellation from the final promote boundary through stamp finalization. The atomic unit completes instead of reporting a cancellation that hides a committed change. The profiling CLI has cooperative SIGINT handling; the serving CLI's ordinary keyboard interrupt can interrupt a copy, leaving disposable staging while live data remains untouched.

## Rollback and failure map

Rollback swaps live and previous table sets in one local transaction through a temporary holding schema and marks the restored stamp `activated_by='rollback'`. It requires valid active/previous state and a previous stamp. It does not contact RDS. A second rollback can swap forward again. There is exactly one previous slot, not an arbitrary time-travel history.

| Failure point | Effect and recovery |
|---|---|
| Configuration/contract/capacity | Refusal before copy; correct the named issue |
| Copy or engine gate | Staging is disposable; active vintage unchanged |
| Reader blocks swap | Bounded refusal; finish/cancel reader and retry |
| Promotion transaction fails | Database moves roll back together |
| Database commit succeeds, file finalization fails | Resolver heals files from matching stamp/record |
| Missing/malformed/digest-mismatched record | Fail closed; do not infer a revision from filenames |
| No previous stamp | Named rollback refusal |

A rollback affects source/vintage tables, not external RDS publications, exported CSVs, historical run snapshots, or the latest evidence graph. Those have separate ownership and publication boundaries.

Source: transfer `pipeline.py`, `copy_engine.py`, `parallel_copy.py`, `keepalive.py`, `manifests.py`, `promotion.py`, `locks.py`, and the engine data entry points in [source reference](10-source-reference.md).
