# Contracts and data model

[Guide index](README.md)

## Pure boundary values

Contracts use frozen Pydantic models with unknown fields forbidden and surrounding string whitespace stripped. A qualified table name consists of a schema and table matching `^[a-z_][a-z0-9_]*$`; consumers additionally enforce their own length and ownership rules. This is identifier validation, not permission to execute arbitrary SQL.

`ColumnExpectation` records column name, PostgreSQL type, and permitted nullability. `TableExpectation` adds the source and `required`/`optional` classification. `SourceInventory` declares one engine's full inventory and rejects duplicate source tables; a table rejects duplicate column names.

Compatibility is deterministic and pure: tables and columns are checked in name order. It reports `missing_table`, `missing_column`, `incompatible_type`, or `incompatible_nullability`. Types are compared after trimming and case-folding; this is not a general PostgreSQL type-coercion engine. An expected non-null column may not become nullable. Extra source columns are not a contract failure. A missing optional table is allowed, but a present optional table with an incompatible expected column still fails compatibility.

`LocalStoreBoundary` declares owner, writer, and readers. Validation requires writer = owner, distinct owner entries, and the owner among readers. Role grants and code tests supply the operational enforcement; a Python value alone cannot secure a database.

## Profiling source inventory

All three source tables are required and retain their bare names when copied into `profiling_staging`, then promoted into `profiling_source`.

| Source | Expected columns | Purpose |
|---|---|---|
| `payme.websites_enriched` | `accessed_url text NOT NULL`, `features jsonb` | Website content and metadata |
| `payme.websites` | `id integer NOT NULL`, `original_url text`, `accessed_url text` | URL mapping |
| `payme.companies_new` | `id integer`, `site_url text` | Restrict workload to websites associated with known companies |

## Serving source inventory

Every included source is copied into the same `serving_staging` vintage, including optional reference tables. There is no separate reference-table swap.

| Source | Required? | Local name and role |
|---|---|---|
| `temp_kima.hash_buyer_relation` | Yes | `hash_buyer_relation`: purchase relations and transaction aggregates |
| `temp_kima.buyer_details_enriched` | Yes | `buyer_details_enriched`: candidate contacts and eligibility fields |
| `payme.websites` | No | `websites`: URL mapping |
| `payme.companies_new` | No | `companies_new`: seller identity and URL |
| `payme.buyers_enriched` | No | `buyers_enriched`: preferred spend data |
| Resolved purchase-drivers table | No | `websites_purchase_drivers_profiles`: attributes and seller summaries |

The relation expects `buyer_id bigint NOT NULL`, `seller_id bigint NOT NULL`, `parent_id integer`, timestamps `created_at`/`trx_last_at`, `trx_amount numeric`, and `trx_count integer`. The details source expects `id bigint NOT NULL`, `parent_id integer`, text email/phone/name, boolean `is_private`/`is_business`, and timestamps `last_enriched_at`/`updated_at`. These are the nine fields the export compatibility gate checks.

The spend source expects `parent_id integer`, `trx_sum numeric`, `trx_count numeric`, and timestamp `last_trx_date`. The profiles expectation requires `id`, `accessed_url text`, `dna_json text`, and `profile_summary text`. Its ID expectation is `bigint` for schema `profiling`, otherwise `integer`; an arbitrary pin must satisfy that declared expectation.

### Purchase-drivers source resolution

The data command resolves against the source catalog in this order:

1. Explicit `SERVING_PROFILING_TABLE=schema.table` pin.
2. `profiling.<user>_<selection>_purchase_drivers_websites` from `PROMOTER_BRAIN_USER_NAME` and `SERVING_PROFILING_SELECTION` (default selection `none`).
3. The pinned-in-code Topics fallback `temp.costa_wiki_tuned_cs_v2_websites_purchase_drivers_topics`.

An absent explicit pin does **not** fall through to the other choices. Absence is a report-only `profiles_source` failure, and label-dependent derivations can be skipped. A present incompatible table aborts. Resolution and the selected table are recorded in the revision metadata. This does not read the profiling engine's local database or import its Python code.

## Local schemas and identities

| Schema | Meaning |
|---|---|
| `profiling_source` | Active copied profiling inputs |
| `profiling_staging` / `profiling_previous` | Disposable next inputs / one previous input snapshot |
| `profiling` | Current workspace result tables |
| `profiling_registry` | Workspace/lens attribute registries |
| `profiling_results` | Legacy pre-workspace results kept readable |
| `profiling_state` | Transfer progress and engine data bookkeeping |
| `serving_active` | Complete current serving vintage |
| `serving_staging` / `serving_previous` | Next disposable vintage / one rollback slot |
| `serving_state` | Serving transfer bookkeeping |
| `serving_evidence` | Latest export's evidence generation |

The source schemas and generated output schemas have different lifecycles. Rolling back profiling's copied inputs does not delete result tables, reverse registry evolution, or undo an RDS handoff.

A profiling workspace is `(user, selection)`. `user` matches `^[a-z][a-z0-9_]{0,11}$` and reserves `legacy`; selection matches `^[a-z0-9_]{1,22}$`. The person comes from configuration, not a job form. Lens tokens are `purchase_drivers`, `psychological`, and `political`.

```text
profiling.<user>_<selection>_<lens_token>_websites
profiling_registry.<user>_<selection>_<lens_token>_attributes
```

The bounds keep the longest valid names within PostgreSQL's 63-byte identifier limit. Index names use a short hash of the table name. Repeating a workspace/lens appends newly processed URLs; changing selection creates a separate result space that may re-profile the same websites. `legacy_none` is the compatibility workspace for older tables.

Result rows contain an ID, accessed URL, description, serialized `dna_json`, `profile_summary`, cost, extraction tier, creation time, and raw Gemini input/thinking fields. Legacy results call the summary column `summary_profile`; storage maps that difference. List APIs omit large raw fields and DNA; detail APIs include them.

## Receipts, manifests, and stamps

`TransferReceipt` records owner, source/destination, required/optional classification, nonnegative row/byte counts, and state (`staged`, `verified`, `failed`). `LocalDataManifest` records contract version, owner, source snapshot, receipts, state, and `sha256:` digest. Required receipts must be verified, and every receipt owner must match the manifest.

The canonical inner digest uses sorted, compact JSON excluding its own digest field. The transfer package wraps this in a `ManifestRecord` carrying revision lifecycle metadata, its own record digest, and engine-specific `owner_metadata`. Serving's metadata includes census, gates, agreements, optional source choices, and derivation results.

The active schema's single-row `_promoter_brain_stamp` records owner, revision ID, verified digest, source snapshot, contract version, promotion/activation timestamps, and activation method. The database stamp is authoritative; JSON files must agree with it. The stored verified digest binds the pre-promotion record even after the file is finalized as promoted.

See [revision lifecycle](03-transfer-and-revisions.md) for atomicity and healing, and [source reference](10-source-reference.md) for the complete declarations.
